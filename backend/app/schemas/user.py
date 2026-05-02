from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2)
    password: str = Field(min_length=8)
    title: str | None = None
    department: str | None = None
    role_ids: list[int] = Field(min_length=1)
    is_active: bool = True


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    password: str | None = None
    title: str | None = None
    department: str | None = None
    is_active: bool | None = None


class UserRolesUpdate(BaseModel):
    role_ids: list[int] = Field(min_length=1)


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    title: str | None
    department: str | None
    is_active: bool
    is_email_verified: bool
    role_ids: list[int] = []


class UserCreateResponse(BaseModel):
    user: UserResponse
    verification_token: str | None = None
