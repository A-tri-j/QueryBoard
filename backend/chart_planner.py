import pandas as pd

from models import ChartSpec, IntentModel
from schema_extractor import schema_memory


CATEGORICAL_COLS = {
    col["name"]
    for col in schema_memory["columns"]
    if col["type"] == "categorical"
}


def _select_chart_type(intent: IntentModel) -> tuple[str, str]:
    """
    Deterministic rule engine - returns (chart_type, reason).
    Never calls the LLM. Pure logic.
    """

    group_by = intent.group_by
    metric = intent.metric
    chart_preference = intent.chart_preference

    if chart_preference != "auto":
        return chart_preference, f"Chart type '{chart_preference}' was explicitly requested."

    if not group_by:
        return "bar", "Single aggregated value displayed as a bar chart."

    if len(group_by) == 1:
        col = group_by[0]

        if col in CATEGORICAL_COLS:
            unique_count = len(
                schema_memory["columns"][
                    next(i for i, candidate in enumerate(schema_memory["columns"]) if candidate["name"] == col)
                ].get("values", [])
            )

            if unique_count <= 5 and metric.endswith("_score"):
                return "pie", (
                    f"'{col}' has {unique_count} categories and metric is a score - "
                    "pie chart shows proportional distribution clearly."
                )

            return "bar", (
                f"'{col}' is a categorical column - bar chart best compares "
                f"values across {unique_count} distinct categories."
            )

        return "line", (
            f"'{col}' is a numeric column - line chart shows "
            "the trend across the continuous range."
        )

    if len(group_by) == 2:
        return "bar", (
            f"Two group-by columns ('{group_by[0]}' and '{group_by[1]}') - "
            "grouped bar chart compares across both dimensions."
        )

    return "bar", "Multiple dimensions - bar chart provides the clearest comparison."


def _generate_title(intent: IntentModel) -> str:
    agg_label = {
        "sum": "Total",
        "mean": "Average",
        "count": "Count of",
        "min": "Minimum",
        "max": "Maximum",
    }[intent.aggregation]

    metric_label = intent.metric.replace("_", " ").title()

    if intent.group_by:
        group_label = " and ".join(
            col.replace("_", " ").title() for col in intent.group_by
        )
        return f"{agg_label} {metric_label} by {group_label}"

    return f"{agg_label} {metric_label}"


def _format_chart_data(chart_type: str, intent: IntentModel, records: list[dict]) -> list[dict]:
    if chart_type != "pie" or not intent.group_by:
        return records

    label_key = intent.group_by[0]
    value_key = intent.metric
    pie_data: list[dict] = []

    for record in records:
        label = record.get(label_key)
        value = record.get(value_key)
        pie_data.append({
            "name": label,
            "value": value,
            label_key: label,
            value_key: value,
        })

    return pie_data


def plan_chart(
    intent: IntentModel,
    result: pd.DataFrame,
    records: list[dict]
) -> ChartSpec:
    chart_type, reason = _select_chart_type(intent)
    title = _generate_title(intent)
    x_axis = intent.group_by[0] if intent.group_by else intent.metric
    y_axis = intent.metric
    chart_data = _format_chart_data(chart_type, intent, records)

    return ChartSpec(
        type=chart_type,
        title=title,
        x=x_axis,
        y=y_axis,
        data=chart_data,
        reason=reason,
    )
