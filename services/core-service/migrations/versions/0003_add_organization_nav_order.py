"""add organization nav order

Revision ID: 0003_add_organization_nav_order
Revises: 0002_align_schema_with_lld
Create Date: 2026-05-04
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_add_organization_nav_order"
down_revision = "0002_align_schema_with_lld"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "at_organization_nav_order",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("at_organization_id", sa.Integer(), nullable=False),
        sa.Column("resource_key", sa.String(length=120), nullable=False),
        sa.Column("parent_resource_key", sa.String(length=120), nullable=True),
        sa.Column("sequence_no", sa.Integer(), nullable=False),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["at_organization_id"], ["at_organization.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["at_user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("at_organization_id", "resource_key", name="uq_org_nav_order_resource"),
    )
    op.create_index("ix_at_organization_nav_order_at_organization_id", "at_organization_nav_order", ["at_organization_id"])
    op.create_index("ix_at_organization_nav_order_resource_key", "at_organization_nav_order", ["resource_key"])


def downgrade() -> None:
    op.drop_index("ix_at_organization_nav_order_resource_key", table_name="at_organization_nav_order")
    op.drop_index("ix_at_organization_nav_order_at_organization_id", table_name="at_organization_nav_order")
    op.drop_table("at_organization_nav_order")
