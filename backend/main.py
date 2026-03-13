import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI

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

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ── CORS ──────────────────────────────────────────────────────────────────────
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


def _validate_query_input(query: str) -> None:
    """Raises HTTPException for short, symbol-only, or gibberish queries."""
    if len(query) < 5:
        raise HTTPException(
            status_code=400,
            detail="Query too short. Please ask a proper question about the dataset.",
        )
    if not any(c.isalpha() for c in query):
        raise HTTPException(
            status_code=400,
            detail="Query must contain actual words, not just symbols or numbers.",
        )
    if len(query.split()) < 2:
        raise HTTPException(
            status_code=400,
            detail="Please ask a more specific question about the data.",
        )

    # LLM gibberish check
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
        # If the guard itself fails, let the main pipeline handle it
        pass


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "dataset_rows": schema_memory["row_count"],
        "dataset_columns": len(schema_memory["columns"]),
    }


@app.post("/api/query", response_model=QueryResponse)
async def handle_query(request: QueryRequest):
    query = request.query.strip()

    # ── Input Guard ───────────────────────────────────────────────────────────
    _validate_query_input(query)

    # ── Dashboard shortcut (pre-built queries) ────────────────────────────────
    dashboard_response = build_dashboard_response(query)
    if dashboard_response is not None:
        charts, rows_analyzed, summary = dashboard_response
        return QueryResponse(
            charts=charts,
            summary=summary,
            rows_analyzed=rows_analyzed,
        )

    # ── Intent extraction ─────────────────────────────────────────────────────
    if is_exploratory_query(query):
        intents = build_exploratory_intents()
    else:
        try:
            base_intent = extract_intent(query)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Intent extraction service unavailable: {str(exc)}",
            ) from exc

        intents = expand_comparison_intents(query, base_intent)

    # ── Query execution ───────────────────────────────────────────────────────
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

    # ── Summary ───────────────────────────────────────────────────────────────
    if len(charts) == 1:
        try:
            summary = generate_summary(query, intents[0], charts[0], rows_analyzed)
        except Exception:
            summary = (
                f"Analysis of {intents[0].metric} grouped by "
                f"{', '.join(intents[0].group_by)} across {rows_analyzed:,} rows."
            )
    else:
        summary = _build_multi_chart_summary(query, charts, rows_analyzed)

    return QueryResponse(
        charts=charts,
        summary=summary,
        rows_analyzed=rows_analyzed,
    )