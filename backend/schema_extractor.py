# backend/schema_extractor.py

import pandas as pd
from pathlib import Path

CSV_PATH = Path(__file__).parent / "data" / "customer_behaviour.xlsx"

# ─── Load DataFrame ───────────────────────────────────────────────────────────

def _load_dataframe() -> pd.DataFrame:
    raw = pd.read_excel(CSV_PATH, header=None)
    
    # Row 1 has headers split across cells, row 0 is metadata
    cols = ['age'] + [raw.iloc[1][i] for i in range(1, 25)]
    data = raw.iloc[2:].reset_index(drop=True)
    data.columns = cols
    
    # Convert numeric columns to proper numeric types
    for col in data.columns:
        converted = pd.to_numeric(data[col], errors='coerce')
        if converted.notna().sum() > len(data) * 0.8:
            data[col] = converted

    return data


df: pd.DataFrame = _load_dataframe()

# ─── Schema Extractor ─────────────────────────────────────────────────────────

def extract_schema(dataframe: pd.DataFrame) -> dict:
    columns = []

    for col in dataframe.columns:
        dtype = dataframe[col].dtype

        if dtype in ["int64", "float64"]:
            columns.append({
                "name": col,
                "type": "numeric",
                "min": float(dataframe[col].min()),
                "max": float(dataframe[col].max())
            })
        else:
            unique_values = dataframe[col].dropna().unique().tolist()
            columns.append({
                "name": col,
                "type": "categorical",
                "values": unique_values
            })

    return {
        "columns": columns,
        "row_count": len(dataframe),
        "column_names": dataframe.columns.tolist()
    }


schema_memory: dict = extract_schema(df)