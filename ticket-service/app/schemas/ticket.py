from datetime import datetime

from pydantic import BaseModel, Field


class TicketCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str | None = None
    status: str = "OPEN"


class TicketUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    status: str | None = None


class TicketResponse(BaseModel):
    id: int
    at_organization_id: int
    title: str
    description: str | None = None
    status: str
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}
