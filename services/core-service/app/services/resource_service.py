from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.resource import Resource, ResourcePermission
from app.repositories.permission_repository import PermissionRepository
from app.repositories.resource_repository import ResourceRepository
from app.schemas.resource import ResourceCreate, ResourceUpdate
from app.services.audit_service import AuditService


def permission_keys(permissions: list) -> list[str]:
    keys: list[str] = []
    for permission in permissions:
        if isinstance(permission, dict):
            key = permission.get("key")
        else:
            key = permission
        if key:
            keys.append(str(key).upper())
    return keys


def _normalize_optional_upper(value: str | None) -> str | None:
    return value.upper() if value else value


def _validate_resource_fields(
    *,
    resource_type: str,
    allowed_permissions: list[str],
    http_method: str | None,
    api_path: str | None,
    microservice: str | None,
    sequence_no: int | None,
) -> None:
    resource_type = resource_type.upper()
    if not allowed_permissions:
        raise AppError(422, "EMPTY_PERMISSIONS", "At least one permission is required")
    if resource_type == "API" and not (http_method and api_path and microservice):
        raise AppError(422, "API_METADATA_REQUIRED", "API resources require http_method, api_path, and microservice")
    if resource_type == "MENU" and sequence_no is None:
        raise AppError(422, "MENU_SEQUENCE_REQUIRED", "Menu resources require sequence_no")


