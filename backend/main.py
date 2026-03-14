import os
from datetime import datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
from uuid import uuid4

import pandas as pd
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from openai import OpenAI

from chart_planner import plan_chart
from core.middleware import setup_middleware
from dashboard_planner import build_dashboard_response
from db.mongodb import (
    get_query_history_collection,
    get_sessions_collection,
    get_usage_collection,
    mongo_lifespan,
)
from intent_extractor import (
    build_exploratory_intents,
    expand_comparison_intents,
    extract_intent,
    is_exploratory_query,
)
from models import QueryRequest, QueryResponse
from query_engine import execute_query, result_to_records
from routes.auth import router as auth_router
from routes.google_auth import router as google_auth_router
from schema_extractor import build_schema, df as default_df, schema_memory as default_schema
from summarizer import generate_summary
from validator import validate_intent


load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

app = FastAPI(
    title="QueryBoard API",
    description="Conversational AI for Business Intelligence Dashboards",
    version="1.0.0",
    lifespan=mongo_lifespan,
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

setup_middleware(app)
app.include_router(auth_router)
app.include_router(google_auth_router)

TIER_LIMITS = {
    "free": {"queries": 10, "uploads": 3, "tokens": 1000},
    "pro": {"queries": 200, "uploads": 20, "tokens": 50000},
    "ultra": {"queries": None, "uploads": None, "tokens": None},
}


async def _save_query_history(
    query: str,
    charts: list,
    summary: str,
    rows_analyzed: int,
    session_id: str | None,
) -> None:
    try:
        await get_query_history_collection().insert_one(
            {
                "query": query,
                "summary": summary,
                "rows_analyzed": rows_analyzed,
                "session_id": session_id,
                "chart_count": len(charts),
                "primary_chart_type": charts[0].type if charts else "bar",
                "charts": [chart.model_dump() for chart in charts],
                "created_at": datetime.now(timezone.utc),
            }
        )
    except Exception:
        pass


def _normalize_tier(tier: str | None) -> str:
    if tier in TIER_LIMITS:
        return str(tier)
    return "free"


async def _get_usage(user_id: str) -> dict:
    now = datetime.now(timezone.utc)
    tomorrow = now.date() + timedelta(days=1)
    reset_at = datetime.combine(
        tomorrow,
        datetime.min.time(),
        tzinfo=timezone.utc,
    )

    usage = await get_usage_collection().find_one({"user_id": user_id})
    if not usage:
        usage = {
            "user_id": user_id,
            "tier": "free",
            "queries_used": 0,
            "uploads_used": 0,
            "tokens_used": 0,
            "reset_at": reset_at,
        }
        await get_usage_collection().insert_one(usage)
        return usage

    usage_tier = _normalize_tier(usage.get("tier"))
    usage_reset_at = usage.get("reset_at")
    if isinstance(usage_reset_at, datetime) and usage_reset_at.tzinfo is None:
        usage_reset_at = usage_reset_at.replace(tzinfo=timezone.utc)

    if not isinstance(usage_reset_at, datetime) or usage_reset_at <= now:
        usage.update(
            {
                "tier": usage_tier,
                "queries_used": 0,
                "uploads_used": 0,
                "tokens_used": 0,
                "reset_at": reset_at,
            }
        )
        await get_usage_collection().update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "tier": usage_tier,
                    "queries_used": 0,
                    "uploads_used": 0,
                    "tokens_used": 0,
                    "reset_at": reset_at,
                }
            },
            upsert=True,
        )
        return usage

    usage.setdefault("queries_used", 0)
    usage.setdefault("uploads_used", 0)
    usage.setdefault("tokens_used", 0)
    usage["tier"] = usage_tier
    return usage


def _is_usage_limit_reached(tier: str, used: int, usage_type: str) -> bool:
    limit = TIER_LIMITS.get(tier, TIER_LIMITS["free"]).get(usage_type)
    return limit is not None and used >= limit


def _limit_message(tier: str, usage_type: str) -> str:
    if usage_type == "tokens":
        return (
            "Daily token limit reached. Upgrade to Ultra for more LLM usage."
            if tier == "pro"
            else "Daily token limit reached. Upgrade to Pro for more LLM usage."
        )

    if usage_type == "queries":
        return (
            "Daily query limit reached. Upgrade to Ultra for more queries."
            if tier == "pro"
            else "Daily query limit reached. Upgrade to Pro for more queries."
        )

    return (
        "Daily upload limit reached. Upgrade to Ultra for more uploads."
        if tier == "pro"
        else "Daily upload limit reached. Upgrade to Pro for more uploads."
    )


