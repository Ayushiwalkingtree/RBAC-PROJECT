from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.role import Role, RolePermission
from app.repositories.role_repository import RoleRepository
from app.schemas.role import RoleCreate, RoleUpdate
from app.services.audit_service import AuditService


class RoleService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = RoleRepository(session)
        self.audit = AuditService(session)

    async def create(self, org_id: int, payload: RoleCreate, actor_user_id: int) -> Role:
        if await self.repo.get_by_code(org_id, payload.role_code):
            raise AppError(409, "ROLE_CODE_EXISTS", "Role code already exists in this organization")
        role = Role(at_organization_id=org_id, role_code=payload.role_code.upper(), role_name=payload.role_name, description=payload.description, is_system=False)
        self.repo.add(role)
        await self.session.flush()
        self.repo.add_permissions(RolePermission(role_id=role.id, permissions_json={}))
        await self.audit.write(org_id, "ROLE_CREATED", "ROLE", f"{role.role_code} created", actor_user_id=actor_user_id, resource_id=str(role.id))
        await self.session.commit()
        return role

    async def update(self, org_id: int, role_id: int, payload: RoleUpdate) -> Role:
        role = await self.repo.get_scoped(org_id, role_id)
        if not role:
            raise AppError(404, "ROLE_NOT_FOUND", "Role was not found")
        if payload.role_code:
            role.role_code = payload.role_code.upper()
        if payload.role_name:
            role.role_name = payload.role_name
        if payload.description is not None:
            role.description = payload.description
        await self.session.commit()
        return role

    async def delete(self, org_id: int, role_id: int) -> None:
        role = await self.repo.get_scoped(org_id, role_id)
        if not role:
            raise AppError(404, "ROLE_NOT_FOUND", "Role was not found")
        if role.is_system:
            raise AppError(409, "SYSTEM_ROLE_DELETE_BLOCKED", "System roles cannot be deleted")
        if await self.repo.is_assigned_to_active_user(role_id):
            raise AppError(409, "ROLE_IN_USE", "Cannot delete a role assigned to active users")
        role.is_deleted = True
        if role.permissions:
            role.permissions.is_deleted = True
        await self.session.commit()
