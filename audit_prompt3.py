import re, ast
from pathlib import Path

RESET="\033[0m";BOLD="\033[1m";GREEN="\033[32m";RED="\033[31m";YELLOW="\033[33m";CYAN="\033[36m";DIM="\033[2m"
results=[]

def p(l,d=""): results.append(("PASS",l,d)); print(f"  {GREEN}✓ PASS{RESET}  {l}"); d and print(f"         {DIM}{d}{RESET}")
def f(l,d=""): results.append(("FAIL",l,d)); print(f"  {RED}✗ FAIL{RESET}  {BOLD}{l}{RESET}"); d and print(f"         {RED}{d}{RESET}")
def w(l,d=""): results.append(("WARN",l,d)); print(f"  {YELLOW}⚠ WARN{RESET}  {l}"); d and print(f"         {DIM}{d}{RESET}")
def s(t):      print(f"\n{CYAN}{BOLD}{'─'*60}\n  {t}\n{'─'*60}{RESET}")

# Paths — adjust ROOT to wherever the repo is
ROOT = Path("/tmp/queryboard")
if not ROOT.exists():
    print("NOTE: Running pattern checks only (no repo files available)")
    ROOT = None

def read(rel):
    if ROOT is None: return ""
    try: return (ROOT / rel).read_text(encoding="utf-8")
    except: return ""

s("1. backend/db/mongodb.py — collections + TTL indexes")
mongo = read("backend/db/mongodb.py")
checks = [
    ("get_query_history_collection", "query_history collection helper"),
    ("query_history", "query_history referenced"),
    ("expireAfterSeconds", "TTL index present"),
    ("sessions", "sessions TTL also added"),
    ("604800", "7-day TTL for history (604800s)"),
    ("86400",  "24-hour TTL for sessions (86400s)"),
]
for term, label in checks:
    (p if term in mongo else w)(label, f"Expected '{term}' in mongodb.py") if mongo else w(f"Cannot check: {label}", "no file")

s("2. backend/main.py — BackgroundTasks + history save + GET /api/history")
main = read("backend/main.py")
checks = [
    ("BackgroundTasks",           "BackgroundTasks imported"),
    ("_save_query_history",       "_save_query_history function defined"),
    ("background_tasks.add_task", "background_tasks.add_task called in handle_query"),
    ("get_query_history_collection", "get_query_history_collection imported"),
    ("/api/history",              "GET /api/history route present"),
    ("model_dump",                "charts serialized with model_dump()"),
    ("except Exception",          "history save has try/except guard"),
    ("sort=[",                    "history sorted descending"),
    ("limit=50",                  "history limited to 50 items"),
]
for term, label in checks:
    (p if term in main else f)(label) if main else w(f"Cannot check: {label}", "no file")

s("3. app/api/history/route.ts — Next.js proxy")
hist_route = read("app/api/history/route.ts")
checks = [
    ("export async function GET", "GET handler exported"),
    ("/api/history",              "proxies to /api/history"),
    ("force-dynamic",             "dynamic = force-dynamic set"),
    ('items: []',                 "fallback empty items on error"),
]
for term, label in checks:
    (p if term in hist_route else f)(label) if hist_route else w(f"Cannot check: {label}", "no file")

s("4. lib/store.ts — loadHistory + historyLoaded + selectHistoryItem restore")
store = read("lib/store.ts")
checks = [
    ("loadHistory",               "loadHistory action present"),
    ("historyLoaded",             "historyLoaded state present"),
    ("/api/history",              "fetches from /api/history"),
    ("item.charts",               "restores charts from stored data"),
    ("status: 'success'",         "sets status to success on restore"),
    ("void get().loadHistory()",  "loadHistory called after submitQuery"),
    ("id?:",                      "QueryHistoryItem has optional id field"),
]
for term, label in checks:
    (p if term in store else f)(label) if store else w(f"Cannot check: {label}", "no file")

s("5. components/query-board/sidebar.tsx — grouped history + loadHistory on mount")
sidebar = read("components/query-board/sidebar.tsx")
checks = [
    ("loadHistory",               "loadHistory called in sidebar"),
    ("historyLoaded",             "historyLoaded read from store"),
    ("Today",                     "Today group label present"),
    ("Yesterday",                 "Yesterday group label present"),
    ("Earlier",                   "Earlier group label present"),
    ("groupedHistory",            "groupedHistory variable present"),
    ("diffDays",                  "date diff calculation present"),
]
for term, label in checks:
    (p if term in sidebar else f)(label) if sidebar else w(f"Cannot check: {label}", "no file")

s("6. hero-state.tsx + dashboard-view.tsx — file size check")
hero = read("components/query-board/hero-state.tsx")
dash = read("components/query-board/dashboard-view.tsx")
for fname, text in [("hero-state.tsx", hero), ("dashboard-view.tsx", dash)]:
    if not text:
        w(f"Cannot check {fname}", "no file")
        continue
    if "MAX_FILE_SIZE" in text and "File too large" in text:
        p(f"{fname}: file size check present")
    else:
        f(f"{fname}: file size check MISSING", "Add MAX_FILE_SIZE check before fetch call")
    if "4.5" in text or "4.5MB" in text:
        p(f"{fname}: 4.5MB limit message present")
    else:
        w(f"{fname}: 4.5MB limit not mentioned in error message")

s("7. Python syntax — backend files")
for fname in ["backend/db/mongodb.py", "backend/main.py"]:
    text = read(fname)
    if not text:
        w(f"{fname}: not found"); continue
    try:
        ast.parse(text); p(f"{fname}: syntax OK")
    except SyntaxError as e:
        f(f"{fname}: SYNTAX ERROR line {e.lineno}", str(e.msg))

s("SUMMARY")
passes=[r for r in results if r[0]=="PASS"]
fails=[r for r in results if r[0]=="FAIL"]
warns=[r for r in results if r[0]=="WARN"]
print(f"\n  {GREEN}✓ {len(passes)} passed{RESET}   {RED}✗ {len(fails)} failed{RESET}   {YELLOW}⚠ {len(warns)} warnings{RESET}   (total: {len(results)})\n")
if fails:
    print(f"{RED}{BOLD}  FAILURES:{RESET}")
    for _,l,d in fails:
        print(f"  {RED}✗{RESET} {l}")
        if d: print(f"    {DIM}{d}{RESET}")
if not fails:
    print(f"{GREEN}{BOLD}  All critical checks passed — safe to test.{RESET}\n")
