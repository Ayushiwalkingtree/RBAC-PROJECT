from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.resource import Resource, ResourcePermission
from app.repositories.permission_repository import PermissionRepository
from app.repositories.resource_repository import ResourceRepository
from app.schemas.resource import ResourceCreate, ResourceUpdate
from app.services.audit_service import AuditService


class ResourceService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = ResourceRepository(session)
        self.permission_repo = PermissionRepository(session)
        self.audit = AuditService(session)

    async def create(self, payload: ResourceCreate, actor_user_id: int) -> Resource:
        if await self.repo.get_by_key(payload.resource_key):
            raise AppError(409, "RESOURCE_KEY_EXISTS", "Resource key already exists")
        resource = Resource(
            resource_key=payload.resource_key.upper(),
            resource_name=payload.resource_name,
            resource_type=payload.resource_type.upper(),
            resource_group=payload.resource_group,
            description=payload.description,
            http_method=payload.http_method,
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
        self.repo.add_permissions(ResourcePermission(resource_id=resource.id, permissions_json=[p.upper() for p in payload.allowed_permissions]))
        await self.audit.write(1, "RESOURCE_CREATED", "RESOURCE", f"{resource.resource_key} created", actor_user_id=actor_user_id, resource_id=str(resource.id), resource_key=resource.resource_key)
        await self.session.commit()
        return resource

    async def update(self, resource_id: int, payload: ResourceUpdate, actor_user_id: int) -> Resource:
        resource = await self.repo.get(resource_id)
        if not resource:
            raise AppError(404, "RESOURCE_NOT_FOUND", "Resource was not found")
        perms = await self.repo.permission_by_resource_id(resource.id)
        if payload.allowed_permissions is not None and perms:
            removed = set(perms.permissions_json) - {p.upper() for p in payload.allowed_permissions}
            for permission in removed:
                if await self.permission_repo.is_permission_in_use(resource.resource_key, permission):
                    raise AppError(409, "PERMISSION_IN_USE", f"{permission} is already granted")
            perms.permissions_json = [p.upper() for p in payload.allowed_permissions]
        for field in ["resource_name", "resource_type", "resource_group", "description", "http_method", "api_path", "microservice", "is_ui_visible", "is_active", "ui_path", "icon", "sequence_no", "parent_resource_key"]:
            value = getattr(payload, field)
            if value is not None:
                setattr(resource, field, value)
        await self.audit.write(1, "RESOURCE_UPDATED", "RESOURCE", f"{resource.resource_key} updated", actor_user_id=actor_user_id, resource_id=str(resource.id), resource_key=resource.resource_key)
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
        await self.audit.write(1, "RESOURCE_UPDATED", "RESOURCE", f"{resource.resource_key} deleted", actor_user_id=actor_user_id, resource_id=str(resource.id), resource_key=resource.resource_key)
        await self.session.commit()
