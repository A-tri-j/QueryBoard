"""
QueryBoard — Prompt 1 Audit Script
====================================
Drop this file into the repo root (same folder as /backend and /app).
Run from the repo root:

    python audit_prompt1.py

Checks every claim Codex made after Prompt 1 and prints a clear
PASS / FAIL / WARN for each. Nothing is modified — read-only audit.
"""

import ast
import importlib.util
import os
import re
import sys
from pathlib import Path

# ── Resolve repo root (works whether script is in root or a subfolder) ────────
ROOT    = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
APP     = ROOT / "app"

RESET  = "\033[0m"
BOLD   = "\033[1m"
GREEN  = "\033[32m"
RED    = "\033[31m"
YELLOW = "\033[33m"
CYAN   = "\033[36m"
DIM    = "\033[2m"

results: list[tuple[str, str, str]] = []


def passed(label: str, detail: str = "") -> None:
    results.append(("PASS", label, detail))
    print(f"  {GREEN}✓ PASS{RESET}  {label}")
    if detail:
        print(f"         {DIM}{detail}{RESET}")


def failed(label: str, detail: str = "") -> None:
    results.append(("FAIL", label, detail))
    print(f"  {RED}✗ FAIL{RESET}  {BOLD}{label}{RESET}")
    if detail:
        print(f"         {RED}{detail}{RESET}")


def warned(label: str, detail: str = "") -> None:
    results.append(("WARN", label, detail))
    print(f"  {YELLOW}⚠ WARN{RESET}  {label}")
    if detail:
        print(f"         {DIM}{detail}{RESET}")


def section(title: str) -> None:
    print(f"\n{CYAN}{BOLD}{'─' * 60}{RESET}")
    print(f"{CYAN}{BOLD}  {title}{RESET}")
    print(f"{CYAN}{BOLD}{'─' * 60}{RESET}")


def read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


# ─────────────────────────────────────────────────────────────────────────────
section("1. requirements.txt — new dependencies")
# ─────────────────────────────────────────────────────────────────────────────

req = read(BACKEND / "requirements.txt")

if "pyarrow" in req:
    passed("pyarrow present in requirements.txt")
else:
    failed(
        "pyarrow MISSING from requirements.txt",
        "Codex confirmed it was added but it is not committed. Add: pyarrow>=14.0.0",
    )

if "python-multipart" in req:
    passed("python-multipart present (required for FastAPI UploadFile)")
else:
    failed(
        "python-multipart MISSING from requirements.txt",
        "FastAPI requires this for multipart/form-data. Add: python-multipart==0.0.9",
    )


# ─────────────────────────────────────────────────────────────────────────────
section("2. backend/models/__init__.py — QueryRequest.session_id")
# ─────────────────────────────────────────────────────────────────────────────

models = read(BACKEND / "models" / "__init__.py")

if "session_id" in models:
    passed("session_id field present in models/__init__.py")
    # Must be optional (default None), not a required field
    if re.search(r"session_id\s*:\s*str\s*\|\s*None\s*=\s*None", models) or \
       re.search(r"session_id\s*:\s*Optional\[str\]\s*=\s*None", models):
        passed("session_id is Optional[str] = None (will not break existing callers)")
    else:
        failed(
            "session_id found but may not have default=None",
            "Must be: session_id: str | None = None  — if required, all existing "
            "frontend calls that omit it will get 422 errors.",
        )
else:
    failed(
        "session_id NOT in QueryRequest model",
        "The frontend cannot pass a session_id until this field exists in the model.",
    )


# ─────────────────────────────────────────────────────────────────────────────
section("3. backend/schema_extractor.py — standalone build_schema / extract_schema")
# ─────────────────────────────────────────────────────────────────────────────

schema = read(BACKEND / "schema_extractor.py")

fn_match = re.search(
    r"^def (build_schema|extract_schema|make_schema)\s*\(",
    schema,
    re.MULTILINE,
)
if fn_match:
    passed(f"Standalone schema builder found: {fn_match.group(1)}(df)")
