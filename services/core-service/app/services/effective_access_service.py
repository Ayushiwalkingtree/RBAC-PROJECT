from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.rbac import build_nav_tree, merge_permissions
from app.repositories.organization_repository import OrganizationRepository
from app.repositories.navigation_repository import NavigationRepository
from app.repositories.resource_repository import ResourceRepository
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository


class EffectiveAccessService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.org_repo = OrganizationRepository(session)
        self.user_repo = UserRepository(session)
        self.role_repo = RoleRepository(session)
        self.resource_repo = ResourceRepository(session)
        self.nav_repo = NavigationRepository(session)

    async def for_user(self, org_id: int, user_id: int) -> dict:
        org = await self.org_repo.get(org_id)
        user = await self.user_repo.get_scoped(org_id, user_id)
        if not org or not user:
            raise AppError(404, "USER_NOT_FOUND", "User was not found")

        role_ids = await self.user_repo.role_ids_for_user(user.id, org.id)
        all_roles = await self.role_repo.list_scoped(org.id)
        roles = [role for role in all_roles if role.id in role_ids]
        role_perms = await self.role_repo.permissions_for_roles(role_ids, org.id)
        permissions = merge_permissions([permission.permissions_json for permission in role_perms])
        resources = await self.resource_repo.list_active()
        nav = build_nav_tree(permissions, resources, await self.nav_repo.combined_override_map(org.id, user.id))
        api_resources = [
            {
                "id": resource.id,
                "resource_id": resource.id,
                "resource_key": resource.resource_key,
                "resource_name": resource.resource_name,
                "resource_type": resource.resource_type,
                "resource_group": resource.resource_group,
                "description": resource.description,
                "http_method": resource.http_method,
                "api_path": resource.api_path,
                "microservice": resource.microservice,
                "is_ui_visible": resource.is_ui_visible,
                "is_active": resource.is_active,
                "sequence_no": resource.sequence_no,
                "parent_resource_key": resource.parent_resource_key,
            }
            for resource in resources
            if resource.resource_type == "API" and permissions.get(resource.resource_key)
        ]

        return {
            "user": {
                "id": user.id,
                "user_id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "title": user.title,
                "department": user.department,
                "is_active": user.is_active,
                "is_email_verified": user.is_email_verified,
                "role_ids": role_ids,
                "role_codes": [role.role_code for role in roles],
            },
            "roles": [
                {
                    "id": role.id,
                    "role_id": role.id,
                    "role_code": role.role_code,
                    "role_name": role.role_name,
                    "description": role.description,
                    "is_system": role.is_system,
                }
                for role in roles
            ],
            "permissions": permissions,
            "nav": nav,
            "api_resources": api_resources,
        }
