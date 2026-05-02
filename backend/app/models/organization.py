from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditColumns, Base, int_pk


class Organization(Base, AuditColumns):
    __tablename__ = "at_organization"

    id: Mapped[int_pk]
    org_code: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    org_name: Mapped[str] = mapped_column(String(255))
    timezone: Mapped[str] = mapped_column(String(80), default="UTC")
    plan: Mapped[str] = mapped_column(String(40), default="STARTER")
    logo_url: Mapped[str | None] = mapped_column(String(500))
    support_email: Mapped[str | None] = mapped_column(String(255))
    allowed_origins: Mapped[str | None] = mapped_column(String(2000))
    settings_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    subscription_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    users = relationship("User", back_populates="organization")
    roles = relationship("Role", back_populates="organization")
