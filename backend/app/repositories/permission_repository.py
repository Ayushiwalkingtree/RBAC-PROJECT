from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.resource import Resource, ResourcePermission
from app.models.role import RolePermission


class PermissionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def allowed_permission_map(self) -> dict[str, set[str]]:
        result = await self.session.execute(
            select(Resource.resource_key, ResourcePermission.permissions_json)
            .join(ResourcePermission, ResourcePermission.resource_id == Resource.id)
            .where(Resource.is_deleted.is_(False), ResourcePermission.is_deleted.is_(False))
        )
        return {key: {item.upper() for item in values} for key, values in result.all()}

    async def get_role_permission(self, role_id: int) -> RolePermission | None:
        result = await self.session.execute(
            select(RolePermission).where(RolePermission.role_id == role_id, RolePermission.is_deleted.is_(False))
        )
        return result.scalar_one_or_none()

    async def is_permission_in_use(self, resource_key: str, permission_key: str) -> bool:
        result = await self.session.execute(
            select(RolePermission).where(RolePermission.is_deleted.is_(False))
        )
        return any(permission_key in perms.permissions_json.get(resource_key, []) for perms in result.scalars())
