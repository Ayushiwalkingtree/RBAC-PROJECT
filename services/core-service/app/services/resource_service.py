import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.rbac import NAV_TYPES
from app.models.organization import Organization
from app.models.resource import Resource, ResourcePermission
from app.models.role import Role, RolePermission
from app.repositories.permission_repository import PermissionRepository
from app.repositories.resource_repository import ResourceRepository
from app.schemas.resource import ResourceCreate, ResourceUpdate
from app.services.audit_service import AuditService
from app.utils.permission_normalization import normalize_available_permissions, normalize_role_permissions


def permission_keys(permissions: list) -> list[str]:
    return [permission["key"] for permission in normalize_available_permissions(permissions)]


def normalized_available_permission_keys(
    permissions: list | None,
    *,
    resource_type: str,
    is_ui_visible: bool,
) -> list[str]:
    keys = permission_keys(permissions or [])
    if keys:
        return keys
    if is_ui_visible and resource_type.upper() in NAV_TYPES:
        return ["VIEW"]
    return keys


def _normalize_optional_upper(value: str | None) -> str | None:
    cleaned = _clean_optional(value)
    return cleaned.upper() if cleaned else None


def _clean_optional(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _default_ui_path(resource_name: str, resource_key: str, resource_type: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", resource_name.strip().lower()).strip("-") or resource_key.lower()
    if resource_type == "REPORT":
        return f"/reports/{slug}"
    if resource_type == "DASHBOARD":
        return f"/dashboard/{slug}"
    return f"/{slug}"


def _nav_ui_path(
    *,
    resource_name: str,
    resource_key: str,
    resource_type: str,
    is_ui_visible: bool,
    ui_path: str | None,
) -> str | None:
    cleaned = _clean_optional(ui_path)
    if cleaned or resource_type not in NAV_TYPES or not is_ui_visible:
        return cleaned
    return _default_ui_path(resource_name, resource_key, resource_type)


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

    async def _grant_to_platform_super_admin_once(self, resource_key: str, permissions: list[str]) -> None:
        result = await self.session.execute(
            select(Role, Organization.id)
            .join(Organization, Organization.id == Role.at_organization_id)
            .where(
                Organization.org_code == "PLATFORM",
                Role.role_code == "SUPER_ADMIN",
                Role.is_deleted.is_(False),
            )
        )
        row = result.first()
        if not row:
            return
        role, org_id = row
        role_permissions = await self.permission_repo.get_role_permission(role.id)
        if not role_permissions:
            role_permissions = RolePermission(role_id=role.id, at_organization_id=org_id, permissions_json={})
            self.session.add(role_permissions)
            await self.session.flush()
        grants = normalize_role_permissions(role_permissions.permissions_json)
        grants[resource_key] = sorted({permission.upper() for permission in permissions})
        role_permissions.permissions_json = grants
        role_permissions.at_organization_id = org_id

    async def create(self, payload: ResourceCreate, actor_user_id: int) -> Resource:
        resource_type = payload.resource_type.upper()
        http_method = _normalize_optional_upper(payload.http_method)
        resource_key = payload.resource_key.upper()
        allowed_permissions = normalized_available_permission_keys(
            payload.allowed_permissions,
            resource_type=resource_type,
            is_ui_visible=payload.is_ui_visible,
        )
        ui_path = _nav_ui_path(
            resource_name=payload.resource_name,
            resource_key=resource_key,
            resource_type=resource_type,
            is_ui_visible=payload.is_ui_visible,
            ui_path=payload.ui_path,
        )
        parent_resource_key = _normalize_optional_upper(payload.parent_resource_key)
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
            resource_key=resource_key,
            resource_name=payload.resource_name,
            resource_type=resource_type,
            resource_group=payload.resource_group,
            description=payload.description,
            http_method=http_method,
            api_path=payload.api_path,
            microservice=payload.microservice,
            is_ui_visible=payload.is_ui_visible,
            is_active=payload.is_active,
            ui_path=ui_path,
            icon=payload.icon,
            sequence_no=payload.sequence_no,
            parent_resource_key=parent_resource_key,
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
        await self._grant_to_platform_super_admin_once(resource.resource_key, allowed_permissions)
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
                "ui_path": resource.ui_path,
                "parent_resource_key": resource.parent_resource_key,
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
            "ui_path": resource.ui_path,
        }
        next_type = (payload.resource_type or resource.resource_type).upper()
        next_is_ui_visible = payload.is_ui_visible if payload.is_ui_visible is not None else resource.is_ui_visible
        next_permissions = (
            normalized_available_permission_keys(
                payload.allowed_permissions,
                resource_type=next_type,
                is_ui_visible=next_is_ui_visible,
            )
            if payload.allowed_permissions is not None
            else normalized_available_permission_keys(
                perms.permissions_json if perms else [],
                resource_type=next_type,
                is_ui_visible=next_is_ui_visible,
            )
        )
        next_http_method = _normalize_optional_upper(payload.http_method) if payload.http_method is not None else resource.http_method
        next_api_path = payload.api_path if payload.api_path is not None else resource.api_path
        next_microservice = payload.microservice if payload.microservice is not None else resource.microservice
        next_sequence_no = payload.sequence_no if payload.sequence_no is not None else resource.sequence_no
        next_name = payload.resource_name or resource.resource_name
        next_key = resource.resource_key
        next_ui_path = _nav_ui_path(
            resource_name=next_name,
            resource_key=next_key,
            resource_type=next_type,
            is_ui_visible=next_is_ui_visible,
            ui_path=payload.ui_path if payload.ui_path is not None else resource.ui_path,
        )
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
                if field == "parent_resource_key":
                    value = _normalize_optional_upper(value)
                setattr(resource, field, value)
        resource.ui_path = next_ui_path
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
