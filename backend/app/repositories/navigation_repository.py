from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.navigation import OrganizationNavOrder, UserNavOrder


class NavigationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_overrides(self, org_id: int) -> list[OrganizationNavOrder]:
        result = await self.session.execute(
            select(OrganizationNavOrder).where(OrganizationNavOrder.at_organization_id == org_id)
        )
        return list(result.scalars())

    async def override_map(self, org_id: int) -> dict[str, dict]:
        overrides = await self.list_overrides(org_id)
        return {
            override.resource_key: {
                "parent_resource_key": override.parent_resource_key,
                "sequence_no": override.sequence_no,
            }
            for override in overrides
        }

    async def get_override(self, org_id: int, resource_key: str) -> OrganizationNavOrder | None:
        result = await self.session.execute(
            select(OrganizationNavOrder).where(
                OrganizationNavOrder.at_organization_id == org_id,
                OrganizationNavOrder.resource_key == resource_key,
            )
        )
        return result.scalar_one_or_none()

    async def list_user_overrides(self, user_id: int) -> list[UserNavOrder]:
        result = await self.session.execute(select(UserNavOrder).where(UserNavOrder.user_id == user_id))
        return list(result.scalars())

    async def user_override_map(self, user_id: int) -> dict[str, dict]:
        overrides = await self.list_user_overrides(user_id)
        return {
            override.resource_key: {
                "parent_resource_key": override.parent_resource_key,
                "sequence_no": override.sequence_no,
            }
            for override in overrides
        }

    async def combined_override_map(self, org_id: int, user_id: int) -> dict[str, dict]:
        overrides = await self.override_map(org_id)
        overrides.update(await self.user_override_map(user_id))
        return overrides

    async def get_user_override(self, user_id: int, resource_key: str) -> UserNavOrder | None:
        result = await self.session.execute(
            select(UserNavOrder).where(
                UserNavOrder.user_id == user_id,
                UserNavOrder.resource_key == resource_key,
            )
        )
        return result.scalar_one_or_none()