def _estimate_tokens_for_query(query: str) -> int:
    return max(50, len(query.split()) * 12)


def _build_multi_chart_summary(query: str, charts: list, rows_analyzed: int) -> str:
    chart_titles = ", ".join(chart.title for chart in charts[:3])
    extra_chart_count = len(charts) - 3
    extra_suffix = f", plus {extra_chart_count} more chart(s)" if extra_chart_count > 0 else ""

    return (
        f"Ran {len(charts)} related analyses for '{query}' across {rows_analyzed:,} rows: "
        f"{chart_titles}{extra_suffix}."
    )


def _validate_query_input(query: str) -> None:
    """Raises HTTPException for short, symbol-only, or gibberish queries."""
    if len(query) < 5:
        raise HTTPException(
            status_code=400,
            detail="Query too short. Please ask a proper question about the dataset.",
        )
    if not any(character.isalpha() for character in query):
        raise HTTPException(
            status_code=400,
            detail="Query must contain actual words, not just symbols or numbers.",
        )
    if len(query.split()) < 2:
        raise HTTPException(
            status_code=400,
            detail="Please ask a more specific question about the data.",
        )

    try:
        guard = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,
            max_tokens=10,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a query validator. Reply with only 'YES' if the input is a "
                        "meaningful question or request about data, customers, shopping, or business. "
                        "Reply with only 'NO' if it is gibberish, random characters, nonsense, "
                        "or completely unrelated to data analysis."
                    ),
                },
                {"role": "user", "content": query},
            ],
        )
        verdict = guard.choices[0].message.content.strip().upper()
        if verdict != "YES":
            raise HTTPException(
                status_code=400,
                detail="That doesn't look like a valid data question. Try something like: 'Show average spend by city tier'.",
            )
    except HTTPException:
        raise
    except Exception:
        pass


def _normalize_uploaded_dataframe(dataframe: pd.DataFrame) -> pd.DataFrame:
    import pyarrow as pa

    normalized = dataframe.copy()
    normalized.columns = _normalize_columns(normalized.columns)

    for column in normalized.columns:
        converted = pd.to_numeric(normalized[column], errors="coerce")
        if converted.notna().sum() > len(normalized) * 0.8:
            normalized[column] = converted

    # Second pass: try European number format for remaining object columns
    # Use 0.5 threshold instead of 0.8 to handle small datasets (e.g. 20 rows)
    for column in normalized.columns:
        if normalized[column].dtype != object:
            continue

        def _parse_european(val: object) -> object:
            try:
                if isinstance(val, str):
                    # "1.045.246" -> remove dots -> "1045246" -> float
                    # "1.045,25" -> remove dots, replace comma -> "1045.25" -> float
                    cleaned = val.replace(".", "").replace(",", ".")
                    return float(cleaned)
                return val
            except (ValueError, AttributeError):
                return val

        converted = normalized[column].apply(_parse_european)
        converted = pd.to_numeric(converted, errors="coerce")
        if converted.notna().sum() > len(normalized) * 0.5:
            normalized[column] = converted

    # Probe every column with pyarrow — catches int64/float64 cols that
    # still contain unconvertible values due to pandas mixed-type storage
    for column in normalized.columns:
        try:
            pa.array(normalized[column], from_pandas=True)
        except (pa.ArrowTypeError, pa.ArrowInvalid):
            normalized[column] = normalized[column].astype(str)

    return normalized


def _normalize_columns(columns) -> list[str]:
    seen: dict[str, int] = {}
    normalized_columns: list[str] = []

    for index, column in enumerate(columns):
        base_name = str(column).strip() or f"column_{index + 1}"
        candidate = base_name

        if candidate in seen:
            seen[candidate] += 1
            candidate = f"{candidate}_{seen[candidate]}"
        else:
            seen[candidate] = 1

        normalized_columns.append(candidate)

    return normalized_columns


