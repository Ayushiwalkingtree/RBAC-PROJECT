"""align schema with lld

Revision ID: 0002_align_schema_with_lld
Revises: 0001_initial
Create Date: 2026-05-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002_align_schema_with_lld"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "at_organization",
        sa.Column("settings_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    op.add_column("at_organization", sa.Column("subscription_ends_at", sa.DateTime(timezone=True), nullable=True))
    op.execute(
        """
        UPDATE at_organization
        SET settings_json = jsonb_strip_nulls(
            jsonb_build_object(
                'timezone', timezone,
                'logo_url', logo_url,
                'support_email', support_email,
                'allowed_origins',
                    CASE
                        WHEN allowed_origins IS NULL OR allowed_origins = '' THEN '[]'::jsonb
                        ELSE to_jsonb(string_to_array(allowed_origins, ','))
                    END
            )
        )
        WHERE settings_json = '{}'::jsonb
        """
    )

    op.add_column("at_resource_permission", sa.Column("resource_key", sa.String(length=120), nullable=True))
    op.add_column(
        "at_resource_permission",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.alter_column("at_resource_permission", "resource_id", new_column_name="at_resource_id")
    op.execute(
        """
        UPDATE at_resource_permission rp
        SET resource_key = r.resource_key
        FROM at_resource r
        WHERE rp.at_resource_id = r.id
        """
    )
    op.alter_column("at_resource_permission", "resource_key", nullable=False)
    op.alter_column(
        "at_resource_permission",
        "permissions_json",
        server_default=sa.text("'[]'::jsonb"),
        existing_type=postgresql.JSONB(),
    )
    op.create_index("ix_at_resource_permission_resource_key", "at_resource_permission", ["resource_key"])

    op.add_column(
        "at_role",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.alter_column("at_role_permission", "role_id", new_column_name="at_role_id")
    op.add_column("at_role_permission", sa.Column("at_organization_id", sa.Integer(), nullable=True))
    op.execute(
        """
        UPDATE at_role_permission rp
        SET at_organization_id = r.at_organization_id
        FROM at_role r
        WHERE rp.at_role_id = r.id
        """
    )
    op.alter_column("at_role_permission", "at_organization_id", nullable=False)
    op.create_foreign_key(
        "fk_at_role_permission_at_organization_id_at_organization",
        "at_role_permission",
        "at_organization",
        ["at_organization_id"],
        ["id"],
    )
    op.alter_column(
        "at_role_permission",
        "permissions_json",
        server_default=sa.text("'{}'::jsonb"),
        existing_type=postgresql.JSONB(),
    )
    op.create_index("ix_at_role_permission_at_organization_id", "at_role_permission", ["at_organization_id"])

    op.add_column("at_user", sa.Column("phone", sa.String(length=40), nullable=True))
    op.add_column(
        "at_user",
        sa.Column("mfa_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("at_user", sa.Column("mfa_secret_enc", sa.String(length=500), nullable=True))
    op.add_column("at_user", sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE at_user SET password_changed_at = created_at WHERE password_changed_at IS NULL")

    op.alter_column("at_user_role", "user_id", new_column_name="at_user_id")
    op.alter_column("at_user_role", "role_id", new_column_name="at_role_id")
    op.add_column(
        "at_user_role",
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.add_column("at_user_role", sa.Column("assigned_by", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_at_user_role_assigned_by_at_user",
        "at_user_role",
        "at_user",
        ["assigned_by"],
        ["id"],
    )

    op.alter_column("at_refresh_token", "user_id", new_column_name="at_user_id")
    op.add_column(
        "at_refresh_token",
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.add_column("at_refresh_token", sa.Column("device_info", sa.String(length=500), nullable=True))
    op.execute("UPDATE at_refresh_token SET device_info = user_agent WHERE device_info IS NULL")
    op.create_index("ix_at_refresh_token_at_user_id_revoked_at", "at_refresh_token", ["at_user_id", "revoked_at"])

    op.add_column("at_audit_log", sa.Column("at_user_id", sa.Integer(), nullable=True))
    op.add_column("at_audit_log", sa.Column("old_value_json", postgresql.JSONB(), nullable=True))
    op.add_column("at_audit_log", sa.Column("new_value_json", postgresql.JSONB(), nullable=True))
    op.add_column("at_audit_log", sa.Column("ip_address", sa.String(length=80), nullable=True))
    op.add_column("at_audit_log", sa.Column("user_agent", sa.String(length=500), nullable=True))
    op.add_column("at_audit_log", sa.Column("correlation_id", sa.String(length=120), nullable=True))
    op.execute("UPDATE at_audit_log SET at_user_id = actor_user_id WHERE at_user_id IS NULL")
    op.create_foreign_key(
        "fk_at_audit_log_at_user_id_at_user",
        "at_audit_log",
        "at_user",
        ["at_user_id"],
        ["id"],
    )
    op.create_index("ix_at_audit_log_at_user_id", "at_audit_log", ["at_user_id"])
    op.create_index("ix_at_audit_log_action", "at_audit_log", ["action"])
    op.create_index("ix_at_audit_log_correlation_id", "at_audit_log", ["correlation_id"])
    op.execute(
        "CREATE INDEX ix_at_audit_log_org_created_desc "
        "ON at_audit_log (at_organization_id, created_at DESC)"
    )


def downgrade() -> None:
    op.drop_index("ix_at_audit_log_org_created_desc", table_name="at_audit_log")
    op.drop_index("ix_at_audit_log_correlation_id", table_name="at_audit_log")
    op.drop_index("ix_at_audit_log_action", table_name="at_audit_log")
    op.drop_index("ix_at_audit_log_at_user_id", table_name="at_audit_log")
    op.drop_constraint("fk_at_audit_log_at_user_id_at_user", "at_audit_log", type_="foreignkey")
    op.drop_column("at_audit_log", "correlation_id")
    op.drop_column("at_audit_log", "user_agent")
    op.drop_column("at_audit_log", "ip_address")
    op.drop_column("at_audit_log", "new_value_json")
    op.drop_column("at_audit_log", "old_value_json")
    op.drop_column("at_audit_log", "at_user_id")

    op.drop_index("ix_at_refresh_token_at_user_id_revoked_at", table_name="at_refresh_token")
    op.drop_column("at_refresh_token", "device_info")
    op.drop_column("at_refresh_token", "issued_at")
    op.alter_column("at_refresh_token", "at_user_id", new_column_name="user_id")

    op.drop_constraint("fk_at_user_role_assigned_by_at_user", "at_user_role", type_="foreignkey")
    op.drop_column("at_user_role", "assigned_by")
    op.drop_column("at_user_role", "assigned_at")
    op.alter_column("at_user_role", "at_role_id", new_column_name="role_id")
    op.alter_column("at_user_role", "at_user_id", new_column_name="user_id")

    op.drop_column("at_user", "password_changed_at")
    op.drop_column("at_user", "mfa_secret_enc")
    op.drop_column("at_user", "mfa_enabled")
    op.drop_column("at_user", "phone")

    op.drop_index("ix_at_role_permission_at_organization_id", table_name="at_role_permission")
    op.drop_constraint("fk_at_role_permission_at_organization_id_at_organization", "at_role_permission", type_="foreignkey")
    op.drop_column("at_role_permission", "at_organization_id")
    op.alter_column("at_role_permission", "at_role_id", new_column_name="role_id")

    op.drop_column("at_role", "is_active")

    op.drop_index("ix_at_resource_permission_resource_key", table_name="at_resource_permission")
    op.alter_column("at_resource_permission", "at_resource_id", new_column_name="resource_id")
    op.drop_column("at_resource_permission", "is_active")
    op.drop_column("at_resource_permission", "resource_key")

    op.drop_column("at_organization", "subscription_ends_at")
    op.drop_column("at_organization", "settings_json")
