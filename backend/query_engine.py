import pandas as pd

from models import FilterModel, IntentModel
from schema_extractor import df


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


def execute_query(intent: IntentModel) -> tuple[pd.DataFrame, int]:
    """
    Takes a validated IntentModel, executes it against the dataframe.
    Returns a tuple of (result_dataframe, total_rows_analyzed).
    """

    working_df = _apply_filters(df, intent.filters)
    rows_analyzed = len(working_df)

    if intent.group_by:
        if intent.metric in intent.group_by:
            raise ValueError(
                f"Column '{intent.metric}' cannot be used as both the metric and the group-by dimension."
            )

        if intent.aggregation == "count":
            result = (
                working_df
                .groupby(intent.group_by)
                .size()
                .reset_index(name=intent.metric)
            )
        else:
            result = (
                working_df
                .groupby(intent.group_by)[intent.metric]
                .agg(intent.aggregation)
                .reset_index()
            )
    else:
        agg_value = getattr(working_df[intent.metric], intent.aggregation)()
        result = pd.DataFrame({
            intent.metric: [round(float(agg_value), 2)]
        })

    for column in result.select_dtypes(include=["float64"]).columns:
        result[column] = result[column].round(2)

    return result, rows_analyzed


def result_to_records(result: pd.DataFrame) -> list[dict]:
    return result.to_dict(orient="records")
