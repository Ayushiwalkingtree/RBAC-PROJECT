import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.organization import Organization
from app.models.resource import Resource, ResourcePermission
from app.models.role import Role, RolePermission
from app.models.user import User, UserRole
from app.services.signup_service import CORE_ORG_ADMIN_PERMISSIONS
from app.utils.datetime import utcnow
from app.utils.password import hash_password

PASSWORD = "SecurePass123!"

VIEW_PERMISSION = [{"key": "VIEW", "label": "View"}]

CORE_RESOURCES: list[dict] = [
    {"resource_key": "USER_MENU", "resource_name": "Users", "resource_type": "MENU", "resource_group": "Identity", "permissions": ["VIEW", "CREATE", "READ", "UPDATE", "DELETE"], "is_ui_visible": True, "ui_path": "/users", "sequence_no": 20},
    {"resource_key": "USER_LIST_API", "resource_name": "List Users API", "resource_type": "API", "resource_group": "Identity", "permissions": ["READ"], "http_method": "GET", "api_path": "/api/v1/users", "microservice": "identity"},
    {"resource_key": "USER_CREATE_API", "resource_name": "Create User API", "resource_type": "API", "resource_group": "Identity", "permissions": ["EXECUTE"], "http_method": "POST", "api_path": "/api/v1/users", "microservice": "identity"},
    {"resource_key": "USER_UPDATE_API", "resource_name": "Update User API", "resource_type": "API", "resource_group": "Identity", "permissions": ["EXECUTE"], "http_method": "PUT", "api_path": "/api/v1/users/{id}", "microservice": "identity"},
    {"resource_key": "USER_DELETE_API", "resource_name": "Delete User API", "resource_type": "API", "resource_group": "Identity", "permissions": ["EXECUTE"], "http_method": "DELETE", "api_path": "/api/v1/users/{id}", "microservice": "identity"},
    {"resource_key": "USER_EXPORT_BTN", "resource_name": "Export Users", "resource_type": "BUTTON", "resource_group": "Identity", "permissions": ["VIEW"]},
    {"resource_key": "ADMIN_MENU", "resource_name": "Administration", "resource_type": "MENU", "resource_group": "Administration", "permissions": ["VIEW"], "is_ui_visible": True, "ui_path": "/roles", "sequence_no": 50},
    {"resource_key": "ROLES_MENU", "resource_name": "Roles", "resource_type": "MENU", "resource_group": "Administration", "permissions": VIEW_PERMISSION, "is_ui_visible": True, "ui_path": "/roles", "parent_resource_key": "ADMIN_MENU", "sequence_no": 1},
    {"resource_key": "PERMISSION_MATRIX_MENU", "resource_name": "Permission Matrix", "resource_type": "MENU", "resource_group": "Administration", "permissions": VIEW_PERMISSION, "is_ui_visible": True, "ui_path": "/permissions", "parent_resource_key": "ADMIN_MENU", "sequence_no": 2},
    {"resource_key": "RESOURCE_REGISTRY_MENU", "resource_name": "Resource Registry", "resource_type": "MENU", "resource_group": "Administration", "permissions": VIEW_PERMISSION, "is_ui_visible": True, "ui_path": "/resource-registry", "parent_resource_key": "ADMIN_MENU", "sequence_no": 3},
    {"resource_key": "NAV_PREVIEW_MENU", "resource_name": "Nav Preview", "resource_type": "MENU", "resource_group": "Administration", "permissions": VIEW_PERMISSION, "is_ui_visible": True, "ui_path": "/nav-preview", "parent_resource_key": "ADMIN_MENU", "sequence_no": 4},
    {"resource_key": "SETTINGS_MENU", "resource_name": "Settings", "resource_type": "MENU", "resource_group": "Administration", "permissions": VIEW_PERMISSION, "is_ui_visible": True, "ui_path": "/settings", "parent_resource_key": "ADMIN_MENU", "sequence_no": 5},
    {"resource_key": "AUDIT_LOG_MENU", "resource_name": "Audit Logs", "resource_type": "MENU", "resource_group": "Administration", "permissions": VIEW_PERMISSION, "is_ui_visible": True, "ui_path": "/audit-logs", "parent_resource_key": "ADMIN_MENU", "sequence_no": 6},
    {"resource_key": "ROLE_MANAGE_API", "resource_name": "Manage Roles API", "resource_type": "API", "resource_group": "Administration", "permissions": ["CREATE", "READ", "UPDATE", "DELETE"], "http_method": "POST", "api_path": "/api/v1/roles", "microservice": "identity"},
    {"resource_key": "PERM_GRANT_API", "resource_name": "Permission Grants API", "resource_type": "API", "resource_group": "Administration", "permissions": ["READ", "CONFIGURE"], "http_method": "PUT", "api_path": "/api/v1/roles/{id}/permissions", "microservice": "identity"},
    {"resource_key": "RESOURCE_MANAGE_API", "resource_name": "Manage Resources API", "resource_type": "API", "resource_group": "Platform", "permissions": ["CREATE", "READ", "UPDATE", "DELETE"], "http_method": "POST", "api_path": "/api/v1/resources", "microservice": "platform"},
    {"resource_key": "ORG_SETTINGS", "resource_name": "Organization Settings", "resource_type": "API", "resource_group": "Administration", "permissions": ["VIEW", "UPDATE"], "http_method": "PUT", "api_path": "/api/v1/organization", "microservice": "identity"},
    {"resource_key": "AUDIT_LOG_API", "resource_name": "Audit Logs API", "resource_type": "API", "resource_group": "Administration", "permissions": ["READ"], "http_method": "GET", "api_path": "/api/v1/audit-logs", "microservice": "identity"},
    {"resource_key": "TICKETS_MENU", "resource_name": "Tickets", "resource_type": "MENU", "resource_group": "Workspace", "permissions": VIEW_PERMISSION, "is_ui_visible": True, "ui_path": "/tickets", "sequence_no": 4},
    {"resource_key": "DASH_MENU", "resource_name": "Dashboard", "resource_type": "MENU", "resource_group": "Workspace", "permissions": ["VIEW"], "is_ui_visible": True, "ui_path": "/dashboard", "sequence_no": 10},
    {"resource_key": "DASH_MAIN", "resource_name": "Main Dashboard", "resource_type": "DASHBOARD", "resource_group": "Workspace", "permissions": ["VIEW"], "is_ui_visible": True, "ui_path": "/dashboard", "parent_resource_key": "DASH_MENU", "sequence_no": 11},
    {"resource_key": "REPORTS_MENU", "resource_name": "Reports", "resource_type": "MENU", "resource_group": "Reports", "permissions": ["VIEW"], "is_ui_visible": True, "ui_path": "/reports", "sequence_no": 40},
    {"resource_key": "REPORT_DAILY", "resource_name": "Daily Report", "resource_type": "REPORT", "resource_group": "Reports", "permissions": ["VIEW", "DOWNLOAD"], "is_ui_visible": True, "ui_path": "/reports", "parent_resource_key": "REPORTS_MENU", "sequence_no": 41},
    {"resource_key": "REPORT_MONTHLY", "resource_name": "Monthly Report", "resource_type": "REPORT", "resource_group": "Reports", "permissions": ["VIEW", "DOWNLOAD"], "is_ui_visible": True, "ui_path": "/reports", "parent_resource_key": "REPORTS_MENU", "sequence_no": 42},
]


