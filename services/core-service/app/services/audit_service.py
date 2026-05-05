from contextvars import ContextVar

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.repositories.audit_repository import AuditRepository

_audit_context: ContextVar[dict[str, str | None]] = ContextVar(
    "audit_context",
    default={"correlation_id": None, "user_agent": None, "ip_address": None},
)


def set_audit_context(*, correlation_id: str | None, user_agent: str | None, ip_address: str | None):
    return _audit_context.set(
        {
            "correlation_id": correlation_id,
            "user_agent": user_agent,
            "ip_address": ip_address,
        }
    )


def reset_audit_context(token) -> None:
    _audit_context.reset(token)


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
        old_value_json: dict | None = None,
        new_value_json: dict | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        correlation_id: str | None = None,
    ) -> None:
        context = _audit_context.get()
        self.repo.add(
            AuditLog(
                at_organization_id=org_id,
                at_user_id=actor_user_id,
                action=action,
                actor_user_id=actor_user_id,
                target_user_id=target_user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                resource_key=resource_key,
                message=message,
                details_json=details_json,
                old_value_json=old_value_json,
                new_value_json=new_value_json,
                ip_address=ip_address or context.get("ip_address"),
                user_agent=user_agent or context.get("user_agent"),
                correlation_id=correlation_id or context.get("correlation_id"),
            )
        )