async def get_session(session_id: str) -> tuple[pd.DataFrame, dict]:
    session = await get_sessions_collection().find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Uploaded session not found.")

    parquet_bytes = session.get("dataframe_parquet")
    schema = session.get("schema")
    if parquet_bytes is None or schema is None:
        raise HTTPException(status_code=500, detail="Uploaded session is incomplete.")

    dataframe = pd.read_parquet(BytesIO(bytes(parquet_bytes)))
    return dataframe, schema


def _read_uploaded_dataframe(filename: str, contents: bytes) -> pd.DataFrame:
    suffix = Path(filename).suffix.lower()
    buffer = BytesIO(contents)

    if suffix == ".csv":
        return pd.read_csv(buffer)

    if suffix in {".xlsx", ".xls"}:
        dataframe = pd.read_excel(buffer)
        unnamed_columns = sum(str(column).startswith("Unnamed:") for column in dataframe.columns)

        if unnamed_columns >= max(1, len(dataframe.columns) // 2):
            # Try to find the real header row by scanning for the row
            # with the most non-null, non-duplicate string values
            raw = pd.read_excel(BytesIO(contents), header=None)
            
            best_row = 0
            best_score = 0
            for i in range(min(20, len(raw))):
                row_vals = [v for v in raw.iloc[i] if str(v) not in ('nan', 'NaN', '') and v == v]
                unique_strings = len(set(str(v) for v in row_vals))
                if unique_strings > best_score:
                    best_score = unique_strings
                    best_row = i

            dataframe = pd.read_excel(BytesIO(contents), header=best_row)
            # Drop columns that are entirely NaN
            dataframe = dataframe.dropna(axis=1, how="all")
            # Drop rows that are entirely NaN
            dataframe = dataframe.dropna(axis=0, how="all")

    return dataframe

    raise HTTPException(
        status_code=400,
        detail="Unsupported file type. Please upload a CSV or XLSX file.",
    )


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "dataset_rows": default_schema["row_count"],
        "dataset_columns": len(default_schema["columns"]),
    }


@app.post("/api/upload")
async def upload_dataset(file: UploadFile = File(...)):
    usage = await _get_usage("anonymous")
    tier = _normalize_tier(usage.get("tier"))
    if _is_usage_limit_reached(tier, usage.get("uploads_used", 0), "uploads"):
        raise HTTPException(
            status_code=429,
            detail=_limit_message(tier, "uploads"),
        )

    filename = file.filename or ""
    if not filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        dataframe = _read_uploaded_dataframe(filename, contents)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse uploaded file: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse uploaded file: {exc}") from exc

    dataframe = _normalize_uploaded_dataframe(dataframe)
    if dataframe.empty:
        raise HTTPException(status_code=400, detail="Uploaded dataset contains no rows.")

    schema = build_schema(dataframe)
    session_id = str(uuid4())

    parquet_buffer = BytesIO()
    dataframe.to_parquet(parquet_buffer, index=False)

    await get_sessions_collection().insert_one(
        {
            "session_id": session_id,
            "filename": filename,
            "content_type": file.content_type,
            "row_count": schema["row_count"],
            "columns": schema["column_names"],
            "schema": schema,
            "dataframe_parquet": parquet_buffer.getvalue(),
            "created_at": datetime.now(timezone.utc),
        }
    )
    await get_usage_collection().update_one(
        {"user_id": "anonymous"},
        {"$inc": {"uploads_used": 1}},
        upsert=True,
    )

    return {
        "session_id": session_id,
        "row_count": schema["row_count"],
        "columns": schema["column_names"],
    }


@app.get("/api/usage")
async def get_usage(user_id: str = "anonymous"):
    usage = await _get_usage(user_id)
    usage["id"] = str(usage.pop("_id", ""))
    if hasattr(usage.get("reset_at"), "isoformat"):
        usage["reset_at"] = usage["reset_at"].isoformat()
    return usage


@app.post("/api/usage/upgrade")
async def upgrade_tier(body: dict):
    user_id = str(body.get("user_id", "anonymous"))
    tier = _normalize_tier(body.get("tier"))
    usage = await _get_usage(user_id)
    await get_usage_collection().update_one(
        {"user_id": user_id},
        {
            "$set": {
                "tier": tier,
                "reset_at": usage["reset_at"],
            }
        },
        upsert=True,
    )
    return {"upgraded": True, "tier": tier}


