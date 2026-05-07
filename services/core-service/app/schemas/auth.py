from datetime import datetime

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class CurrentOrg(BaseModel):
    id: int
    org_id: int | None = None
    org_code: str
    org_name: str


class CurrentUser(BaseModel):
    id: int
    user_id: int | None = None
    email: str
    full_name: str
    is_email_verified: bool
    is_active: bool


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_at: datetime | str
    user: CurrentUser
    org: CurrentOrg
    roles: list[str]
    perms: dict[str, list[str]]
    nav: list[dict]
