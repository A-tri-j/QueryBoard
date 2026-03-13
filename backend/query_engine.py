import pandas as pd
from models import IntentModel, FilterModel
from schema_extractor import df, schema_memory



def _apply_filters(dataframe: pd.DataFrame, filters: list[FilterModel]) -> pd.DataFrame:
    filtered = dataframe.copy()

    for f in filters:
        col = f.column
        val = f.value

        # Cast value to match column dtype
        if dataframe[col].dtype in ["int64", "float64"]:
            val = float(val)

        if f.operator == "==":
            filtered = filtered[filtered[col] == val]
        elif f.operator == "!=":
            filtered = filtered[filtered[col] != val]
        elif f.operator == ">":
            filtered = filtered[filtered[col] > val]
        elif f.operator == "<":
            filtered = filtered[filtered[col] < val]
        elif f.operator == ">=":
            filtered = filtered[filtered[col] >= val]
        elif f.operator == "<=":
            filtered = filtered[filtered[col] <= val]

    return filtered



def execute_query(intent: IntentModel) -> tuple[pd.DataFrame, int]:
    """
    Takes a validated IntentModel, executes it against the dataframe.
    Returns a tuple of (result_dataframe, total_rows_analyzed).
    """

    # Step 1 — apply filters first
    working_df = _apply_filters(df, intent.filters)
    rows_analyzed = len(working_df)

    # Step 2 — group and aggregate
    if intent.group_by:
        grouped = working_df.groupby(intent.group_by)[intent.metric]

        if intent.aggregation == "sum":
            result = grouped.sum()
        elif intent.aggregation == "mean":
            result = grouped.mean()
        elif intent.aggregation == "count":
            result = grouped.count()
        elif intent.aggregation == "min":
            result = grouped.min()
        elif intent.aggregation == "max":
            result = grouped.max()

        result = result.reset_index()

    else:
        # No group_by — compute a single aggregation across entire column
        agg_value = getattr(working_df[intent.metric], intent.aggregation)()
        result = pd.DataFrame({
            intent.metric: [round(float(agg_value), 2)]
        })

    # Step 3 — round numeric results to 2 decimal places
    for col in result.select_dtypes(include=["float64"]).columns:
        result[col] = result[col].round(2)

    return result, rows_analyzed


def result_to_records(result: pd.DataFrame) -> list[dict]:
    return result.to_dict(orient="records")