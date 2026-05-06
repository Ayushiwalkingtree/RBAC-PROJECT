"""add workflow runtime resources

Revision ID: 0006_add_workflow_resources
Revises: 0005_add_components_menu
Create Date: 2026-05-06
"""

import json

from alembic import op
import sqlalchemy as sa


revision = "0006_add_workflow_resources"
down_revision = "0005_add_components_menu"
branch_labels = None
depends_on = None


VIEW_PERMISSION = [{"key": "VIEW", "label": "View"}]

WORKFLOW_RESOURCES: list[dict] = [
    {
        "resource_key": "WORKFLOW_MENU",
        "resource_name": "Workflow",
        "resource_type": "MENU",
        "resource_group": "Workflow",
        "permissions": VIEW_PERMISSION,
        "is_ui_visible": True,
        "ui_path": "/workflow/tasks",
        "icon": "workflow",
        "sequence_no": 45,
    },
    {
        "resource_key": "WORKFLOW_START_MENU",
        "resource_name": "Start Task Workflow",
        "resource_type": "MENU",
        "resource_group": "Workflow",
        "permissions": VIEW_PERMISSION,
        "is_ui_visible": True,
        "ui_path": "/workflow/start",
        "icon": "workflow",
        "parent_resource_key": "WORKFLOW_MENU",
        "sequence_no": 10,
    },
    {
        "resource_key": "WORKFLOW_TASKS_MENU",
        "resource_name": "My Pending Tasks",
        "resource_type": "MENU",
        "resource_group": "Workflow",
        "permissions": VIEW_PERMISSION,
        "is_ui_visible": True,
        "ui_path": "/workflow/tasks",
        "icon": "workflow",
        "parent_resource_key": "WORKFLOW_MENU",
        "sequence_no": 20,
    },
    {
        "resource_key": "WORKFLOW_INSTANCES_MENU",
        "resource_name": "Workflow Instances",
        "resource_type": "MENU",
        "resource_group": "Workflow",
        "permissions": VIEW_PERMISSION,
        "is_ui_visible": True,
        "ui_path": "/workflow/instances",
        "icon": "workflow",
        "parent_resource_key": "WORKFLOW_MENU",
        "sequence_no": 30,
    },
    {
        "resource_key": "WORKFLOW_START_API",
        "resource_name": "Start Workflow API",
        "resource_type": "API",
        "resource_group": "Workflow",
        "permissions": ["EXECUTE"],
        "http_method": "POST",
        "api_path": "/api/v1/workflow-runtime/start",
        "microservice": "workflow-service",
    },
    {
        "resource_key": "WORKFLOW_PENDING_TASKS_API",
        "resource_name": "Pending Workflow Tasks API",
        "resource_type": "API",
        "resource_group": "Workflow",
        "permissions": ["READ"],
        "http_method": "GET",
        "api_path": "/api/v1/workflow-runtime/tasks/pending",
        "microservice": "workflow-service",
    },
    {
        "resource_key": "WORKFLOW_TASK_DETAIL_API",
        "resource_name": "Workflow Task Detail API",
        "resource_type": "API",
        "resource_group": "Workflow",
        "permissions": ["READ"],
        "http_method": "GET",
        "api_path": "/api/v1/workflow-runtime/tasks/{task_id}",
        "microservice": "workflow-service",
    },
    {
        "resource_key": "WORKFLOW_TASK_ACTION_API",
        "resource_name": "Workflow Task Action API",
        "resource_type": "API",
        "resource_group": "Workflow",
        "permissions": ["APPROVE", "REJECT", "RETURN"],
        "http_method": "POST",
        "api_path": "/api/v1/workflow-runtime/tasks/{task_id}/action",
        "microservice": "workflow-service",
    },
    {
        "resource_key": "WORKFLOW_TASK_CLAIM_API",
        "resource_name": "Workflow Task Claim API",
        "resource_type": "API",
        "resource_group": "Workflow",
        "permissions": ["EXECUTE"],
        "http_method": "POST",
        "api_path": "/api/v1/workflow-runtime/tasks/{task_id}/claim",
        "microservice": "workflow-service",
    },
    {
        "resource_key": "WORKFLOW_TASK_REMINDER_API",
        "resource_name": "Workflow Task Reminder API",
        "resource_type": "API",
        "resource_group": "Workflow",
        "permissions": ["EXECUTE"],
        "http_method": "POST",
        "api_path": "/api/v1/workflow-runtime/tasks/{task_id}/reminder",
        "microservice": "workflow-service",
    },
    {
        "resource_key": "WORKFLOW_INSTANCE_DETAIL_API",
        "resource_name": "Workflow Instance Detail API",
        "resource_type": "API",
        "resource_group": "Workflow",
        "permissions": ["READ"],
        "http_method": "GET",
        "api_path": "/api/v1/workflow-runtime/instances/{instance_id}",
        "microservice": "workflow-service",
    },
    {
        "resource_key": "WORKFLOW_APPROVE_BTN",
        "resource_name": "Approve Task",
        "resource_type": "BUTTON",
        "resource_group": "Workflow",
        "permissions": VIEW_PERMISSION,
        "parent_resource_key": "WORKFLOW_TASKS_MENU",
    },
    {
        "resource_key": "WORKFLOW_REJECT_BTN",
        "resource_name": "Reject Task",
        "resource_type": "BUTTON",
        "resource_group": "Workflow",
        "permissions": VIEW_PERMISSION,
        "parent_resource_key": "WORKFLOW_TASKS_MENU",
    },
    {
        "resource_key": "WORKFLOW_CLAIM_BTN",
        "resource_name": "Claim Task",
        "resource_type": "BUTTON",
        "resource_group": "Workflow",
        "permissions": VIEW_PERMISSION,
        "parent_resource_key": "WORKFLOW_TASKS_MENU",
    },
    {
        "resource_key": "WORKFLOW_REMINDER_BTN",
        "resource_name": "Send Reminder",
        "resource_type": "BUTTON",
        "resource_group": "Workflow",
        "permissions": VIEW_PERMISSION,
        "parent_resource_key": "WORKFLOW_TASKS_MENU",
    },
]


