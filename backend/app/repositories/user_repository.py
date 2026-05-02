from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_email(self, org_id: int, email: str) -> User | None:
        result = await self.session.execute(
            select(User).where(
                User.at_organization_id == org_id,
                User.email == email.lower(),
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

    async def list_scoped(self, org_id: int) -> list[User]:
        result = await self.session.execute(
            select(User).where(User.at_organization_id == org_id, User.is_deleted.is_(False)).order_by(User.full_name)
        )
        return list(result.scalars())

    async def role_ids_for_user(self, user_id: int) -> list[int]:
        result = await self.session.execute(select(UserRole.role_id).where(UserRole.user_id == user_id, UserRole.is_deleted.is_(False)))
        return list(result.scalars())

    def add(self, user: User) -> None:
        self.session.add(user)

    def add_role(self, user_role: UserRole) -> None:
        self.session.add(user_role)
