"""add components menu

Revision ID: 0005_add_components_menu
Revises: 0004_add_user_nav_order
Create Date: 2026-05-06
"""

import json

from alembic import op
import sqlalchemy as sa


revision = "0005_add_components_menu"
down_revision = "0004_add_user_nav_order"
branch_labels = None
depends_on = None


components_permissions = ["VIEW", "READ"]


def upgrade() -> None:
    connection = op.get_bind()
    resource = connection.execute(
        sa.text("SELECT id FROM at_resource WHERE resource_key = :resource_key"),
        {"resource_key": "COMPONENTS_MENU"},
    ).first()

    if resource:
        resource_id = resource.id
        connection.execute(
            sa.text(
                """
                UPDATE at_resource
                SET resource_name = :resource_name,
                    resource_type = :resource_type,
                    resource_group = :resource_group,
                    is_ui_visible = true,
                    is_active = true,
                    is_deleted = false,
                    ui_path = :ui_path,
                    icon = :icon,
                    sequence_no = :sequence_no,
                    parent_resource_key = null
                WHERE id = :resource_id
                """
            ),
            {
                "resource_id": resource_id,
                "resource_name": "Components",
                "resource_type": "MENU",
                "resource_group": "SYSTEM",
                "ui_path": "/components",
                "icon": "widgets",
                "sequence_no": 49,
            },
        )
    else:
        resource_id = connection.execute(
            sa.text(
                """
                INSERT INTO at_resource (
                    resource_key,
                    resource_name,
                    resource_type,
                    resource_group,
                    is_ui_visible,
                    is_active,
                    ui_path,
                    icon,
                    sequence_no,
                    parent_resource_key,
                    is_deleted
                )
                VALUES (
                    :resource_key,
                    :resource_name,
                    :resource_type,
                    :resource_group,
                    true,
                    true,
                    :ui_path,
                    :icon,
                    :sequence_no,
                    null,
                    false
                )
                RETURNING id
                """
            ),
            {
                "resource_key": "COMPONENTS_MENU",
                "resource_name": "Components",
                "resource_type": "MENU",
                "resource_group": "SYSTEM",
                "ui_path": "/components",
                "icon": "widgets",
                "sequence_no": 49,
            },
        ).scalar_one()

    permission = connection.execute(
        sa.text("SELECT id FROM at_resource_permission WHERE at_resource_id = :resource_id"),
        {"resource_id": resource_id},
    ).first()
    if permission:
        connection.execute(
            sa.text(
                """
                UPDATE at_resource_permission
                SET resource_key = :resource_key,
                    permissions_json = CAST(:permissions_json AS JSONB),
                    is_active = true,
                    is_deleted = false
                WHERE id = :permission_id
                """
            ),
            {
                "permission_id": permission.id,
                "resource_key": "COMPONENTS_MENU",
                "permissions_json": '["VIEW", "READ"]',
            },
        )
    else:
        connection.execute(
            sa.text(
                """
                INSERT INTO at_resource_permission (
                    at_resource_id,
                    resource_key,
                    permissions_json,
                    is_active,
                    is_deleted
                )
                VALUES (
                    :resource_id,
                    :resource_key,
                    CAST(:permissions_json AS JSONB),
                    true,
                    false
                )
                """
            ),
            {
                "resource_id": resource_id,
                "resource_key": "COMPONENTS_MENU",
                "permissions_json": '["VIEW", "READ"]',
            },
        )

    super_admin = connection.execute(
        sa.text(
            """
            SELECT r.id AS role_id, r.at_organization_id AS org_id, rp.permissions_json AS permissions_json
            FROM at_role r
            JOIN at_organization o ON o.id = r.at_organization_id
            LEFT JOIN at_role_permission rp ON rp.at_role_id = r.id AND rp.is_deleted = false
            WHERE o.org_code = 'PLATFORM'
              AND r.role_code = 'SUPER_ADMIN'
              AND r.is_deleted = false
            """
        )
    ).first()

    if not super_admin:
        return

    existing_permissions = dict(super_admin.permissions_json or {})
    existing_permissions["COMPONENTS_MENU"] = sorted(
        set(existing_permissions.get("COMPONENTS_MENU", [])) | set(components_permissions)
    )

    role_permission = connection.execute(
        sa.text("SELECT id FROM at_role_permission WHERE at_role_id = :role_id"),
        {"role_id": super_admin.role_id},
    ).first()
    if role_permission:
        connection.execute(
            sa.text(
                """
                UPDATE at_role_permission
                SET at_organization_id = :org_id,
                    permissions_json = CAST(:permissions_json AS JSONB),
                    is_deleted = false
                WHERE id = :role_permission_id
                """
            ),
            {
                "role_permission_id": role_permission.id,
                "org_id": super_admin.org_id,
                "permissions_json": json.dumps(existing_permissions),
            },
        )
    else:
        connection.execute(
            sa.text(
                """
                INSERT INTO at_role_permission (
                    at_role_id,
                    at_organization_id,
                    permissions_json,
                    is_deleted
                )
                VALUES (
                    :role_id,
                    :org_id,
                    CAST(:permissions_json AS JSONB),
                    false
                )
                """
            ),
            {
                "role_id": super_admin.role_id,
                "org_id": super_admin.org_id,
                "permissions_json": json.dumps(existing_permissions),
            },
        )


def downgrade() -> None:
    connection = op.get_bind()
    super_admin_permissions = connection.execute(
        sa.text(
            """
            SELECT rp.id, rp.permissions_json
            FROM at_role_permission rp
            JOIN at_role r ON r.id = rp.at_role_id
            JOIN at_organization o ON o.id = r.at_organization_id
            WHERE o.org_code = 'PLATFORM'
              AND r.role_code = 'SUPER_ADMIN'
              AND rp.is_deleted = false
            """
        )
    ).fetchall()
    for row in super_admin_permissions:
        permissions = dict(row.permissions_json or {})
        permissions.pop("COMPONENTS_MENU", None)
        connection.execute(
            sa.text(
                """
                UPDATE at_role_permission
                SET permissions_json = CAST(:permissions_json AS JSONB)
                WHERE id = :role_permission_id
                """
            ),
            {
                "role_permission_id": row.id,
                "permissions_json": json.dumps(permissions),
            },
        )

    connection.execute(sa.text("UPDATE at_resource_permission SET is_deleted = true, is_active = false WHERE resource_key = 'COMPONENTS_MENU'"))
    connection.execute(sa.text("UPDATE at_resource SET is_deleted = true, is_active = false WHERE resource_key = 'COMPONENTS_MENU'"))