else:
    failed(
        "No standalone schema builder function found",
        "Expected: def build_schema(df: pd.DataFrame) -> dict  "
        "Codex claimed to add this — dynamic upload sessions will fail without it.",
    )

if re.search(r"^schema_memory\s*[=:]", schema, re.MULTILINE):
    passed("schema_memory still defined at module level (default dataset preserved)")
else:
    failed(
        "schema_memory not found at module level",
        "Existing routes (health check, default queries) import schema_memory. "
        "It must still exist as a module-level variable for the default dataset.",
    )


# ─────────────────────────────────────────────────────────────────────────────
section("4. backend/main.py — upload route, get_session, BytesIO")
# ─────────────────────────────────────────────────────────────────────────────

main = read(BACKEND / "main.py")

# Upload route
if re.search(r'["\']?/api/upload["\']?', main):
    passed("POST /api/upload route found in main.py")
else:
    failed(
        "/api/upload route NOT found in main.py",
        "Codex claimed to add this. File uploads will return 404 without it.",
    )

# get_session helper
if "get_session" in main:
    passed("get_session() helper referenced in main.py")
else:
    failed(
        "get_session() NOT found in main.py",
        "Session-aware query execution depends on this function.",
    )

# FastAPI imports for file upload
if "UploadFile" in main:
    passed("UploadFile imported (FastAPI file upload type)")
else:
    failed(
        "UploadFile not imported in main.py",
        "Add to imports: from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks",
    )

# BytesIO — critical for Railway (no persistent disk)
if "BytesIO" in main:
    passed("BytesIO found — parquet stored in memory, not on disk (Railway-safe)")
else:
    failed(
        "BytesIO NOT found in main.py",
        "CRITICAL: Without BytesIO, uploaded dataframes are written to Railway's ephemeral "
        "filesystem and will silently disappear after every redeploy.",
    )

# session_id wired into handle_query
if "session_id" in main and "handle_query" in main:
    passed("session_id referenced in main.py alongside handle_query")
else:
    warned(
        "session_id may not be wired into handle_query",
        "Verify handle_query() checks request.session_id and calls get_session() when set.",
    )


# ─────────────────────────────────────────────────────────────────────────────
section("5. backend/db/mongodb.py — sessions collection")
# ─────────────────────────────────────────────────────────────────────────────

mongo = read(BACKEND / "db" / "mongodb.py")

if "session" in mongo.lower():
    passed("sessions collection referenced in mongodb.py")
else:
    failed(
        "No sessions collection in mongodb.py",
        "Add: def get_sessions_collection() -> AsyncIOMotorCollection: "
        "return get_database()['sessions']",
    )

if "expireAfterSeconds" in mongo or "TTL" in mongo:
    passed("TTL index configured — sessions will auto-expire")
else:
    warned(
        "No TTL index on sessions collection",
        "Sessions will accumulate forever in MongoDB. Recommended fix (can do in Prompt 3): "
        "await db['sessions'].create_index('created_at', expireAfterSeconds=86400)",
    )


# ─────────────────────────────────────────────────────────────────────────────
section("6. Pipeline files — df threaded as argument, not global import")
# ─────────────────────────────────────────────────────────────────────────────

pipeline_files = [
    "query_engine.py",
    "intent_extractor.py",
    "chart_planner.py",
    "validator.py",
]

for fname in pipeline_files:
    text = read(BACKEND / fname)
    if not text:
        warned(f"{fname}: file not found", "")
        continue

    still_global   = bool(re.search(r"^from schema_extractor import\b.*\bdf\b", text, re.MULTILINE))
    # Accept any of: df, dataframe, schema as injected arguments (Codex may use any naming)
    accepts_df     = bool(re.search(r"def \w+\([^)]*\b(df|dataframe)\b[^)]*\)", text))
    accepts_schema = bool(re.search(r"def \w+\([^)]*\bschema\b[^)]*\)", text))
    is_session_aware = accepts_df or accepts_schema

    if not still_global and is_session_aware:
        which = []
        if accepts_df:     which.append("dataframe arg")
        if accepts_schema: which.append("schema arg")
        passed(f"{fname}: session-aware via {' + '.join(which)} ✓")
    elif still_global and not is_session_aware:
        failed(
            f"{fname}: still imports df as a global — NOT session-aware",
            "Any uploaded file session will be ignored; this module always queries "
            "the hardcoded customer dataset.",
        )
    elif still_global and is_session_aware:
        warned(
            f"{fname}: imports global df AND has injected args — ambiguous",
            "Confirm which one the functions actually use at runtime.",
        )
    else:
        warned(
            f"{fname}: no global df import and no df/dataframe/schema arg detected",
            "Verify manually how this module accesses its dataframe.",
        )