def permission_keys(permissions: list) -> list[str]:
    keys: list[str] = []
    for permission in permissions:
        key = permission.get("key") if isinstance(permission, dict) else permission
        if key:
            keys.append(str(key).upper())
    return keys


def workflow_permissions() -> dict[str, list[str]]:
    return {item["resource_key"]: permission_keys(item["permissions"]) for item in WORKFLOW_RESOURCES}


def upsert_resource(connection, item: dict) -> None:
    permissions = item["permissions"]
    params = {
        "resource_key": item["resource_key"],
        "resource_name": item["resource_name"],
        "resource_type": item["resource_type"],
        "resource_group": item["resource_group"],
        "description": item.get("description"),
        "http_method": item.get("http_method"),
        "api_path": item.get("api_path"),
        "microservice": item.get("microservice"),
        "is_ui_visible": item.get("is_ui_visible", False),
        "ui_path": item.get("ui_path"),
        "icon": item.get("icon"),
        "sequence_no": item.get("sequence_no"),
        "parent_resource_key": item.get("parent_resource_key"),
    }
    resource = connection.execute(
        sa.text("SELECT id FROM at_resource WHERE resource_key = :resource_key"),
        {"resource_key": item["resource_key"]},
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
                    description = :description,
                    http_method = :http_method,
                    api_path = :api_path,
                    microservice = :microservice,
                    is_ui_visible = :is_ui_visible,
                    is_active = true,
                    is_deleted = false,
                    ui_path = :ui_path,
                    icon = :icon,
                    sequence_no = :sequence_no,
                    parent_resource_key = :parent_resource_key
                WHERE id = :resource_id
                """
            ),
            {**params, "resource_id": resource_id},
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
                    description,
                    http_method,
                    api_path,
                    microservice,
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
                    :description,
                    :http_method,
                    :api_path,
                    :microservice,
                    :is_ui_visible,
                    true,
                    :ui_path,
                    :icon,
                    :sequence_no,
                    :parent_resource_key,
                    false
                )
                RETURNING id
                """
            ),
            params,
        ).scalar_one()

    existing_permission = connection.execute(
        sa.text("SELECT id FROM at_resource_permission WHERE at_resource_id = :resource_id"),
        {"resource_id": resource_id},
    ).first()
    permission_params = {
        "resource_id": resource_id,
        "resource_key": item["resource_key"],
        "permissions_json": json.dumps(permissions),
    }
    if existing_permission:
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
            {**permission_params, "permission_id": existing_permission.id},
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
            permission_params,
        )


