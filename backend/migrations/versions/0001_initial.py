"""initial core rbac schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def audit_columns() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
    ]


def upgrade() -> None:
    op.create_table(
        "at_organization",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("org_code", sa.String(80), nullable=False),
        sa.Column("org_name", sa.String(255), nullable=False),
        sa.Column("timezone", sa.String(80), nullable=False),
        sa.Column("plan", sa.String(40), nullable=False),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("support_email", sa.String(255), nullable=True),
        sa.Column("allowed_origins", sa.String(2000), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        *audit_columns(),
        sa.UniqueConstraint("org_code", name="uq_at_organization_org_code"),
    )
    op.create_table(
        "at_resource",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("resource_key", sa.String(120), nullable=False),
        sa.Column("resource_name", sa.String(255), nullable=False),
        sa.Column("resource_type", sa.String(40), nullable=False),
        sa.Column("resource_group", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("http_method", sa.String(10), nullable=True),
        sa.Column("api_path", sa.String(500), nullable=True),
        sa.Column("microservice", sa.String(120), nullable=True),
        sa.Column("is_ui_visible", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("ui_path", sa.String(500), nullable=True),
        sa.Column("icon", sa.String(80), nullable=True),
        sa.Column("sequence_no", sa.Integer(), nullable=True),
        sa.Column("parent_resource_key", sa.String(120), sa.ForeignKey("at_resource.resource_key"), nullable=True),
        *audit_columns(),
        sa.UniqueConstraint("resource_key", name="uq_at_resource_resource_key"),
    )
    op.create_table(
        "at_resource_permission",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("resource_id", sa.Integer(), sa.ForeignKey("at_resource.id"), nullable=False),
        sa.Column("permissions_json", postgresql.JSONB(), nullable=False),
        *audit_columns(),
        sa.UniqueConstraint("resource_id", name="uq_at_resource_permission_resource_id"),
    )
    op.create_table(
        "at_role",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("at_organization_id", sa.Integer(), sa.ForeignKey("at_organization.id"), nullable=False),
        sa.Column("role_code", sa.String(80), nullable=False),
        sa.Column("role_name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.false()),
        *audit_columns(),
        sa.UniqueConstraint("at_organization_id", "role_code", name="uq_role_org_code"),
    )
    op.create_table(
        "at_role_permission",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("at_role.id"), nullable=False),
        sa.Column("permissions_json", postgresql.JSONB(), nullable=False),
        *audit_columns(),
        sa.UniqueConstraint("role_id", name="uq_at_role_permission_role_id"),
    )
    op.create_table(
        "at_user",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("at_organization_id", sa.Integer(), sa.ForeignKey("at_organization.id"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("title", sa.String(120), nullable=True),
        sa.Column("department", sa.String(120), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_email_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        *audit_columns(),
        sa.UniqueConstraint("at_organization_id", "email", name="uq_user_org_email"),
    )
    op.create_table(
        "at_user_role",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("at_user.id"), nullable=False),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("at_role.id"), nullable=False),
        sa.Column("at_organization_id", sa.Integer(), sa.ForeignKey("at_organization.id"), nullable=False),
        *audit_columns(),
        sa.UniqueConstraint("user_id", "role_id", name="uq_user_role_pair"),
    )
    op.create_table(
        "at_refresh_token",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("at_organization_id", sa.Integer(), sa.ForeignKey("at_organization.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("at_user.id"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rotated_from_id", sa.Integer(), sa.ForeignKey("at_refresh_token.id"), nullable=True),
        sa.Column("user_agent", sa.String(255), nullable=True),
        *audit_columns(),
        sa.UniqueConstraint("token_hash", name="uq_at_refresh_token_token_hash"),
    )
    op.create_table(
        "at_audit_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("at_organization_id", sa.Integer(), sa.ForeignKey("at_organization.id"), nullable=False),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("at_user.id"), nullable=True),
        sa.Column("target_user_id", sa.Integer(), sa.ForeignKey("at_user.id"), nullable=True),
        sa.Column("resource_type", sa.String(80), nullable=False),
        sa.Column("resource_id", sa.String(120), nullable=True),
        sa.Column("resource_key", sa.String(120), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("details_json", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    for table in [
        "at_audit_log",
        "at_refresh_token",
        "at_user_role",
        "at_user",
        "at_role_permission",
        "at_role",
        "at_resource_permission",
        "at_resource",
        "at_organization",
    ]:
        op.drop_table(table)
