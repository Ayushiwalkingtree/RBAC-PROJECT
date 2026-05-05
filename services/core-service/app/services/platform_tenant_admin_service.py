from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models.organization import Organization
from app.models.role import Role, RolePermission
from app.models.user import User, UserRole
from app.repositories.permission_repository import PermissionRepository
from app.repositories.role_repository import RoleRepository
from app.services.audit_service import AuditService
from app.services.permission_service import PermissionService
from app.utils.permission_normalization import normalize_role_permissions

BLOCKED_ORG_ADMIN_RESOURCE_KEYS = {"RESOURCE_REGISTRY_MENU", "RESOURCE_MANAGE_API", "TENANT_ADMIN_ACCESS_MENU"}


class PlatformTenantAdminService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.role_repo = RoleRepository(session)
        self.permission_repo = PermissionRepository(session)
        self.permission_service = PermissionService(session)
        self.audit = AuditService(session)

    async def list_tenant_admins(self) -> list[dict]:
        result = await self.session.execute(
            select(Organization, User, Role, RolePermission)
            .join(Role, Role.at_organization_id == Organization.id)
            .join(UserRole, UserRole.role_id == Role.id)
            .join(User, User.id == UserRole.user_id)
            .outerjoin(RolePermission, RolePermission.role_id == Role.id)
            .where(
                Organization.is_deleted.is_(False),
                Organization.org_code != "PLATFORM",
                Role.is_deleted.is_(False),
                UserRole.is_deleted.is_(False),
                User.is_deleted.is_(False),
                ((Role.role_code == "ORG_ADMIN") | ((Role.is_system.is_(True)) & (func.upper(Role.role_code).like("%ADMIN%")))),
            )
            .order_by(Organization.org_code, User.email)
        )
        rows = []
        seen: set[tuple[int, int]] = set()
        for org, user, role, role_permissions in result.all():
            key = (org.id, user.id)
            if key in seen:
                continue
            seen.add(key)
            permissions = normalize_role_permissions(role_permissions.permissions_json if role_permissions else None)
            rows.append(
                {
                    "org_id": org.id,
                    "org_code": org.org_code,
                    "org_name": org.org_name,
                    "admin_user_id": user.id,
                    "admin_name": user.full_name,
                    "admin_email": user.email,
                    "admin_role_id": role.id,
                    "admin_role_code": role.role_code,
                    "is_email_verified": user.is_email_verified,
                    "is_active": user.is_active,
                    "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
                    "permissions_count": sum(len(values) for values in permissions.values()),
                }
            )
        return rows

    async def _org_admin_role(self, org_id: int) -> Role:
        role = await self.role_repo.get_by_code(org_id, "ORG_ADMIN")
        if not role:
            raise AppError(404, "TENANT_ADMIN_ROLE_NOT_FOUND", "Organization admin role was not found")
        return role

    async def get_permissions(self, org_id: int) -> dict:
        role = await self._org_admin_role(org_id)
        return await self.permission_service.get_role_permissions(
            org_id,
            role.id,
            include_all_resources=True,
            include_all_permission_keys=True,
        )

    async def update_permissions(
        self,
        org_id: int,
        permissions_json: dict[str, list[str]],
        actor_user_id: int,
        *,
        allow_platform_resource_delegation: bool = False,
    ) -> dict:
        if not allow_platform_resource_delegation or settings.env != "development":
            blocked = sorted(
                resource_key
                for resource_key in BLOCKED_ORG_ADMIN_RESOURCE_KEYS.intersection(permissions_json)
                if permissions_json.get(resource_key)
            )
            if blocked:
                raise AppError(
                    403,
                    "PLATFORM_RESOURCE_DELEGATION_BLOCKED",
                    f"Cannot delegate platform resource management to tenant admins: {blocked}",
                )
        role = await self._org_admin_role(org_id)
        existing = await self.permission_repo.get_role_permission(role.id)
        old_value = normalize_role_permissions(existing.permissions_json if existing else None)
        result = await self.permission_service.replace_role_permissions(
            org_id,
            role.id,
            permissions_json,
            actor_user_id,
            include_all_grants=True,
        )
        await self.audit.write(
            org_id,
            "TENANT_ADMIN_PERMISSIONS_UPDATED",
            "ROLE_PERMISSION",
            f"Tenant admin permissions updated for org {org_id}",
            actor_user_id=actor_user_id,
            resource_id=str(role.id),
            old_value_json=old_value,
            new_value_json=normalize_role_permissions(permissions_json),
        )
        await self.session.commit()
        return result
