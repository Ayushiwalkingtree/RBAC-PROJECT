from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.role import Role, RolePermission
from app.models.user import User, UserRole


class RoleRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_code(self, org_id: int, role_code: str) -> Role | None:
        result = await self.session.execute(
            select(Role).where(
                Role.at_organization_id == org_id,
                Role.role_code == role_code.upper(),
                Role.is_deleted.is_(False),
            )
        )
        return result.scalar_one_or_none()

    async def get_scoped(self, org_id: int, role_id: int) -> Role | None:
        result = await self.session.execute(
            select(Role).where(Role.id == role_id, Role.at_organization_id == org_id, Role.is_deleted.is_(False))
        )
        return result.scalar_one_or_none()

    async def list_scoped(self, org_id: int) -> list[Role]:
        result = await self.session.execute(
            select(Role).where(Role.at_organization_id == org_id, Role.is_deleted.is_(False)).order_by(Role.role_code)
        )
        return list(result.scalars())

    async def permissions_for_roles(self, role_ids: list[int]) -> list[RolePermission]:
        if not role_ids:
            return []
        result = await self.session.execute(
            select(RolePermission).where(RolePermission.role_id.in_(role_ids), RolePermission.is_deleted.is_(False))
        )
        return list(result.scalars())

    async def is_assigned_to_active_user(self, role_id: int) -> bool:
        result = await self.session.execute(
            select(UserRole)
            .join(User, User.id == UserRole.user_id)
            .where(UserRole.role_id == role_id, UserRole.is_deleted.is_(False), User.is_active.is_(True), User.is_deleted.is_(False))
            .limit(1)
        )
        return result.scalar_one_or_none() is not None

    def add(self, role: Role) -> None:
        self.session.add(role)

    def add_permissions(self, permissions: RolePermission) -> None:
        self.session.add(permissions)
