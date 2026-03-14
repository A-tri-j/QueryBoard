from models import IntentModel


def _build_lookups(schema: dict) -> tuple[set[str], set[str], dict[str, list[str]]]:
    numeric_cols = set()
    categorical_cols = set()
    categorical_values: dict[str, list[str]] = {}

    for column in schema["columns"]:
        if column["type"] == "numeric":
            numeric_cols.add(column["name"])
        else:
            categorical_cols.add(column["name"])
            categorical_values[column["name"]] = [str(value).strip() for value in column["values"]]

    return numeric_cols, categorical_cols, categorical_values


def validate_intent(intent: IntentModel, schema: dict) -> str | None:
    """
    Validates the extracted intent against the provided schema.
    Returns None if valid, or an error message string if invalid.
    """

    numeric_cols, categorical_cols, categorical_values = _build_lookups(schema)
    all_cols = numeric_cols | categorical_cols

    if intent.metric not in all_cols:
        return (
            f"Column '{intent.metric}' does not exist in the dataset. "
            f"Available columns: {', '.join(sorted(all_cols))}"
        )

    if intent.metric not in numeric_cols and intent.aggregation != "nunique":
        return (
            f"Column '{intent.metric}' is categorical and cannot be aggregated. "
            f"Numeric columns available: {', '.join(sorted(numeric_cols))}"
        )

    if intent.metric in intent.group_by:
        suggestion = " Try grouping by 'age_group' instead of 'age'." if intent.metric == "age" else ""
        return (
            f"Column '{intent.metric}' cannot be used as both the metric and the group-by dimension."
            f"{suggestion}"
        )

    for column in intent.group_by:
        if column not in all_cols:
            return (
                f"Group-by column '{column}' does not exist in the dataset. "
                f"Available columns: {', '.join(sorted(all_cols))}"
            )

    for filter_item in intent.filters:
        if filter_item.column not in all_cols:
            return (
                f"Filter column '{filter_item.column}' does not exist in the dataset. "
                f"Available columns: {', '.join(sorted(all_cols))}"
            )

        if filter_item.column in categorical_cols and filter_item.operator in [">", "<", ">=", "<="]:
            return (
                f"Cannot use operator '{filter_item.operator}' on categorical column '{filter_item.column}'. "
                "Only '==' and '!=' are allowed for categorical columns."
            )

        if filter_item.column in categorical_cols:
            valid_values = categorical_values[filter_item.column]
            if str(filter_item.value).strip() not in valid_values:
                return (
                    f"Value '{filter_item.value}' does not exist in column '{filter_item.column}'. "
                    f"Valid values are: {', '.join(valid_values)}"
                )

    return None
