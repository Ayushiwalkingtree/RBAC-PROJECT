from datetime import date, datetime

from pydantic import BaseModel


class AuditLogFilters(BaseModel):
    action: str | None = None
    resource_type: str | None = None
    user_id: int | None = None
    date_from: date | None = None
    date_to: date | None = None


class AuditLogResponse(BaseModel):
    id: int
    action: str
    actor_user_id: int | None
    target_user_id: int | None
    resource_type: str
    resource_id: str | None
    resource_key: str | None
    message: str
    created_at: datetime
