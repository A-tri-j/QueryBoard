from pydantic import BaseModel, field_validator
from typing import Literal

# Intent Model for the structured output of the LLM:

class FilterModel(BaseModel):
    column: str
    operator: Literal["==","!=",">","<",">=","<="]
    value: str | int | float
    
class IntentModel(BaseModel):
    metric: str
    aggregation: Literal["sum","mean","count","min","max"]
    group_by:list[str]
    filters: list[FilterModel] = []
    chart_preference: Literal["auto","bar","line","scatter","pie"] = "auto"
    
# Chart Model for the structured output of chart planar:
class ChartSpec(BaseModel):
    type: Literal["bar","line","scatter","pie","histogram"]
    title: str
    x: str
    y: str
    data: list[dict]
    reason: str
    
# API request / response models:

class QueryRequest(BaseModel):
    query: str
    
    @field_validator("query")
    @classmethod
    
    def query_must_not_be_empty(cls, v : str) -> str:
        if not v.strip():
            raise ValueError("Query must not be empty.")
        return v.strip()
    
class QueryResponse(BaseModel):
    charts: list[ChartSpec]
    summary: str
    rows_analyzed: int 
    
class ErrorResponse(BaseModel):
    detail: str
    
