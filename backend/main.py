# backend/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

from models import QueryRequest, QueryResponse, ErrorResponse
from schema_extractor import df, schema_memory
from intent_extractor import extract_intent
from validator import validate_intent
from query_engine import execute_query, result_to_records
from chart_planner import plan_chart
from summarizer import generate_summary

load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

# ─── App Initialization ───────────────────────────────────────────────────────

app = FastAPI(
    title="QueryBoard API",
    description="Conversational AI for Business Intelligence Dashboards",
    version="1.0.0"
)

# ─── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "dataset_rows": schema_memory["row_count"],
        "dataset_columns": len(schema_memory["columns"])
    }

# ─── Main Query Endpoint ──────────────────────────────────────────────────────

@app.post("/api/query", response_model=QueryResponse)
async def handle_query(request: QueryRequest):

    # ── Step 1: Extract Intent from LLM1 ─────────────────────────────────────
    try:
        intent = extract_intent(request.query)
    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Intent extraction service unavailable: {str(e)}"
        )

    # ── Step 2: Validate Intent against Schema ────────────────────────────────
    validation_error = validate_intent(intent)
    if validation_error:
        raise HTTPException(
            status_code=400,
            detail=validation_error
        )

    # ── Step 3: Execute Query against Pandas ──────────────────────────────────
    try:
        result_df, rows_analyzed = execute_query(intent)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Query execution failed: {str(e)}"
        )

    # ── Step 4: Convert result to records ─────────────────────────────────────
    records = result_to_records(result_df)

    if not records:
        raise HTTPException(
            status_code=404,
            detail="No data found matching your query. Try removing filters or broadening your question."
        )

    # ── Step 5: Plan Chart ────────────────────────────────────────────────────
    chart = plan_chart(intent, result_df, records)

    # ── Step 6: Generate Summary from LLM2 ───────────────────────────────────
    try:
        summary = generate_summary(request.query, intent, chart, rows_analyzed)
    except Exception as e:
        # Summary failure should not crash the whole response
        summary = (
            f"Analysis of {intent.metric} grouped by "
            f"{', '.join(intent.group_by)} across {rows_analyzed:,} rows."
        )

    # ── Step 7: Return structured response ───────────────────────────────────
    return QueryResponse(
        charts=[chart],
        summary=summary,
        rows_analyzed=rows_analyzed
    )
