from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditColumns, Base, int_pk


class Resource(Base, AuditColumns):
    __tablename__ = "at_resource"

    id: Mapped[int_pk]
    resource_key: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    resource_name: Mapped[str] = mapped_column(String(255))
    resource_type: Mapped[str] = mapped_column(String(40))
    resource_group: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)
    http_method: Mapped[str | None] = mapped_column(String(10))
    api_path: Mapped[str | None] = mapped_column(String(500))
    microservice: Mapped[str | None] = mapped_column(String(120))
    is_ui_visible: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    ui_path: Mapped[str | None] = mapped_column(String(500))
    icon: Mapped[str | None] = mapped_column(String(80))
    sequence_no: Mapped[int | None] = mapped_column(Integer)
    parent_resource_key: Mapped[str | None] = mapped_column(String(120), ForeignKey("at_resource.resource_key"))

    permissions = relationship("ResourcePermission", back_populates="resource", uselist=False)


class ResourcePermission(Base, AuditColumns):
    __tablename__ = "at_resource_permission"

    id: Mapped[int_pk]
    resource_id: Mapped[int] = mapped_column("at_resource_id", ForeignKey("at_resource.id"), unique=True, index=True)
    resource_key: Mapped[str] = mapped_column(String(120), index=True)
    permissions_json: Mapped[list] = mapped_column(JSONB, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    resource = relationship("Resource", back_populates="permissions")
