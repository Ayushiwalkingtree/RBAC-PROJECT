from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ApiError(BaseModel):
    code: str
    message: str
    details: list[Any] = []


class ApiMeta(BaseModel):
    request_id: str
    timestamp: datetime


class ApiResponse(BaseModel):
    success: bool
    data: Any
    error: ApiError | None
    meta: ApiMeta


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
