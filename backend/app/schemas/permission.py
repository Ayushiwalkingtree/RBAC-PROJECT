from pydantic import BaseModel


class RolePermissionsResponse(BaseModel):
    role_id: int
    permissions_json: dict[str, list[str]]


class RolePermissionsUpdate(BaseModel):
    permissions_json: dict[str, list[str]]


class RbacCheckRequest(BaseModel):
    org_id: int
    user_id: int
    resource_key: str
    permission_key: str


class RbacCheckResponse(BaseModel):
    allowed: bool