class ResourceService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = ResourceRepository(session)
        self.permission_repo = PermissionRepository(session)
        self.audit = AuditService(session)

    async def create(self, payload: ResourceCreate, actor_user_id: int) -> Resource:
        resource_type = payload.resource_type.upper()
        http_method = _normalize_optional_upper(payload.http_method)
        allowed_permissions = [permission.upper() for permission in payload.allowed_permissions]
        _validate_resource_fields(
            resource_type=resource_type,
            allowed_permissions=allowed_permissions,
            http_method=http_method,
            api_path=payload.api_path,
            microservice=payload.microservice,
            sequence_no=payload.sequence_no,
        )
        if await self.repo.get_by_key(payload.resource_key):
            raise AppError(409, "RESOURCE_KEY_EXISTS", "Resource key already exists")
        resource = Resource(
            resource_key=payload.resource_key.upper(),
            resource_name=payload.resource_name,
            resource_type=resource_type,
            resource_group=payload.resource_group,
            description=payload.description,
            http_method=http_method,
            api_path=payload.api_path,
            microservice=payload.microservice,
            is_ui_visible=payload.is_ui_visible,
            is_active=payload.is_active,
            ui_path=payload.ui_path,
            icon=payload.icon,
            sequence_no=payload.sequence_no,
            parent_resource_key=payload.parent_resource_key,
        )
        self.repo.add(resource)
        await self.session.flush()
        self.repo.add_permissions(
            ResourcePermission(
                resource_id=resource.id,
                resource_key=resource.resource_key,
                permissions_json=allowed_permissions,
            )
        )
        await self.audit.write(
            1,
            "RESOURCE_CREATED",
            "RESOURCE",
            f"{resource.resource_key} created",
            actor_user_id=actor_user_id,
            resource_id=str(resource.id),
            resource_key=resource.resource_key,
            new_value_json={
                "resource_key": resource.resource_key,
                "resource_type": resource.resource_type,
                "permissions": allowed_permissions,
                "http_method": resource.http_method,
                "api_path": resource.api_path,
                "microservice": resource.microservice,
                "sequence_no": resource.sequence_no,
            },
        )
        await self.session.commit()
        return resource

    async def update(self, resource_id: int, payload: ResourceUpdate, actor_user_id: int) -> Resource:
        resource = await self.repo.get(resource_id)
        if not resource:
            raise AppError(404, "RESOURCE_NOT_FOUND", "Resource was not found")
        perms = await self.repo.permission_by_resource_id(resource.id)
        old_value = {
            "resource_name": resource.resource_name,
            "resource_type": resource.resource_type,
            "resource_group": resource.resource_group,
            "permissions": permission_keys(perms.permissions_json) if perms else [],
            "is_active": resource.is_active,
            "http_method": resource.http_method,
            "api_path": resource.api_path,
            "microservice": resource.microservice,
            "sequence_no": resource.sequence_no,
            "parent_resource_key": resource.parent_resource_key,
        }
        next_permissions = [p.upper() for p in payload.allowed_permissions] if payload.allowed_permissions is not None else (permission_keys(perms.permissions_json) if perms else [])
        next_type = (payload.resource_type or resource.resource_type).upper()
        next_http_method = _normalize_optional_upper(payload.http_method) if payload.http_method is not None else resource.http_method
        next_api_path = payload.api_path if payload.api_path is not None else resource.api_path
        next_microservice = payload.microservice if payload.microservice is not None else resource.microservice
        next_sequence_no = payload.sequence_no if payload.sequence_no is not None else resource.sequence_no
        _validate_resource_fields(
            resource_type=next_type,
            allowed_permissions=next_permissions,
            http_method=next_http_method,
            api_path=next_api_path,
            microservice=next_microservice,
            sequence_no=next_sequence_no,
        )
        if payload.allowed_permissions is not None and perms:
            removed = set(permission_keys(perms.permissions_json)) - set(next_permissions)
            for permission in removed:
                if await self.permission_repo.is_permission_in_use(resource.resource_key, permission):
                    raise AppError(409, "PERMISSION_IN_USE", f"{permission} is already granted")
            perms.permissions_json = next_permissions
            perms.resource_key = resource.resource_key
        elif payload.allowed_permissions is not None:
            perms = ResourcePermission(
                resource_id=resource.id,
                resource_key=resource.resource_key,
                permissions_json=next_permissions,
            )
            self.repo.add_permissions(perms)
        for field in ["resource_name", "resource_type", "resource_group", "description", "http_method", "api_path", "microservice", "is_ui_visible", "is_active", "ui_path", "icon", "sequence_no", "parent_resource_key"]:
            value = getattr(payload, field)
            if value is not None:
                if field in {"resource_type", "http_method"}:
                    value = value.upper()
                setattr(resource, field, value)
        await self.audit.write(
            1,
            "RESOURCE_UPDATED",
            "RESOURCE",
            f"{resource.resource_key} updated",
            actor_user_id=actor_user_id,
            resource_id=str(resource.id),
            resource_key=resource.resource_key,
            old_value_json=old_value,
            new_value_json={
                "resource_name": resource.resource_name,
                "resource_type": resource.resource_type,
                "resource_group": resource.resource_group,
                "permissions": permission_keys(perms.permissions_json) if perms else [],
                "is_active": resource.is_active,
                "http_method": resource.http_method,
                "api_path": resource.api_path,
                "microservice": resource.microservice,
                "sequence_no": resource.sequence_no,
                "parent_resource_key": resource.parent_resource_key,
            },
        )
        await self.session.commit()
        return resource

    async def delete(self, resource_id: int, actor_user_id: int) -> None:
        resource = await self.repo.get(resource_id)
        if not resource:
            raise AppError(404, "RESOURCE_NOT_FOUND", "Resource was not found")
        resource.is_deleted = True
        perms = await self.repo.permission_by_resource_id(resource_id)
        if perms:
            perms.is_deleted = True
            perms.is_active = False
        await self.audit.write(
            1,
            "RESOURCE_UPDATED",
            "RESOURCE",
            f"{resource.resource_key} deleted",
            actor_user_id=actor_user_id,
            resource_id=str(resource.id),
            resource_key=resource.resource_key,
            old_value_json={"is_deleted": False, "is_active": True},
            new_value_json={"is_deleted": True, "is_active": False},
        )
        await self.session.commit()
