from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditColumns, Base, int_pk


class User(Base, AuditColumns):
    __tablename__ = "at_user"
    __table_args__ = (UniqueConstraint("at_organization_id", "email", name="uq_user_org_email"),)

    id: Mapped[int_pk]
    at_organization_id: Mapped[int] = mapped_column(ForeignKey("at_organization.id"), index=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    title: Mapped[str | None] = mapped_column(String(120))
    department: Mapped[str | None] = mapped_column(String(120))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    failed_attempts: Mapped[int] = mapped_column(default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    organization = relationship("Organization", back_populates="users")
    roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")


class UserRole(Base, AuditColumns):
    __tablename__ = "at_user_role"
    __table_args__ = (UniqueConstraint("user_id", "role_id", name="uq_user_role_pair"),)

    id: Mapped[int_pk]
    user_id: Mapped[int] = mapped_column(ForeignKey("at_user.id"), index=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("at_role.id"), index=True)
    at_organization_id: Mapped[int] = mapped_column(ForeignKey("at_organization.id"), index=True)

    user = relationship("User", back_populates="roles")
    role = relationship("Role")
