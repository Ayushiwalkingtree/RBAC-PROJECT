from pydantic import BaseModel, Field


class ResourcePermissionPayload(BaseModel):
    permissions: list[str]


class ResourceCreate(BaseModel):
    resource_key: str = Field(min_length=2)
    resource_name: str = Field(min_length=2)
    resource_type: str
    resource_group: str
    description: str | None = None
    allowed_permissions: list[str]
    http_method: str | None = None
    api_path: str | None = None
    microservice: str | None = None
    is_ui_visible: bool = False
    is_active: bool = True
    ui_path: str | None = None
    icon: str | None = None
    sequence_no: int | None = None
    parent_resource_key: str | None = None


class ResourceUpdate(ResourceCreate):
    resource_key: str | None = None
    resource_name: str | None = None
    resource_type: str | None = None
    resource_group: str | None = None
    allowed_permissions: list[str] | None = None
    is_ui_visible: bool | None = None
    is_active: bool | None = None


class ResourceResponse(BaseModel):
    id: int
    resource_id: int | None = None
    resource_key: str
    resource_name: str
    resource_type: str
    resource_group: str
    description: str | None = None
    allowed_permissions: list[str]
    http_method: str | None = None
    api_path: str | None = None
    microservice: str | None = None
    is_ui_visible: bool
    is_active: bool
    ui_path: str | None = None
    icon: str | None = None
    sequence_no: int | None = None
    parent_resource_key: str | None = None
