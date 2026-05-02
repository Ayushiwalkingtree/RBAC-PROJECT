from pydantic import BaseModel, Field, model_validator


class ResourcePermissionPayload(BaseModel):
    permissions: list[str] = Field(min_length=1)


class ResourceCreate(BaseModel):
    resource_key: str = Field(min_length=2)
    resource_name: str = Field(min_length=2)
    resource_type: str
    resource_group: str
    description: str | None = None
    allowed_permissions: list[str] = Field(min_length=1)
    http_method: str | None = None
    api_path: str | None = None
    microservice: str | None = None
    is_ui_visible: bool = False
    is_active: bool = True
    ui_path: str | None = None
    icon: str | None = None
    sequence_no: int | None = None
    parent_resource_key: str | None = None

    @model_validator(mode="after")
    def validate_type_fields(self) -> "ResourceCreate":
        if self.resource_type == "API" and not (self.http_method and self.api_path and self.microservice):
            raise ValueError("API resources require http_method, api_path, and microservice")
        return self


class ResourceUpdate(ResourceCreate):
    resource_key: str | None = None
    resource_name: str | None = None
    resource_type: str | None = None
    resource_group: str | None = None
    allowed_permissions: list[str] | None = None


class ResourceResponse(BaseModel):
    id: int
    resource_key: str
    resource_name: str
    resource_type: str
    resource_group: str
    allowed_permissions: list[str]
    is_ui_visible: bool
    is_active: bool
    sequence_no: int | None = None
    parent_resource_key: str | None = None
