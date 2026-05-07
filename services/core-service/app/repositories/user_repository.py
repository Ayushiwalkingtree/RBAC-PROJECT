from sqlalchemy import and_, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.models.role import Role


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(
            select(User).where(
                func.lower(User.email) == email.lower(),
                User.is_deleted.is_(False),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_email_scoped(self, org_id: int, email: str) -> User | None:
        result = await self.session.execute(
            select(User).where(
                User.at_organization_id == org_id,
                func.lower(User.email) == email.lower(),
                User.is_deleted.is_(False),
            )
        )
        return result.scalar_one_or_none()

    async def get_scoped(self, org_id: int, user_id: int) -> User | None:
        result = await self.session.execute(
            select(User).where(
                User.id == user_id,
                User.at_organization_id == org_id,
                User.is_deleted.is_(False),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self.session.execute(select(User).where(User.id == user_id, User.is_deleted.is_(False)))
        return result.scalar_one_or_none()

    async def list_scoped(self, org_id: int) -> list[User]:
        result = await self.session.execute(
            select(User).where(User.at_organization_id == org_id, User.is_deleted.is_(False)).order_by(User.full_name)
        )
        return list(result.scalars())

    async def get_visible_for_actor(self, org_id: int, user_id: int, actor_user_id: int) -> User | None:
        result = await self.session.execute(
            self._visible_for_actor_statement(org_id, actor_user_id).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def list_visible_for_actor(self, org_id: int, actor_user_id: int) -> list[User]:
        result = await self.session.execute(
            self._visible_for_actor_statement(org_id, actor_user_id).order_by(User.full_name)
        )
        return list(result.scalars().unique())

    def _visible_for_actor_statement(self, org_id: int, actor_user_id: int):
        super_admin_assignment = (
            select(UserRole.id)
            .join(Role, Role.id == UserRole.role_id)
            .where(
                UserRole.user_id == User.id,
                UserRole.at_organization_id == org_id,
                UserRole.is_deleted.is_(False),
                Role.at_organization_id == org_id,
                Role.is_deleted.is_(False),
                Role.role_code == "SUPER_ADMIN",
            )
            .exists()
        )
        return (
            select(User)
            .outerjoin(
                UserRole,
                and_(
                    UserRole.user_id == User.id,
                    UserRole.at_organization_id == org_id,
                    UserRole.is_deleted.is_(False),
                ),
            )
            .where(
                User.at_organization_id == org_id,
                User.is_deleted.is_(False),
                User.id != actor_user_id,
                or_(User.created_by == actor_user_id, UserRole.assigned_by == actor_user_id),
                ~super_admin_assignment,
            )
            .distinct()
        )

    async def role_ids_for_user(self, user_id: int, org_id: int | None = None) -> list[int]:
        statement = select(UserRole.role_id).where(UserRole.user_id == user_id, UserRole.is_deleted.is_(False))
        if org_id is not None:
            statement = statement.where(UserRole.at_organization_id == org_id)
        result = await self.session.execute(statement)
        return list(result.scalars())

    def add(self, user: User) -> None:
        self.session.add(user)

    def add_role(self, user_role: UserRole) -> None:
        self.session.add(user_role)
