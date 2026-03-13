import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from chart_planner import plan_chart
from dashboard_planner import build_dashboard_response
from intent_extractor import (
    build_exploratory_intents,
    expand_comparison_intents,
    extract_intent,
    is_exploratory_query,
)
from models import ErrorResponse, QueryRequest, QueryResponse
from query_engine import execute_query, result_to_records
from schema_extractor import schema_memory
from summarizer import generate_summary
from validator import validate_intent

load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

app = FastAPI(
    title="QueryBoard API",
    description="Conversational AI for Business Intelligence Dashboards",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow all origins in production so Vercel preview URLs also work.
# Tighten this to your specific Vercel domain after launch if needed.
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*")

if ALLOWED_ORIGINS == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in ALLOWED_ORIGINS.split(",")],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def _build_multi_chart_summary(query: str, charts: list, rows_analyzed: int) -> str:
    chart_titles = ", ".join(chart.title for chart in charts[:3])
    extra_chart_count = len(charts) - 3
    extra_suffix = f", plus {extra_chart_count} more chart(s)" if extra_chart_count > 0 else ""

    return (
        f"Ran {len(charts)} related analyses for '{query}' across {rows_analyzed:,} rows: "
        f"{chart_titles}{extra_suffix}."
    )


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "dataset_rows": schema_memory["row_count"],
        "dataset_columns": len(schema_memory["columns"]),
    }


@app.post("/api/query", response_model=QueryResponse)
async def handle_query(request: QueryRequest):
    dashboard_response = build_dashboard_response(request.query)
    if dashboard_response is not None:
        charts, rows_analyzed, summary = dashboard_response
        return QueryResponse(
            charts=charts,
            summary=summary,
            rows_analyzed=rows_analyzed,
        )

    if is_exploratory_query(request.query):
        intents = build_exploratory_intents()
    else:
        try:
            base_intent = extract_intent(request.query)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Intent extraction service unavailable: {str(exc)}",
            ) from exc

        intents = expand_comparison_intents(request.query, base_intent)

    charts = []
    rows_analyzed_values: list[int] = []

    for intent in intents:
        validation_error = validate_intent(intent)
        if validation_error:
            raise HTTPException(status_code=400, detail=validation_error)

        try:
            result_df, current_rows_analyzed = execute_query(intent)
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Query execution failed: {str(exc)}",
            ) from exc

        records = result_to_records(result_df)
        if not records:
            continue

        rows_analyzed_values.append(current_rows_analyzed)
        charts.append(plan_chart(intent, result_df, records))

    if not charts:
        raise HTTPException(
            status_code=404,
            detail="No data found matching your query. Try removing filters or broadening your question.",
        )

    rows_analyzed = max(rows_analyzed_values) if rows_analyzed_values else 0

    if len(charts) == 1:
        try:
            summary = generate_summary(request.query, intents[0], charts[0], rows_analyzed)
        except Exception:
            summary = (
                f"Analysis of {intents[0].metric} grouped by "
                f"{', '.join(intents[0].group_by)} across {rows_analyzed:,} rows."
            )
    else:
        summary = _build_multi_chart_summary(request.query, charts, rows_analyzed)

    return QueryResponse(
        charts=charts,
        summary=summary,
        rows_analyzed=rows_analyzed,
    )