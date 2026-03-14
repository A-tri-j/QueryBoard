# backend/summarizer.py

import os
from openai import OpenAI
from dotenv import load_dotenv
from models import IntentModel, ChartSpec

load_dotenv()

# ─── Configure OpenAI ────────────────────────────────────────────────────────

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ─── System Prompt ────────────────────────────────────────────────────────────

SUMMARIZER_SYSTEM_PROMPT = """
You are a business intelligence analyst presenting findings to a non-technical executive.
Your job is to write a single short paragraph (2-4 sentences) that explains what the data shows.

RULES:
1. Write in plain English. No technical jargon.
2. Mention the most important number or trend you see in the data.
3. Be specific — reference actual values from the data provided.
4. End with one actionable business insight or implication.
5. Never say "the chart shows" or "the graph displays" — describe the data directly.
6. Keep it under 80 words.
"""

# ─── Format Data for Prompt ───────────────────────────────────────────────────

def _format_data_for_prompt(
    query: str,
    intent: IntentModel,
    chart: ChartSpec,
    rows_analyzed: int
) -> str:

    data_lines = []
    for row in chart.data:
        line = ", ".join(f"{k}: {v}" for k, v in row.items())
        data_lines.append(f"  - {line}")

    data_text = "\n".join(data_lines)

    return f"""
Original question: "{query}"

Analysis performed: {intent.aggregation} of {intent.metric}
Grouped by: {", ".join(intent.group_by) if intent.group_by else "no grouping"}
Filters applied: {", ".join(f"{f.column} {f.operator} {f.value}" for f in intent.filters) if intent.filters else "none"}
Rows analyzed: {rows_analyzed:,}

Data results:
{data_text}

Chart type used: {chart.type} chart
"""

# ─── Generate Summary ─────────────────────────────────────────────────────────

def generate_summary(
    query: str,
    intent: IntentModel,
    chart: ChartSpec,
    rows_analyzed: int
) -> str:

    user_message = _format_data_for_prompt(query, intent, chart, rows_analyzed)

    # Ground the summary in real data to prevent hallucination
    top_records = sorted(
        chart.data,
        key=lambda r: r.get(chart.y, 0) if isinstance(r.get(chart.y), (int, float)) else 0,
        reverse=True
    )[:3]

    data_facts = ", ".join(
        f"{list(r.values())[0]}: {r.get(chart.y, 'N/A')}"
        for r in top_records
    ) if top_records else "No data"

    grounded_system_prompt = (
        SUMMARIZER_SYSTEM_PROMPT.strip()
        + "\nKEY DATA FACTS (use only these exact numbers, do not invent others): "
        + data_facts
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.7,
        max_tokens=200,
        messages=[
            {"role": "system", "content": grounded_system_prompt},
            {"role": "user", "content": user_message}
        ]
    )

    summary = response.choices[0].message.content.strip()

    if not summary:
        return (
            f"Analysis of {intent.metric} grouped by "
            f"{', '.join(intent.group_by)} across {rows_analyzed:,} rows."
        )

    return summary
