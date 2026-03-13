import pandas as pd
from pathlib import Path

CSV_PATH = Path(__file__).parent/"data"/"customer_behaviour.csv"

df: pd.DataFrame = pd.read_csv(CSV_PATH)

def extract_schema(dataframe: pd.DataFrame) -> dict:
    columns = []
    
    for col in dataframe.columns:
        dtype = dataframe[col].dtype
        
        if dtype in ["int64","float64"]:
            columns.append({
                "name":col,
                "type":"numeric",
                "min": float(dataframe[col].min()),
                "max": float(dataframe[col].max())
            })
        else:
            unique_values = dataframe[col].dropna().unique().tolist()
            columns.append({
                "name":col,
                "type":"categorical",
                "values": unique_values
            })
    
    return {
        "columns": columns,
        "row_count": len(dataframe),
        "column_names": dataframe.columns.tolist()
    }
    
schema_memory: dict = extract_schema(df)