# ─────────────────────────────────────────────────────────────────────────────
section("7. backend/core/middleware.py — CORS allow_headers")
# ─────────────────────────────────────────────────────────────────────────────

mw = read(BACKEND / "core" / "middleware.py")

has_allow_headers = "allow_headers" in mw
has_wildcard      = '"*"' in mw or "'*'" in mw
has_content_type  = "Content-Type" in mw

if has_allow_headers and has_wildcard:
    passed("allow_headers=[\"*\"] — multipart uploads will not be blocked by CORS")
elif has_allow_headers and has_content_type:
    passed("allow_headers explicitly includes Content-Type")
elif has_allow_headers and not has_content_type and not has_wildcard:
    failed(
        "allow_headers is set but does NOT include Content-Type or *",
        "File upload preflight requests send Content-Type: multipart/form-data. "
        "CORS will block them silently. Fix: allow_headers=['*']",
    )
else:
    # Check if it's dynamically constructed (like the existing get_cors_config pattern)
    if "allow_headers" in mw and "[\"*\"]" in mw.replace(" ", ""):
        passed("allow_headers wildcard detected (dynamic config)")
    elif "get_cors_config" in mw and '"*"' in mw:
        passed("CORS config function detected with wildcard — should be fine")
    else:
        warned(
            "Could not definitively verify allow_headers for multipart",
            "Manually check middleware.py — ensure allow_headers includes '*' or 'Content-Type'.",
        )


# ─────────────────────────────────────────────────────────────────────────────
section("8. app/api/query/route.ts — Next.js proxy forwards full body")
# ─────────────────────────────────────────────────────────────────────────────

route_ts = APP / "api" / "query" / "route.ts"
ts = read(route_ts)

if not ts:
    failed(
        "app/api/query/route.ts not found",
        f"Expected at: {route_ts}",
    )
else:
    # GOOD: request.text() passes raw body string — session_id survives
    uses_text = "request.text()" in ts or "req.text()" in ts
    # BAD: destructuring drops unknown keys like session_id
    destructures = bool(re.search(
        r"const\s*\{\s*query[\s,}]",
        ts,
    ))
    # BAD: manually rebuilds JSON body (only includes known fields)
    rebuilds = bool(re.search(
        r"JSON\.stringify\(\s*\{\s*query",
        ts,
    ))

    if uses_text and not destructures:
        passed(
            "Proxy uses request.text() — raw body forwarded as-is (session_id will reach backend)",
            "This is the ideal pattern. No changes needed here for Prompt 2.",
        )
    elif destructures or rebuilds:
        failed(
            "Proxy destructures/rebuilds body — session_id will be DROPPED",
            "Change to: const body = await request.text() then forward body directly.",
        )
    else:
        warned(
            "Cannot confirm proxy body-forwarding strategy",
            "Manually verify that session_id in the request body reaches the FastAPI backend.",
        )


# ─────────────────────────────────────────────────────────────────────────────
section("9. Python syntax check — all modified backend files")
# ─────────────────────────────────────────────────────────────────────────────

py_files = [
    "main.py",
    "schema_extractor.py",
    "models/__init__.py",
    "query_engine.py",
    "intent_extractor.py",
    "chart_planner.py",
    "validator.py",
    "db/mongodb.py",
]

for fname in py_files:
    fpath = BACKEND / fname
    text  = read(fpath)
    if not text:
        failed(f"{fname}: FILE NOT FOUND", "Codex claimed to modify this file — check your working branch.")
        continue
    try:
        ast.parse(text)
        passed(f"{fname}: syntax OK")
    except SyntaxError as e:
        failed(f"{fname}: SYNTAX ERROR at line {e.lineno}", str(e.msg))


