from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    org_name: str = Field(min_length=2)
    org_code: str = Field(min_length=2)
    admin_name: str = Field(min_length=2)
    admin_email: EmailStr
    password: str = Field(min_length=8)
    timezone: str = "Asia/Kolkata"
    plan: str = "STARTER"


class SignupResponse(BaseModel):
    organization_id: int
    org_code: str
    admin_user_id: int
    admin_role_code: str = "ORG_ADMIN"
    message: str


class VerifyEmailRequest(BaseModel):
    token: str
