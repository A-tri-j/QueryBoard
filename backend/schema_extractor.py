from pathlib import Path

import pandas as pd


CSV_PATH = Path(__file__).parent / "data" / "customer_behaviour.xlsx"


def _load_dataframe() -> pd.DataFrame:
    raw = pd.read_excel(CSV_PATH, header=None)

    # Row 1 has headers split across cells, row 0 is metadata.
    columns = ["age"] + [raw.iloc[1][index] for index in range(1, 25)]
    data = raw.iloc[2:].reset_index(drop=True)
    data.columns = columns

    for column in data.columns:
        converted = pd.to_numeric(data[column], errors="coerce")
        if converted.notna().sum() > len(data) * 0.8:
            data[column] = converted

    data["age_group"] = pd.cut(
        data["age"],
        bins=[17, 24, 34, 44, 54, 64, 120],
        labels=["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
        include_lowest=True,
    ).astype(str)

    return data


def build_schema(dataframe: pd.DataFrame) -> dict:
    columns: list[dict] = []

    for column in dataframe.columns:
        dtype = dataframe[column].dtype

        if dtype in ["int64", "float64"]:
            columns.append(
                {
                    "name": column,
                    "type": "numeric",
                    "min": float(dataframe[column].min()),
                    "max": float(dataframe[column].max()),
                }
            )
            continue

        unique_values = dataframe[column].dropna().unique().tolist()
        columns.append(
            {
                "name": column,
                "type": "categorical",
                "values": unique_values,
            }
        )

    return {
        "columns": columns,
        "row_count": len(dataframe),
        "column_names": dataframe.columns.tolist(),
    }


df: pd.DataFrame = _load_dataframe()
schema_memory: dict = build_schema(df)
