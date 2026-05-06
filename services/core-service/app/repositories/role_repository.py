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

    async def get_visible_for_actor(self, org_id: int, role_id: int, actor_user_id: int) -> Role | None:
        result = await self.session.execute(
            select(Role).where(
                Role.id == role_id,
                Role.at_organization_id == org_id,
                Role.is_deleted.is_(False),
                Role.role_code != "SUPER_ADMIN",
                Role.created_by == actor_user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_platform_admin_role(self, org_id: int, role_id: int) -> Role | None:
        result = await self.session.execute(
            select(Role).where(
                Role.id == role_id,
                Role.at_organization_id == org_id,
                Role.is_deleted.is_(False),
                Role.role_code != "SUPER_ADMIN",
                Role.role_code.contains("ADMIN"),
            )
        )
        return result.scalar_one_or_none()

    async def list_scoped(self, org_id: int) -> list[Role]:
        result = await self.session.execute(
            select(Role).where(Role.at_organization_id == org_id, Role.is_deleted.is_(False)).order_by(Role.role_code)
        )
        return list(result.scalars())

    async def list_visible_for_actor(self, org_id: int, actor_user_id: int) -> list[Role]:
        result = await self.session.execute(
            select(Role)
            .where(
                Role.at_organization_id == org_id,
                Role.is_deleted.is_(False),
                Role.role_code != "SUPER_ADMIN",
                Role.created_by == actor_user_id,
            )
            .order_by(Role.role_code)
        )
        return list(result.scalars())

    async def list_platform_admin_roles(self, org_id: int) -> list[Role]:
        result = await self.session.execute(
            select(Role)
            .where(
                Role.at_organization_id == org_id,
                Role.is_deleted.is_(False),
                Role.role_code != "SUPER_ADMIN",
                Role.role_code.contains("ADMIN"),
            )
            .order_by(Role.role_code)
        )
        return list(result.scalars())

    async def permissions_for_roles(self, role_ids: list[int], org_id: int | None = None) -> list[RolePermission]:
        if not role_ids:
            return []
        statement = select(RolePermission).where(RolePermission.role_id.in_(role_ids), RolePermission.is_deleted.is_(False))
        if org_id is not None:
            statement = statement.where(RolePermission.at_organization_id == org_id)
        result = await self.session.execute(
            statement
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
