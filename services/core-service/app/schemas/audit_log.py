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
    at_user_id: int | None = None
    action: str
    actor_user_id: int | None
    target_user_id: int | None
    resource_type: str
    resource_id: str | None
    resource_key: str | None
    message: str
    old_value_json: dict | None = None
    new_value_json: dict | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    correlation_id: str | None = None
    created_at: datetime
