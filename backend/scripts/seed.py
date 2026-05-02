import asyncio

from sqlalchemy import delete, select

from app.core.database import AsyncSessionLocal
from app.models.audit_log import AuditLog
from app.models.organization import Organization
from app.models.refresh_token import RefreshToken
from app.models.resource import Resource, ResourcePermission
from app.models.role import Role, RolePermission
from app.models.user import User, UserRole
from app.services.signup_service import CORE_ORG_ADMIN_PERMISSIONS
from app.utils.password import hash_password

PASSWORD = "SecurePass123!"

CORE_RESOURCES: list[dict] = [
    {"resource_key": "USER_MENU", "resource_name": "Users", "resource_type": "MENU", "resource_group": "Identity", "permissions": ["VIEW", "CREATE", "READ", "UPDATE", "DELETE"], "is_ui_visible": True, "ui_path": "/users", "sequence_no": 20},
    {"resource_key": "USER_LIST_API", "resource_name": "List Users API", "resource_type": "API", "resource_group": "Identity", "permissions": ["READ"], "http_method": "GET", "api_path": "/api/v1/users", "microservice": "identity"},
    {"resource_key": "USER_CREATE_API", "resource_name": "Create User API", "resource_type": "API", "resource_group": "Identity", "permissions": ["EXECUTE"], "http_method": "POST", "api_path": "/api/v1/users", "microservice": "identity"},
    {"resource_key": "USER_UPDATE_API", "resource_name": "Update User API", "resource_type": "API", "resource_group": "Identity", "permissions": ["EXECUTE"], "http_method": "PUT", "api_path": "/api/v1/users/{id}", "microservice": "identity"},
    {"resource_key": "USER_DELETE_API", "resource_name": "Delete User API", "resource_type": "API", "resource_group": "Identity", "permissions": ["EXECUTE"], "http_method": "DELETE", "api_path": "/api/v1/users/{id}", "microservice": "identity"},
    {"resource_key": "USER_EXPORT_BTN", "resource_name": "Export Users", "resource_type": "BUTTON", "resource_group": "Identity", "permissions": ["VIEW"]},
    {"resource_key": "ADMIN_MENU", "resource_name": "Administration", "resource_type": "MENU", "resource_group": "Administration", "permissions": ["VIEW"], "is_ui_visible": True, "ui_path": "/roles", "sequence_no": 50},
    {"resource_key": "ROLE_MANAGE_API", "resource_name": "Manage Roles API", "resource_type": "API", "resource_group": "Administration", "permissions": ["CREATE", "READ", "UPDATE", "DELETE"], "http_method": "POST", "api_path": "/api/v1/roles", "microservice": "identity"},
    {"resource_key": "PERM_GRANT_API", "resource_name": "Permission Grants API", "resource_type": "API", "resource_group": "Administration", "permissions": ["READ", "CONFIGURE"], "http_method": "PUT", "api_path": "/api/v1/roles/{id}/permissions", "microservice": "identity"},
    {"resource_key": "RESOURCE_REGISTRY_MENU", "resource_name": "Resource Registry", "resource_type": "MENU", "resource_group": "Platform", "permissions": ["VIEW"], "is_ui_visible": True, "ui_path": "/resource-registry", "sequence_no": 70},
    {"resource_key": "RESOURCE_MANAGE_API", "resource_name": "Manage Resources API", "resource_type": "API", "resource_group": "Platform", "permissions": ["CREATE", "READ", "UPDATE", "DELETE"], "http_method": "POST", "api_path": "/api/v1/resources", "microservice": "platform"},
    {"resource_key": "ORG_SETTINGS", "resource_name": "Organization Settings", "resource_type": "API", "resource_group": "Administration", "permissions": ["VIEW", "UPDATE"], "http_method": "PUT", "api_path": "/api/v1/organization", "microservice": "identity"},
    {"resource_key": "AUDIT_LOG_API", "resource_name": "Audit Logs API", "resource_type": "API", "resource_group": "Administration", "permissions": ["READ"], "http_method": "GET", "api_path": "/api/v1/audit-logs", "microservice": "identity"},
    {"resource_key": "DASH_MENU", "resource_name": "Dashboard", "resource_type": "MENU", "resource_group": "Workspace", "permissions": ["VIEW"], "is_ui_visible": True, "ui_path": "/dashboard", "sequence_no": 10},
    {"resource_key": "DASH_MAIN", "resource_name": "Main Dashboard", "resource_type": "DASHBOARD", "resource_group": "Workspace", "permissions": ["VIEW"], "is_ui_visible": True, "ui_path": "/dashboard", "parent_resource_key": "DASH_MENU", "sequence_no": 11},
    {"resource_key": "REPORTS_MENU", "resource_name": "Reports", "resource_type": "MENU", "resource_group": "Reports", "permissions": ["VIEW"], "is_ui_visible": True, "ui_path": "/reports", "sequence_no": 40},
    {"resource_key": "REPORT_DAILY", "resource_name": "Daily Report", "resource_type": "REPORT", "resource_group": "Reports", "permissions": ["VIEW", "DOWNLOAD"], "is_ui_visible": True, "ui_path": "/reports", "parent_resource_key": "REPORTS_MENU", "sequence_no": 41},
    {"resource_key": "REPORT_MONTHLY", "resource_name": "Monthly Report", "resource_type": "REPORT", "resource_group": "Reports", "permissions": ["VIEW", "DOWNLOAD"], "is_ui_visible": True, "ui_path": "/reports", "parent_resource_key": "REPORTS_MENU", "sequence_no": 42},
]