def grant_permissions_to_roles(connection, role_code: str, org_code: str | None = None) -> None:
    org_filter = "AND o.org_code = :org_code" if org_code else ""
    roles = connection.execute(
        sa.text(
            f"""
            SELECT r.id AS role_id,
                   r.at_organization_id AS org_id,
                   rp.id AS role_permission_id,
                   rp.permissions_json AS permissions_json
            FROM at_role r
            JOIN at_organization o ON o.id = r.at_organization_id
            LEFT JOIN at_role_permission rp ON rp.at_role_id = r.id AND rp.is_deleted = false
            WHERE r.role_code = :role_code
              AND r.is_deleted = false
              {org_filter}
            """
        ),
        {"role_code": role_code, "org_code": org_code},
    ).fetchall()

    grants = workflow_permissions()
    for role in roles:
        merged = dict(role.permissions_json or {})
        for resource_key, permissions in grants.items():
            merged[resource_key] = sorted(set(merged.get(resource_key, [])) | set(permissions))

        if role.role_permission_id:
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
                    "role_permission_id": role.role_permission_id,
                    "org_id": role.org_id,
                    "permissions_json": json.dumps(merged),
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
                    "role_id": role.role_id,
                    "org_id": role.org_id,
                    "permissions_json": json.dumps(merged),
                },
            )


def remove_permissions_from_roles(connection) -> None:
    workflow_keys = set(workflow_permissions())
    rows = connection.execute(
        sa.text(
            """
            SELECT rp.id, rp.permissions_json
            FROM at_role_permission rp
            JOIN at_role r ON r.id = rp.at_role_id
            WHERE r.role_code IN ('SUPER_ADMIN', 'ORG_ADMIN')
              AND rp.is_deleted = false
            """
        )
    ).fetchall()
    for row in rows:
        permissions = dict(row.permissions_json or {})
        for resource_key in workflow_keys:
            permissions.pop(resource_key, None)
        connection.execute(
            sa.text(
                """
                UPDATE at_role_permission
                SET permissions_json = CAST(:permissions_json AS JSONB)
                WHERE id = :role_permission_id
                """
            ),
            {"role_permission_id": row.id, "permissions_json": json.dumps(permissions)},
        )


def upgrade() -> None:
    connection = op.get_bind()
    for item in WORKFLOW_RESOURCES:
        upsert_resource(connection, item)
    grant_permissions_to_roles(connection, "SUPER_ADMIN", "PLATFORM")
    grant_permissions_to_roles(connection, "ORG_ADMIN")


def downgrade() -> None:
    connection = op.get_bind()
    remove_permissions_from_roles(connection)
    workflow_keys = tuple(workflow_permissions())
    connection.execute(
        sa.text(
            "UPDATE at_resource_permission SET is_deleted = true, is_active = false WHERE resource_key IN :resource_keys"
        ).bindparams(sa.bindparam("resource_keys", expanding=True)),
        {"resource_keys": workflow_keys},
    )
    connection.execute(
        sa.text("UPDATE at_resource SET is_deleted = true, is_active = false WHERE resource_key IN :resource_keys").bindparams(
            sa.bindparam("resource_keys", expanding=True)
        ),
        {"resource_keys": workflow_keys},
    )
