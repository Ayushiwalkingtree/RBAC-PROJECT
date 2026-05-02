from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.repositories.permission_repository import PermissionRepository
from app.repositories.role_repository import RoleRepository
from app.services.audit_service import AuditService


class PermissionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.role_repo = RoleRepository(session)
        self.permission_repo = PermissionRepository(session)
        self.audit = AuditService(session)

    async def get_role_permissions(self, org_id: int, role_id: int):
        role = await self.role_repo.get_scoped(org_id, role_id)
        if not role:
            raise AppError(404, "ROLE_NOT_FOUND", "Role was not found")
        return role.permissions

    async def replace_role_permissions(self, org_id: int, role_id: int, permissions_json: dict[str, list[str]], actor_user_id: int):
        role = await self.role_repo.get_scoped(org_id, role_id)
        if not role or not role.permissions:
            raise AppError(404, "ROLE_NOT_FOUND", "Role was not found")
        allowed = await self.permission_repo.allowed_permission_map()
        for resource_key, permissions in permissions_json.items():
            if resource_key not in allowed:
                raise AppError(422, "INVALID_RESOURCE", f"Unknown resource {resource_key}")
            invalid = [permission for permission in permissions if permission.upper() not in allowed[resource_key]]
            if invalid:
                raise AppError(422, "INVALID_PERMISSION", f"Invalid permissions for {resource_key}: {invalid}")
        role.permissions.permissions_json = {key: [p.upper() for p in values] for key, values in permissions_json.items()}
        await self.audit.write(org_id, "PERM_GRANTED", "ROLE_PERMISSION", f"Permissions updated for {role.role_code}", actor_user_id=actor_user_id, resource_id=str(role_id))
        await self.session.commit()
        return role.permissions
