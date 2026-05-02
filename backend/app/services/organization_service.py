from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.repositories.organization_repository import OrganizationRepository
from app.schemas.organization import OrganizationUpdate
from app.services.audit_service import AuditService


class OrganizationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = OrganizationRepository(session)
        self.audit = AuditService(session)

    async def update_current(self, org_id: int, payload: OrganizationUpdate, actor_user_id: int) -> object:
        org = await self.repo.get(org_id)
        if not org or org.is_deleted:
            raise AppError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found")
        if payload.org_name is not None:
            org.org_name = payload.org_name
        if payload.timezone is not None:
            org.timezone = payload.timezone
        if payload.logo_url is not None:
            org.logo_url = payload.logo_url
        if payload.support_email is not None:
            org.support_email = str(payload.support_email)
        if payload.allowed_origins is not None:
            org.allowed_origins = ",".join(payload.allowed_origins)
        await self.audit.write(org_id, "ORG_UPDATED", "ORGANIZATION", "Organization updated", actor_user_id=actor_user_id, resource_id=str(org_id))
        await self.session.commit()
        return org
