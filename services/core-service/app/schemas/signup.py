from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    org_name: str = Field(min_length=2)
    admin_name: str = Field(min_length=2)
    admin_email: EmailStr
    password: str = Field(min_length=8)


class SignupResponse(BaseModel):
    organization_id: int
    org_code: str
    admin_user_id: int
    admin_role_code: str = "ORG_ADMIN"
    message: str
    dev_verification_url: str | None = None


class VerifyEmailRequest(BaseModel):
    token: str
