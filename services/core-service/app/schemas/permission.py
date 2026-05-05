from pydantic import BaseModel, model_validator


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
    permission: str | None = None
    permission_key: str | None = None

    @model_validator(mode="after")
    def normalize_permission(self) -> "RbacCheckRequest":
        if not self.permission and self.permission_key:
            self.permission = self.permission_key
        if not self.permission:
            raise ValueError("permission is required")
        self.resource_key = self.resource_key.upper()
        self.permission = self.permission.upper()
        return self


class RbacCheckResponse(BaseModel):
    allowed: bool
    reason: str | None = None
