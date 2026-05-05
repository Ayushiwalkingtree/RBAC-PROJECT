from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import NAV_TYPES
from app.models.resource import Resource, ResourcePermission
from app.models.role import RolePermission
from app.utils.permission_normalization import normalize_available_permissions, normalize_role_permissions


class PermissionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    @staticmethod
    def permission_keys(permissions: list) -> set[str]:
        return {permission["key"] for permission in normalize_available_permissions(permissions)}

    async def allowed_permission_map(self) -> dict[str, set[str]]:
        result = await self.session.execute(
            select(Resource.resource_key, Resource.resource_type, Resource.is_ui_visible, ResourcePermission.permissions_json)
            .join(ResourcePermission, ResourcePermission.resource_id == Resource.id)
            .where(Resource.is_deleted.is_(False), ResourcePermission.is_deleted.is_(False))
        )
        allowed: dict[str, set[str]] = {}
        for key, resource_type, is_ui_visible, values in result.all():
            permission_keys = self.permission_keys(values)
            if not permission_keys and is_ui_visible and resource_type in NAV_TYPES:
                permission_keys = {"VIEW"}
            allowed[key] = permission_keys
        return allowed

    async def get_role_permission(self, role_id: int) -> RolePermission | None:
        result = await self.session.execute(
            select(RolePermission).where(RolePermission.role_id == role_id, RolePermission.is_deleted.is_(False))
        )
        return result.scalar_one_or_none()

    async def is_permission_in_use(self, resource_key: str, permission_key: str) -> bool:
        result = await self.session.execute(
            select(RolePermission).where(RolePermission.is_deleted.is_(False))
        )
        return any(
            permission_key.upper() in normalize_role_permissions(perms.permissions_json).get(resource_key.upper(), [])
            for perms in result.scalars()
        )
