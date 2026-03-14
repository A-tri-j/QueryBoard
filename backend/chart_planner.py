import pandas as pd

from models import ChartSpec, IntentModel


def _categorical_columns(schema: dict) -> set[str]:
    return {column["name"] for column in schema["columns"] if column["type"] == "categorical"}


def _categorical_value_count(schema: dict, column_name: str) -> int:
    for column in schema["columns"]:
        if column["name"] == column_name:
            return len(column.get("values", []))
    return 0


def _select_chart_type(intent: IntentModel, schema: dict) -> tuple[str, str]:
    """
    Deterministic rule engine - returns (chart_type, reason).
    Never calls the LLM. Pure logic.
    """

    group_by = intent.group_by
    metric = intent.metric
    chart_preference = intent.chart_preference
    categorical_cols = _categorical_columns(schema)

    if chart_preference != "auto":
        return chart_preference, f"Chart type '{chart_preference}' was explicitly requested."

    if not group_by:
        return "bar", "Single aggregated value displayed as a bar chart."

    if len(group_by) == 1:
        column_name = group_by[0]

        if column_name in categorical_cols:
            unique_count = _categorical_value_count(schema, column_name)

            if unique_count <= 5 and metric.endswith("_score"):
                return "pie", (
                    f"'{column_name}' has {unique_count} categories and metric is a score - "
                    "pie chart shows proportional distribution clearly."
                )

            return "bar", (
                f"'{column_name}' is a categorical column - bar chart best compares "
                f"values across {unique_count} distinct categories."
            )

        return "line", (
            f"'{column_name}' is a numeric column - line chart shows "
            "the trend across the continuous range."
        )

    if len(group_by) == 2:
        return "bar", (
            f"Two group-by columns ('{group_by[0]}' and '{group_by[1]}') - "
            "grouped bar chart compares across both dimensions."
        )

    return "bar", "Multiple dimensions - bar chart provides the clearest comparison."


def _generate_title(intent: IntentModel) -> str:
    if intent.aggregation in ("count", "nunique"):
        prefix = "Unique Count" if intent.aggregation == "nunique" else "Count"
        if intent.group_by:
            group_label = " and ".join(
                column.replace("_", " ").title() for column in intent.group_by
            )
            return f"{prefix} by {group_label}"
        return f"Total {prefix}"

    agg_label = {
        "sum": "Total",
        "mean": "Average",
        "min": "Minimum",
        "max": "Maximum",
    }[intent.aggregation]

    metric_label = intent.metric.replace("_", " ").title()

    if intent.group_by:
        group_label = " and ".join(
            column.replace("_", " ").title() for column in intent.group_by
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
        pie_data.append(
            {
                "name": label,
                "value": value,
                label_key: label,
                value_key: value,
            }
        )

    return pie_data


def plan_chart(intent: IntentModel, result: pd.DataFrame, records: list[dict], schema: dict) -> ChartSpec:
    chart_type, reason = _select_chart_type(intent, schema)
    title = _generate_title(intent)
    x_axis = intent.group_by[0] if intent.group_by else intent.metric
    y_axis = "count" if intent.aggregation in ("count", "nunique") else intent.metric
    chart_data = _format_chart_data(chart_type, intent, records)

    return ChartSpec(
        type=chart_type,
        title=title,
        x=x_axis,
        y=y_axis,
        data=chart_data,
        reason=reason,
    )