# ─────────────────────────────────────────────────────────────────────────────
section("10. Integration smoke-test — schema_extractor loads and build_schema works")
# ─────────────────────────────────────────────────────────────────────────────

sys.path.insert(0, str(BACKEND))

try:
    import unittest.mock as mock

    with mock.patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
        spec_obj = importlib.util.spec_from_file_location(
            "schema_extractor_audit", BACKEND / "schema_extractor.py"
        )
        mod = importlib.util.module_from_spec(spec_obj)
        spec_obj.loader.exec_module(mod)

    # Check default schema_memory
    if hasattr(mod, "schema_memory"):
        row_count = mod.schema_memory.get("row_count", 0)
        col_count = len(mod.schema_memory.get("columns", []))
        passed(
            f"schema_extractor loads OK — default dataset: {row_count:,} rows, {col_count} columns",
        )
    else:
        failed("schema_extractor loaded but schema_memory not found at module level")

    # Test the standalone schema builder with a dummy df
    fn = (
        getattr(mod, "build_schema",   None)
        or getattr(mod, "extract_schema", None)
        or getattr(mod, "make_schema",    None)
    )

    if fn and callable(fn):
        try:
            import pandas as pd
            dummy = pd.DataFrame({
                "revenue": [100.0, 200.0, 150.0],
                "region":  ["North", "South", "East"],
            })
            result = fn(dummy)
            if (
                isinstance(result, dict)
                and "columns" in result
                and "row_count" in result
                and result["row_count"] == 3
            ):
                passed(
                    "build_schema/extract_schema returns correct shape on a dummy dataframe",
                    f"Keys: {list(result.keys())}  |  columns detected: {len(result['columns'])}",
                )
            else:
                failed(
                    "build_schema/extract_schema returned unexpected shape",
                    f"Got: {result if isinstance(result, dict) else type(result).__name__}",
                )
        except Exception as exc:
            failed(f"build_schema/extract_schema raised an error on dummy df", str(exc))
    else:
        failed(
            "No callable build_schema / extract_schema found in schema_extractor",
            "Uploaded CSV sessions cannot build their schema dynamically without this function.",
        )

except ImportError as exc:
    failed("schema_extractor failed to import due to a missing dependency", str(exc))
except Exception as exc:
    failed("schema_extractor failed to load", str(exc))


# ─────────────────────────────────────────────────────────────────────────────
#  SUMMARY
# ─────────────────────────────────────────────────────────────────────────────

section("SUMMARY")

passes = [r for r in results if r[0] == "PASS"]
fails  = [r for r in results if r[0] == "FAIL"]
warns  = [r for r in results if r[0] == "WARN"]

print(
    f"\n  {GREEN}✓ {len(passes)} passed{RESET}   "
    f"{RED}✗ {len(fails)} failed{RESET}   "
    f"{YELLOW}⚠ {len(warns)} warnings{RESET}   "
    f"(total checks: {len(results)})\n"
)

if fails:
    print(f"{RED}{BOLD}  MUST FIX before running Prompt 2:{RESET}")
    for _, label, detail in fails:
        print(f"  {RED}✗{RESET} {label}")
        if detail:
            print(f"    {DIM}{detail}{RESET}")
    print()

if warns:
    print(f"{YELLOW}{BOLD}  WARNINGS — review but not blockers:{RESET}")
    for _, label, detail in warns:
        print(f"  {YELLOW}⚠{RESET} {label}")
        if detail:
            print(f"    {DIM}{detail}{RESET}")
    print()

if not fails:
    print(f"{GREEN}{BOLD}  All critical checks passed. Safe to run Prompt 2. ✓{RESET}\n")
    sys.exit(0)
else:
    print(
        f"{RED}{BOLD}  Fix the {len(fails)} failing check(s) above, "
        f"then re-run:  python audit_prompt1.py{RESET}\n"
    )
    sys.exit(1)
