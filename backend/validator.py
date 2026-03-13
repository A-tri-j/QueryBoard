from models import IntentModel, FilterModel
from schema_extractor import schema_memory


def _build_lookups() -> tuple[set[str], set[str], dict[str, list]]:
    numeric_cols = set()
    categorical_cols = set()
    categorical_values: dict[str, list] = {}

    for col in schema_memory["columns"]:
        if col["type"] == "numeric":
            numeric_cols.add(col["name"])
        else:
            categorical_cols.add(col["name"])
            categorical_values[col["name"]] = [
                str(v).strip() for v in col["values"]
            ]

    return numeric_cols, categorical_cols, categorical_values


NUMERIC_COLS, CATEGORICAL_COLS, CATEGORICAL_VALUES = _build_lookups()
ALL_COLS = NUMERIC_COLS | CATEGORICAL_COLS


# ─── Main Validation Function ─────────────────────────────────────────────────

def validate_intent(intent: IntentModel) -> str | None:
    """
    Validates the intent extracted by LLM1 against the schema.
    Returns None if valid, or an error message string if invalid.
    """

    # 1. Metric must exist and be numeric
    if intent.metric not in ALL_COLS:
        return (
            f"Column '{intent.metric}' does not exist in the dataset. "
            f"Available columns: {', '.join(sorted(ALL_COLS))}"
        )

    if intent.metric not in NUMERIC_COLS:
        return (
            f"Column '{intent.metric}' is categorical and cannot be aggregated. "
            f"Numeric columns available: {', '.join(sorted(NUMERIC_COLS))}"
        )

    if intent.metric in intent.group_by:
        suggestion = " Try grouping by 'age_group' instead of 'age'." if intent.metric == "age" else ""
        return (
            f"Column '{intent.metric}' cannot be used as both the metric and the group-by dimension."
            f"{suggestion}"
        )

    # 2. group_by columns must exist
    for col in intent.group_by:
        if col not in ALL_COLS:
            return (
                f"Group-by column '{col}' does not exist in the dataset. "
                f"Available columns: {', '.join(sorted(ALL_COLS))}"
            )

    # 3. Validate each filter
    for f in intent.filters:

        # Filter column must exist
        if f.column not in ALL_COLS:
            return (
                f"Filter column '{f.column}' does not exist in the dataset. "
                f"Available columns: {', '.join(sorted(ALL_COLS))}"
            )

        # Numeric operators on categorical columns make no sense
        if f.column in CATEGORICAL_COLS and f.operator in [">", "<", ">=", "<="]:
            return (
                f"Cannot use operator '{f.operator}' on categorical column '{f.column}'. "
                f"Only '==' and '!=' are allowed for categorical columns."
            )

        # Filter value must exist in categorical column
        if f.column in CATEGORICAL_COLS:
            valid_values = CATEGORICAL_VALUES[f.column]
            if str(f.value).strip() not in valid_values:
                return (
                    f"Value '{f.value}' does not exist in column '{f.column}'. "
                    f"Valid values are: {', '.join(valid_values)}"
                )

    return None
