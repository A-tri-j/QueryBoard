import pandas as pd

from models import FilterModel, IntentModel


def _apply_filters(dataframe: pd.DataFrame, filters: list[FilterModel]) -> pd.DataFrame:
    filtered = dataframe.copy()

    for item in filters:
        column = item.column
        value = item.value

        if dataframe[column].dtype in ["int64", "float64"]:
            value = float(value)

        if item.operator == "==":
            filtered = filtered[filtered[column] == value]
        elif item.operator == "!=":
            filtered = filtered[filtered[column] != value]
        elif item.operator == ">":
            filtered = filtered[filtered[column] > value]
        elif item.operator == "<":
            filtered = filtered[filtered[column] < value]
        elif item.operator == ">=":
            filtered = filtered[filtered[column] >= value]
        elif item.operator == "<=":
            filtered = filtered[filtered[column] <= value]

    return filtered


def execute_query(intent: IntentModel, dataframe: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """
    Takes a validated IntentModel, executes it against the provided dataframe.
    Returns a tuple of (result_dataframe, total_rows_analyzed).
    """

    working_df = _apply_filters(dataframe, intent.filters)
    rows_analyzed = len(working_df)

    if intent.group_by:
        if intent.metric in intent.group_by:
            raise ValueError(
                f"Column '{intent.metric}' cannot be used as both the metric and the group-by dimension."
            )

        if intent.aggregation == "count":
            result = working_df.groupby(intent.group_by).size().reset_index(name="count")
        elif intent.aggregation == "nunique":
            result = (
                working_df.groupby(intent.group_by)[intent.metric]
                .nunique()
                .reset_index(name="count")
            )
        else:
            result = (
                working_df.groupby(intent.group_by)[intent.metric].agg(intent.aggregation).reset_index()
            )
    else:
        agg_value = getattr(working_df[intent.metric], intent.aggregation)()
        result_column = "count" if intent.aggregation in ("count", "nunique") else intent.metric
        result = pd.DataFrame({result_column: [round(float(agg_value), 2)]})

    for column in result.select_dtypes(include=["float64"]).columns:
        result[column] = result[column].round(2)

    # Limit to top 20 rows for large result sets to keep charts readable.
    # Sort by the metric column descending so the most significant values show.
    sort_col = "count" if intent.aggregation in ("count", "nunique") else intent.metric
    if len(result) > 20 and sort_col in result.columns:
        result = (
            result.sort_values(sort_col, ascending=False)
            .head(20)
            .reset_index(drop=True)
        )

    return result, rows_analyzed


def result_to_records(result: pd.DataFrame) -> list[dict]:
    return result.to_dict(orient="records")