def permission_keys(permissions: list) -> list[str]:
    keys: list[str] = []
    for permission in permissions:
        if isinstance(permission, dict):
            key = permission.get("key")
        else:
            key = permission
        if key:
            keys.append(str(key).upper())
    return keys


def sidebar_permissions(resource: Resource, permissions: list) -> list[str]:
    keys = permission_keys(permissions)
    if resource.resource_type in {"MENU", "DASHBOARD", "REPORT"} and "VIEW" not in keys:
        keys.append("VIEW")
    return keys


def org_admin_permissions() -> dict[str, list[str]]:
    permissions = dict(CORE_ORG_ADMIN_PERMISSIONS)
    permissions.update(
        {
            "ADMIN_MENU": ["VIEW"],
            "ROLES_MENU": ["VIEW"],
            "PERMISSION_MATRIX_MENU": ["VIEW"],
            "SETTINGS_MENU": ["VIEW"],
            "AUDIT_LOG_MENU": ["VIEW"],
            "USER_MENU": ["VIEW"],
            "DASH_MENU": ["VIEW"],
            "DASH_MAIN": ["VIEW"],
            "REPORTS_MENU": ["VIEW"],
        }
    )
    permissions.pop("RESOURCE_REGISTRY_MENU", None)
    permissions.pop("RESOURCE_MANAGE_API", None)
    return permissions


