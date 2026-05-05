from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base, int_pk


class OrganizationNavOrder(Base):
    __tablename__ = "at_organization_nav_order"
    __table_args__ = (UniqueConstraint("at_organization_id", "resource_key", name="uq_org_nav_order_resource"),)

    id: Mapped[int_pk]
    at_organization_id: Mapped[int] = mapped_column(ForeignKey("at_organization.id"), index=True)
    resource_key: Mapped[str] = mapped_column(String(120), index=True)
    parent_resource_key: Mapped[str | None] = mapped_column(String(120), nullable=True)
    sequence_no: Mapped[int] = mapped_column(Integer)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("at_user.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class UserNavOrder(Base):
    __tablename__ = "at_user_nav_order"
    __table_args__ = (UniqueConstraint("at_user_id", "resource_key", name="uq_user_nav_order_resource"),)

    id: Mapped[int_pk]
    user_id: Mapped[int] = mapped_column("at_user_id", ForeignKey("at_user.id"), index=True)
    resource_key: Mapped[str] = mapped_column(String(120), index=True)
    parent_resource_key: Mapped[str | None] = mapped_column(String(120), nullable=True)
    sequence_no: Mapped[int] = mapped_column(Integer)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("at_user.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