async def main() -> None:
    async with AsyncSessionLocal() as session:
        for model in [AuditLog, RefreshToken, UserRole, User, RolePermission, Role, ResourcePermission, Resource, Organization]:
            await session.execute(delete(model))

        platform = Organization(org_code="PLATFORM", org_name="Platform Operations", plan="PLATFORM", timezone="UTC", is_verified=True)
        acme = Organization(org_code="ACME_BANK", org_name="ACME Bank", plan="ENTERPRISE", timezone="Asia/Kolkata", is_verified=True)
        session.add_all([platform, acme])
        await session.flush()

        resources: list[Resource] = []
        for item in CORE_RESOURCES:
            permissions = item.pop("permissions")
            resource = Resource(**item)
            session.add(resource)
            await session.flush()
            session.add(ResourcePermission(resource_id=resource.id, permissions_json=permissions))
            resources.append(resource)

        super_permissions = {resource.resource_key: (await session.execute(select(ResourcePermission.permissions_json).where(ResourcePermission.resource_id == resource.id))).scalar_one() for resource in resources}
        super_role = Role(at_organization_id=platform.id, role_code="SUPER_ADMIN", role_name="Super Admin", is_system=True)
        acme_admin_role = Role(at_organization_id=acme.id, role_code="ORG_ADMIN", role_name="Organization Admin", is_system=True)
        maker = Role(at_organization_id=acme.id, role_code="MAKER", role_name="Maker", is_system=True)
        checker = Role(at_organization_id=acme.id, role_code="CHECKER", role_name="Checker", is_system=True)
        auditor = Role(at_organization_id=acme.id, role_code="AUDITOR", role_name="Auditor", is_system=True)
        session.add_all([super_role, acme_admin_role, maker, checker, auditor])
        await session.flush()
        session.add_all(
            [
                RolePermission(role_id=super_role.id, permissions_json=super_permissions),
                RolePermission(role_id=acme_admin_role.id, permissions_json=CORE_ORG_ADMIN_PERMISSIONS),
                RolePermission(role_id=maker.id, permissions_json={"DASH_MENU": ["VIEW"], "DASH_MAIN": ["VIEW"], "REPORTS_MENU": ["VIEW"]}),
                RolePermission(role_id=checker.id, permissions_json={"DASH_MENU": ["VIEW"], "DASH_MAIN": ["VIEW"], "REPORTS_MENU": ["VIEW"]}),
                RolePermission(role_id=auditor.id, permissions_json={"AUDIT_LOG_API": ["READ"], "REPORTS_MENU": ["VIEW"], "REPORT_DAILY": ["VIEW"]}),
            ]
        )

        users = [
            (platform.id, "platform.super@platform.com", "Platform Super", super_role.id),
            (acme.id, "admin@acme.com", "ACME Admin", acme_admin_role.id),
            (acme.id, "maker@acme.com", "Mira Maker", maker.id),
            (acme.id, "checker@acme.com", "Chris Checker", checker.id),
            (acme.id, "auditor@acme.com", "Ari Auditor", auditor.id),
        ]
        for org_id, email, name, role_id in users:
            user = User(at_organization_id=org_id, email=email, full_name=name, password_hash=hash_password(PASSWORD), is_email_verified=True)
            session.add(user)
            await session.flush()
            session.add(UserRole(user_id=user.id, role_id=role_id, at_organization_id=org_id))

        await session.commit()
        print("Seed complete")


if __name__ == "__main__":
    asyncio.run(main())
