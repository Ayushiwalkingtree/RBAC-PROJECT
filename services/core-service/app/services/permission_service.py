from sqlalchemy import nullslast, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.rbac import NAV_TYPES
from app.models.resource import Resource, ResourcePermission
from app.models.role import RolePermission
from app.repositories.permission_repository import PermissionRepository
from app.repositories.role_repository import RoleRepository
from app.services.audit_service import AuditService
from app.utils.permission_normalization import normalize_available_permissions, normalize_role_permissions


class PermissionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.role_repo = RoleRepository(session)
        self.permission_repo = PermissionRepository(session)
        self.audit = AuditService(session)

    async def get_role_permissions(
        self,
        org_id: int,
        role_id: int,
        *,
        visible_permissions: dict[str, list[str]] | None = None,
        include_all_resources: bool = False,
        include_all_permission_keys: bool = False,
    ):
        role = await self.role_repo.get_scoped(org_id, role_id)
        if not role:
            raise AppError(404, "ROLE_NOT_FOUND", "Role was not found")
        role_permissions = await self.permission_repo.get_role_permission(role.id)
        grants = normalize_role_permissions(role_permissions.permissions_json if role_permissions else None)
        result = await self.session.execute(
            select(Resource, ResourcePermission.permissions_json)
            .outerjoin(
                ResourcePermission,
                (ResourcePermission.resource_id == Resource.id) & (ResourcePermission.is_deleted.is_(False)),
            )
            .where(Resource.is_deleted.is_(False), Resource.is_active.is_(True))
            .order_by(nullslast(Resource.sequence_no.asc()), Resource.id.asc())
        )
        resources = []
        for resource, available_permissions_raw in result.all():
            visible_keys = (visible_permissions or {}).get(resource.resource_key, [])
            if not include_all_resources and not visible_keys:
                continue
            granted_permissions = set(grants.get(resource.resource_key.upper(), []))
            available_permissions = normalize_available_permissions(available_permissions_raw)
            if not available_permissions and resource.is_ui_visible and resource.resource_type in NAV_TYPES:
                available_permissions = [{"key": "VIEW", "label": "View"}]
            if not include_all_permission_keys:
                allowed_keys = set((visible_permissions or {}).get(resource.resource_key, []))
                available_permissions = [
                    permission for permission in available_permissions if permission["key"] in allowed_keys
                ]
            resources.append(
                {
                    "resource_id": resource.id,
                    "resource_key": resource.resource_key,
                    "resource_name": resource.resource_name,
                    "resource_type": resource.resource_type,
                    "resource_group": resource.resource_group,
                    "description": resource.description,
                    "sequence_no": resource.sequence_no,
                    "parent_resource_key": resource.parent_resource_key,
                    "http_method": resource.http_method,
                    "api_path": resource.api_path,
                    "microservice": resource.microservice,
                    "is_ui_visible": resource.is_ui_visible,
                    "available_permissions": [
                        {
                            **permission,
                            "granted": permission["key"] in granted_permissions,
                        }
                        for permission in available_permissions
                    ],
                }
            )
        return {
            "role_id": role.id,
            "role_code": role.role_code,
            "resources": resources,
            "permissions_json": grants,
        }

    async def replace_role_permissions(
        self,
        org_id: int,
        role_id: int,
        permissions_json: dict[str, list[str]],
        actor_user_id: int,
        *,
        grantable_permissions: dict[str, list[str]] | None = None,
        include_all_grants: bool = False,
    ):
        role = await self.role_repo.get_scoped(org_id, role_id)
        if not role:
            raise AppError(404, "ROLE_NOT_FOUND", "Role was not found")
        normalized_permissions = normalize_role_permissions(permissions_json)
        allowed = await self.permission_repo.allowed_permission_map()
        for resource_key, permissions in normalized_permissions.items():
            if resource_key not in allowed:
                raise AppError(422, "INVALID_RESOURCE", f"Unknown resource {resource_key}")
            invalid = [permission for permission in permissions if permission not in allowed[resource_key]]
            if invalid:
                raise AppError(422, "INVALID_PERMISSION", f"Invalid permissions for {resource_key}: {invalid}")
            if not include_all_grants:
                grantable = set((grantable_permissions or {}).get(resource_key, []))
                blocked = [permission for permission in permissions if permission not in grantable]
                if blocked:
                    raise AppError(
                        403,
                        "PERMISSION_BOUNDARY_EXCEEDED",
                        f"Cannot grant permissions not assigned to current admin for {resource_key}: {blocked}",
                    )
        role_permissions = await self.permission_repo.get_role_permission(role.id)
        if not role_permissions:
            role_permissions = RolePermission(role_id=role.id, at_organization_id=org_id, permissions_json={})
            self.session.add(role_permissions)
            await self.session.flush()
        old_permissions = normalize_role_permissions(role_permissions.permissions_json)
        role_permissions.permissions_json = normalized_permissions
        role_permissions.at_organization_id = org_id
        role_permissions.updated_by = actor_user_id
        await self.audit.write(
            org_id,
            "PERM_GRANTED",
            "ROLE_PERMISSION",
            f"Permissions updated for {role.role_code}",
            actor_user_id=actor_user_id,
            resource_id=str(role_id),
            old_value_json=old_permissions,
            new_value_json=role_permissions.permissions_json,
        )
        await self.session.commit()
        return await self.get_role_permissions(org_id, role_id, include_all_resources=True, include_all_permission_keys=True)
