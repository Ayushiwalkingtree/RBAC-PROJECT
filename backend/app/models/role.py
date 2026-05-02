from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditColumns, Base, int_pk


class Role(Base, AuditColumns):
    __tablename__ = "at_role"
    __table_args__ = (UniqueConstraint("at_organization_id", "role_code", name="uq_role_org_code"),)

    id: Mapped[int_pk]
    at_organization_id: Mapped[int] = mapped_column(ForeignKey("at_organization.id"), index=True)
    role_code: Mapped[str] = mapped_column(String(80))
    role_name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)

    organization = relationship("Organization", back_populates="roles")
    permissions = relationship("RolePermission", back_populates="role", uselist=False)


class RolePermission(Base, AuditColumns):
    __tablename__ = "at_role_permission"

    id: Mapped[int_pk]
    role_id: Mapped[int] = mapped_column(ForeignKey("at_role.id"), unique=True, index=True)
    permissions_json: Mapped[dict[str, list[str]]] = mapped_column(JSONB, default=dict)

    role = relationship("Role", back_populates="permissions")
