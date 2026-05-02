from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.repositories.audit_repository import AuditRepository


class AuditService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = AuditRepository(session)

    async def write(
        self,
        org_id: int,
        action: str,
        resource_type: str,
        message: str,
        *,
        actor_user_id: int | None = None,
        target_user_id: int | None = None,
        resource_id: str | None = None,
        resource_key: str | None = None,
        details_json: dict | None = None,
    ) -> None:
        self.repo.add(
            AuditLog(
                at_organization_id=org_id,
                action=action,
                actor_user_id=actor_user_id,
                target_user_id=target_user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                resource_key=resource_key,
                message=message,
                details_json=details_json,
            )
        )
