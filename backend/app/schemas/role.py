from pydantic import BaseModel, Field


class RoleCreate(BaseModel):
    role_code: str = Field(min_length=2)
    role_name: str = Field(min_length=2)
    description: str | None = None


class RoleUpdate(BaseModel):
    role_code: str | None = None
    role_name: str | None = None
    description: str | None = None


class RoleResponse(BaseModel):
    id: int
    role_id: int | None = None
    role_code: str
    role_name: str
    description: str | None
    is_system: bool