async def main() -> None:
    async with AsyncSessionLocal() as session:
        async def upsert_org(org_code: str, org_name: str, plan: str, timezone: str) -> Organization:
            result = await session.execute(select(Organization).where(Organization.org_code == org_code))
            org = result.scalar_one_or_none()
            settings_json = {
                "timezone": timezone,
                "allowed_origins": [],
            }
            if org:
                org.org_name = org_name
                org.plan = plan
                org.timezone = timezone
                org.settings_json = {**(org.settings_json or {}), **settings_json}
                org.is_verified = True
                org.is_active = True
                org.is_deleted = False
                return org
            org = Organization(
                org_code=org_code,
                org_name=org_name,
                plan=plan,
                timezone=timezone,
                settings_json=settings_json,
                is_verified=True,
            )
            session.add(org)
            await session.flush()
            return org

        platform = await upsert_org("PLATFORM", "Platform Operations", "PLATFORM", "UTC")
        acme = await upsert_org("ACME_BANK", "ACME Bank", "ENTERPRISE", "Asia/Kolkata")
        await session.flush()

        resources: list[Resource] = []
        for item in CORE_RESOURCES:
            payload = dict(item)
            permissions = payload.pop("permissions")
            result = await session.execute(select(Resource).where(Resource.resource_key == payload["resource_key"]))
            resource = result.scalar_one_or_none()
            if resource:
                for field, value in payload.items():
                    setattr(resource, field, value)
                resource.is_deleted = False
                resource.is_active = payload.get("is_active", True)
            else:
                resource = Resource(**payload)
                session.add(resource)
            await session.flush()
            perm_result = await session.execute(
                select(ResourcePermission).where(ResourcePermission.resource_id == resource.id)
            )
            resource_permission = perm_result.scalar_one_or_none()
            if resource_permission:
                resource_permission.resource_key = resource.resource_key
                resource_permission.permissions_json = permissions
                resource_permission.is_active = True
                resource_permission.is_deleted = False
            else:
                session.add(
                    ResourcePermission(
                        resource_id=resource.id,
                        resource_key=resource.resource_key,
                        permissions_json=permissions,
                    )
                )
            resources.append(resource)

        super_permissions = {}
        for resource in resources:
            result = await session.execute(
                select(ResourcePermission.permissions_json).where(ResourcePermission.resource_id == resource.id)
            )
            permissions = result.scalar_one()
            super_permissions[resource.resource_key] = sidebar_permissions(resource, permissions)

        async def upsert_role(org_id: int, role_code: str, role_name: str, permissions_json: dict[str, list[str]]) -> Role:
            result = await session.execute(
                select(Role).where(Role.at_organization_id == org_id, Role.role_code == role_code)
            )
            role = result.scalar_one_or_none()
            if role:
                role.role_name = role_name
                role.is_system = True
                role.is_active = True
                role.is_deleted = False
            else:
                role = Role(
                    at_organization_id=org_id,
                    role_code=role_code,
                    role_name=role_name,
                    is_system=True,
                )
                session.add(role)
            await session.flush()
            perm_result = await session.execute(select(RolePermission).where(RolePermission.role_id == role.id))
            role_permission = perm_result.scalar_one_or_none()
            if role_permission:
                role_permission.at_organization_id = org_id
                role_permission.permissions_json = permissions_json
                role_permission.is_deleted = False
            else:
                session.add(
                    RolePermission(
                        role_id=role.id,
                        at_organization_id=org_id,
                        permissions_json=permissions_json,
                    )
                )
            return role

        super_role = await upsert_role(platform.id, "SUPER_ADMIN", "Super Admin", super_permissions)
        acme_admin_role = await upsert_role(acme.id, "ORG_ADMIN", "Organization Admin", org_admin_permissions())
        maker = await upsert_role(
            acme.id,
            "MAKER",
            "Maker",
            {"DASH_MENU": ["VIEW"], "DASH_MAIN": ["VIEW"], "REPORTS_MENU": ["VIEW"]},
        )
        checker = await upsert_role(
            acme.id,
            "CHECKER",
            "Checker",
            {"DASH_MENU": ["VIEW"], "DASH_MAIN": ["VIEW"], "REPORTS_MENU": ["VIEW"]},
        )
        auditor = await upsert_role(
            acme.id,
            "AUDITOR",
            "Auditor",
            {"AUDIT_LOG_API": ["READ"], "REPORTS_MENU": ["VIEW"], "REPORT_DAILY": ["VIEW"]},
        )
        await session.flush()

        users = [
            (platform.id, "platform.super@platform.com", "Platform Super", super_role.id),
            (acme.id, "admin@acme.com", "ACME Admin", acme_admin_role.id),
            (acme.id, "maker@acme.com", "Mira Maker", maker.id),
            (acme.id, "checker@acme.com", "Chris Checker", checker.id),
            (acme.id, "auditor@acme.com", "Ari Auditor", auditor.id),
        ]
        for org_id, email, name, role_id in users:
            result = await session.execute(
                select(User).where(User.at_organization_id == org_id, User.email == email)
            )
            user = result.scalar_one_or_none()
            if user:
                user.full_name = name
                user.password_hash = hash_password(PASSWORD)
                user.is_email_verified = True
                user.is_active = True
                user.is_deleted = False
                if not user.password_changed_at:
                    user.password_changed_at = utcnow()
            else:
                user = User(
                    at_organization_id=org_id,
                    email=email,
                    full_name=name,
                    password_hash=hash_password(PASSWORD),
                    is_email_verified=True,
                    password_changed_at=utcnow(),
                )
                session.add(user)
            await session.flush()
            user_role_result = await session.execute(
                select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == role_id)
            )
            user_role = user_role_result.scalar_one_or_none()
            if user_role:
                user_role.at_organization_id = org_id
                user_role.assigned_at = user_role.assigned_at or utcnow()
                user_role.assigned_by = user_role.assigned_by or user.id
                user_role.is_deleted = False
            else:
                session.add(
                    UserRole(
                        user_id=user.id,
                        role_id=role_id,
                        at_organization_id=org_id,
                        assigned_at=utcnow(),
                        assigned_by=user.id,
                    )
                )

        await session.commit()
        print("Seed complete")


if __name__ == "__main__":
    asyncio.run(main())
