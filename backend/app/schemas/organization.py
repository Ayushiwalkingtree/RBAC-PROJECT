from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class OrganizationPublic(BaseModel):
    org_id: int
    org_name: str
    org_code: str


class OrganizationResponse(BaseModel):
    id: int
    org_id: int | None = None
    org_name: str
    org_code: str
    timezone: str
    plan: str
    settings_json: dict = Field(default_factory=dict)
    subscription_ends_at: datetime | None = None
    logo_url: str | None = None
    support_email: str | None = None
    allowed_origins: list[str] = Field(default_factory=list)
    is_verified: bool


class OrganizationUpdate(BaseModel):
    org_name: str | None = None
    timezone: str | None = None
    logo_url: str | None = None
    support_email: EmailStr | None = None
    allowed_origins: list[str] | None = None
    settings_json: dict | None = None
