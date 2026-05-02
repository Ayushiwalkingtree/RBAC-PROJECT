from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.resource import Resource, ResourcePermission


class ResourceRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_key(self, resource_key: str) -> Resource | None:
        result = await self.session.execute(
            select(Resource).where(Resource.resource_key == resource_key.upper(), Resource.is_deleted.is_(False))
        )
        return result.scalar_one_or_none()

    async def get(self, resource_id: int) -> Resource | None:
        result = await self.session.execute(select(Resource).where(Resource.id == resource_id, Resource.is_deleted.is_(False)))
        return result.scalar_one_or_none()

    async def list_active(self) -> list[Resource]:
        result = await self.session.execute(select(Resource).where(Resource.is_deleted.is_(False)).order_by(Resource.sequence_no, Resource.resource_key))
        return list(result.scalars())

    async def permission_by_resource_id(self, resource_id: int) -> ResourcePermission | None:
        result = await self.session.execute(
            select(ResourcePermission).where(ResourcePermission.resource_id == resource_id, ResourcePermission.is_deleted.is_(False))
        )
        return result.scalar_one_or_none()

    def add(self, resource: Resource) -> None:
        self.session.add(resource)

    def add_permissions(self, permissions: ResourcePermission) -> None:
        self.session.add(permissions)
