from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization


class OrganizationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_code(self, org_code: str) -> Organization | None:
        result = await self.session.execute(
            select(Organization).where(
                Organization.org_code == org_code.upper(),
                Organization.is_deleted.is_(False),
            )
        )
        return result.scalar_one_or_none()

    async def get(self, org_id: int) -> Organization | None:
        return await self.session.get(Organization, org_id)

    async def list_public(self) -> list[Organization]:
        result = await self.session.execute(
            select(Organization)
            .where(Organization.is_active.is_(True), Organization.is_deleted.is_(False))
            .order_by(Organization.org_name)
        )
        return list(result.scalars())

    def add(self, organization: Organization) -> None:
        self.session.add(organization)
