from typing import Literal

from pydantic import BaseModel, field_validator


class FilterModel(BaseModel):
    column: str
    operator: Literal["==", "!=", ">", "<", ">=", "<="]
    value: str | int | float


class IntentModel(BaseModel):
    metric: str
    aggregation: Literal["sum", "mean", "count", "min", "max"]
    group_by: list[str]
    filters: list[FilterModel] = []
    chart_preference: Literal["auto", "bar", "line", "scatter", "pie"] = "auto"


class ChartSpec(BaseModel):
    type: Literal["bar", "line", "scatter", "pie", "histogram"]
    title: str
    x: str
    y: str
    data: list[dict]
    reason: str


class QueryRequest(BaseModel):
    query: str

    @field_validator("query")
    @classmethod
    def query_must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Query must not be empty.")
        return value.strip()


class QueryResponse(BaseModel):
    charts: list[ChartSpec]
    summary: str
    rows_analyzed: int


class ErrorResponse(BaseModel):
    detail: str