@app.get("/api/history")
async def get_history():
    try:
        cursor = get_query_history_collection().find(
            {},
            sort=[("created_at", -1)],
            limit=50,
        )
        items = await cursor.to_list(length=50)
        for item in items:
            item["id"] = str(item.pop("_id"))
            if hasattr(item.get("created_at"), "isoformat"):
                item["created_at"] = item["created_at"].isoformat()
        return {"items": items}
    except Exception:
        return {"items": []}


@app.delete("/api/history/{item_id}")
async def delete_history_item(item_id: str):
    try:
        from bson import ObjectId

        result = await get_query_history_collection().delete_one(
            {"_id": ObjectId(item_id)}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="History item not found.")
        return {"deleted": True}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/query", response_model=QueryResponse)
async def handle_query(request: QueryRequest, background_tasks: BackgroundTasks):
    query = request.query.strip()
    usage = await _get_usage("anonymous")
    tier = _normalize_tier(usage.get("tier"))
    if _is_usage_limit_reached(tier, usage.get("queries_used", 0), "queries"):
        raise HTTPException(
            status_code=429,
            detail=_limit_message(tier, "queries"),
        )
    estimated_tokens = _estimate_tokens_for_query(query)
    if _is_usage_limit_reached(
        tier,
        usage.get("tokens_used", 0) + estimated_tokens,
        "tokens",
    ):
        raise HTTPException(
            status_code=429,
            detail=_limit_message(tier, "tokens"),
        )

    _validate_query_input(query)

    dataframe = default_df
    schema = default_schema
    is_default_dataset = request.session_id is None

    if request.session_id:
        dataframe, schema = await get_session(request.session_id)

    if is_default_dataset:
        dashboard_response = build_dashboard_response(query)
        if dashboard_response is not None:
            charts, rows_analyzed, summary = dashboard_response
            await get_usage_collection().update_one(
                {"user_id": "anonymous"},
                {"$inc": {"queries_used": 1, "tokens_used": estimated_tokens}},
                upsert=True,
            )
            background_tasks.add_task(
                _save_query_history,
                query,
                charts,
                summary,
                rows_analyzed,
                request.session_id,
            )
            return QueryResponse(
                charts=charts,
                summary=summary,
                rows_analyzed=rows_analyzed,
            )

    if is_default_dataset and is_exploratory_query(query):
        intents = build_exploratory_intents()
    else:
        try:
            base_intent = extract_intent(query, schema)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Intent extraction service unavailable: {str(exc)}",
            ) from exc

        intents = expand_comparison_intents(query, base_intent, schema)

    charts = []
    rows_analyzed_values: list[int] = []

    for intent in intents:
        validation_error = validate_intent(intent, schema)
        if validation_error:
            raise HTTPException(status_code=400, detail=validation_error)

        try:
            result_df, current_rows_analyzed = execute_query(intent, dataframe)
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Query execution failed: {str(exc)}",
            ) from exc

        records = result_to_records(result_df)
        if not records:
            continue

        rows_analyzed_values.append(current_rows_analyzed)
        charts.append(plan_chart(intent, result_df, records, schema))

    if not charts:
        raise HTTPException(
            status_code=404,
            detail="No data found matching your query. Try removing filters or broadening your question.",
        )

    rows_analyzed = max(rows_analyzed_values) if rows_analyzed_values else 0

    if len(charts) == 1:
        try:
            summary = generate_summary(query, intents[0], charts[0], rows_analyzed)
        except Exception:
            group_by_label = ", ".join(intents[0].group_by) if intents[0].group_by else "the dataset"
            summary = (
                f"Analysis of {intents[0].metric} grouped by "
                f"{group_by_label} across {rows_analyzed:,} rows."
            )
    else:
        summary = _build_multi_chart_summary(query, charts, rows_analyzed)

    await get_usage_collection().update_one(
        {"user_id": "anonymous"},
        {"$inc": {"queries_used": 1, "tokens_used": estimated_tokens}},
        upsert=True,
    )
    background_tasks.add_task(
        _save_query_history,
        query,
        charts,
        summary,
        rows_analyzed,
        request.session_id,
    )

    return QueryResponse(
        charts=charts,
        summary=summary,
        rows_analyzed=rows_analyzed,
    )
