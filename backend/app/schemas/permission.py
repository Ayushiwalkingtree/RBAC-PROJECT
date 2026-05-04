from pydantic import BaseModel


class AvailablePermissionResponse(BaseModel):
    key: str
    label: str
    granted: bool


class MatrixResourceResponse(BaseModel):
    resource_id: int
    resource_key: str
    resource_name: str
    resource_type: str
    resource_group: str
    description: str | None = None
    sequence_no: int | None = None
    parent_resource_key: str | None = None
    http_method: str | None = None
    api_path: str | None = None
    microservice: str | None = None
    is_ui_visible: bool = False
    available_permissions: list[AvailablePermissionResponse]


class RolePermissionsResponse(BaseModel):
    role_id: int
    role_code: str | None = None
    resources: list[MatrixResourceResponse] = []
    permissions_json: dict[str, list[str]] = {}


class RolePermissionsUpdate(BaseModel):
    permissions_json: dict[str, list[str]]
    allow_platform_resource_delegation: bool = False


class RbacCheckRequest(BaseModel):
    org_id: int
    user_id: int
    resource_key: str
    permission_key: str


class RbacCheckResponse(BaseModel):
    allowed: bool
