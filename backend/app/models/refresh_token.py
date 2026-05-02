from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import AuditColumns, Base, int_pk


class RefreshToken(Base, AuditColumns):
    __tablename__ = "at_refresh_token"

    id: Mapped[int_pk]
    at_organization_id: Mapped[int] = mapped_column(ForeignKey("at_organization.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("at_user.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rotated_from_id: Mapped[int | None] = mapped_column(ForeignKey("at_refresh_token.id"))
    user_agent: Mapped[str | None] = mapped_column(String(255))
