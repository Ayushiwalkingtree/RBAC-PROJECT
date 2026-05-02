from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base, int_pk


class AuditLog(Base):
    __tablename__ = "at_audit_log"

    id: Mapped[int_pk]
    at_organization_id: Mapped[int] = mapped_column(ForeignKey("at_organization.id"), index=True)
    at_user_id: Mapped[int | None] = mapped_column(ForeignKey("at_user.id"), index=True)
    action: Mapped[str] = mapped_column(String(80), index=True)
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("at_user.id"))
    target_user_id: Mapped[int | None] = mapped_column(ForeignKey("at_user.id"))
    resource_type: Mapped[str] = mapped_column(String(80), index=True)
    resource_id: Mapped[str | None] = mapped_column(String(120))
    resource_key: Mapped[str | None] = mapped_column(String(120))
    message: Mapped[str] = mapped_column(Text)
    details_json: Mapped[dict | None] = mapped_column(JSONB)
    old_value_json: Mapped[dict | None] = mapped_column(JSONB)
    new_value_json: Mapped[dict | None] = mapped_column(JSONB)
    ip_address: Mapped[str | None] = mapped_column(String(80))
    user_agent: Mapped[str | None] = mapped_column(String(500))
    correlation_id: Mapped[str | None] = mapped_column(String(120), index=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
