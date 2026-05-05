from datetime import date, datetime, time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


class AuditRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    def add(self, log: AuditLog) -> None:
        self.session.add(log)

    async def list_scoped(
        self,
        org_id: int,
        *,
        action: str | None = None,
        resource_type: str | None = None,
        user_id: int | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[AuditLog]:
        stmt = select(AuditLog).where(AuditLog.at_organization_id == org_id)
        if action:
            stmt = stmt.where(AuditLog.action == action)
        if resource_type:
            stmt = stmt.where(AuditLog.resource_type == resource_type)
        if user_id:
            stmt = stmt.where(
                (AuditLog.at_user_id == user_id)
                | (AuditLog.actor_user_id == user_id)
                | (AuditLog.target_user_id == user_id)
            )
        if date_from:
            stmt = stmt.where(AuditLog.created_at >= datetime.combine(date_from, time.min))
        if date_to:
            stmt = stmt.where(AuditLog.created_at <= datetime.combine(date_to, time.max))
        result = await self.session.execute(stmt.order_by(AuditLog.created_at.desc()))
        return list(result.scalars())
