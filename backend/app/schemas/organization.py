from pydantic import BaseModel, EmailStr


class OrganizationPublic(BaseModel):
    org_id: int
    org_name: str
    org_code: str


class OrganizationResponse(BaseModel):
    id: int
    org_name: str
    org_code: str
    timezone: str
    plan: str
    logo_url: str | None = None
    support_email: str | None = None
    allowed_origins: list[str] = []
    is_verified: bool


class OrganizationUpdate(BaseModel):
    org_name: str | None = None
    timezone: str | None = None
    logo_url: str | None = None
    support_email: EmailStr | None = None
    allowed_origins: list[str] | None = None
