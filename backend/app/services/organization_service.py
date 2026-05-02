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
        old_value = {
            "org_name": org.org_name,
            "timezone": org.timezone,
            "logo_url": org.logo_url,
            "support_email": org.support_email,
            "allowed_origins": org.allowed_origins,
            "settings_json": org.settings_json or {},
        }
        settings_json = dict(org.settings_json or {})
        if payload.org_name is not None:
            org.org_name = payload.org_name
        if payload.timezone is not None:
            org.timezone = payload.timezone
            settings_json["timezone"] = payload.timezone
        if payload.logo_url is not None:
            org.logo_url = payload.logo_url
            settings_json["logo_url"] = payload.logo_url
        if payload.support_email is not None:
            org.support_email = str(payload.support_email)
            settings_json["support_email"] = str(payload.support_email)
        if payload.allowed_origins is not None:
            org.allowed_origins = ",".join(payload.allowed_origins)
            settings_json["allowed_origins"] = payload.allowed_origins
        if payload.settings_json is not None:
            settings_json.update(payload.settings_json)
            if "timezone" in payload.settings_json:
                org.timezone = str(payload.settings_json["timezone"])
            if "logo_url" in payload.settings_json:
                org.logo_url = payload.settings_json["logo_url"]
            if "support_email" in payload.settings_json:
                org.support_email = payload.settings_json["support_email"]
            if "allowed_origins" in payload.settings_json and isinstance(payload.settings_json["allowed_origins"], list):
                org.allowed_origins = ",".join(payload.settings_json["allowed_origins"])
        org.settings_json = settings_json
        new_value = {
            "org_name": org.org_name,
            "timezone": org.timezone,
            "logo_url": org.logo_url,
            "support_email": org.support_email,
            "allowed_origins": org.allowed_origins,
            "settings_json": org.settings_json or {},
        }
        await self.audit.write(
            org_id,
            "ORG_UPDATED",
            "ORGANIZATION",
            "Organization updated",
            actor_user_id=actor_user_id,
            resource_id=str(org_id),
            old_value_json=old_value,
            new_value_json=new_value,
        )
        await self.session.commit()
        return org
