from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.rbac import NAV_TYPES, build_nav_tree, has_view_grant, merge_permissions
from app.models.navigation import OrganizationNavOrder, UserNavOrder
from app.repositories.navigation_repository import NavigationRepository
from app.repositories.resource_repository import ResourceRepository
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository


class NavigationOrderService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.resource_repo = ResourceRepository(session)
        self.nav_repo = NavigationRepository(session)
        self.role_repo = RoleRepository(session)
        self.user_repo = UserRepository(session)

    async def list_order(
        self,
        org_id: int,
        perms: dict[str, list[str]],
    ) -> list[dict]:
        resources = await self.resource_repo.list_active()
        nav_resources = [
            resource
            for resource in resources
            if resource.is_active
            and resource.is_ui_visible
            and resource.resource_type in NAV_TYPES
            and has_view_grant(perms, resource.resource_key)
        ]
        grant_map = {resource.resource_key: ["VIEW"] for resource in nav_resources}
        return build_nav_tree(grant_map, nav_resources, await self.nav_repo.override_map(org_id))

    async def list_user_order(self, org_id: int, user_id: int) -> list[dict]:
        perms = await self._permissions_for_user(org_id, user_id)
        resources = await self.resource_repo.list_active()
        nav_resources = [
            resource
            for resource in resources
            if resource.is_active
            and resource.is_ui_visible
            and resource.resource_type in NAV_TYPES
            and has_view_grant(perms, resource.resource_key)
        ]
        grant_map = {resource.resource_key: ["VIEW"] for resource in nav_resources}
        return build_nav_tree(grant_map, nav_resources, await self.nav_repo.combined_override_map(org_id, user_id))

    async def save_order(
        self,
        org_id: int,
        items: list[dict],
        actor_user_id: int,
        perms: dict[str, list[str]],
    ) -> None:
        resources = {resource.resource_key: resource for resource in await self.resource_repo.list_active()}
        parent_by_key = {resource_key: resource.parent_resource_key for resource_key, resource in resources.items()}
        for item in items:
            resource_key = str(item.get("resource_key", "")).upper()
            if resource_key not in resources or resources[resource_key].resource_type not in NAV_TYPES:
                raise AppError(422, "INVALID_NAV_RESOURCE", f"Unknown navigation resource {resource_key}")
            if not has_view_grant(perms, resource_key):
                raise AppError(403, "FORBIDDEN", f"Cannot update order for hidden resource {resource_key}")
            parent_key = item.get("parent_resource_key")
            if parent_key:
                parent_key = str(parent_key).upper()
                if parent_key not in resources or resources[parent_key].resource_type not in NAV_TYPES:
                    raise AppError(422, "INVALID_NAV_PARENT", f"Unknown navigation parent {parent_key}")
                if not has_view_grant(perms, parent_key):
                    raise AppError(403, "FORBIDDEN", f"Cannot move under hidden parent {parent_key}")
                if parent_key == resource_key:
                    raise AppError(422, "INVALID_NAV_PARENT", "Navigation item cannot be its own parent")
            sequence_no = int(item.get("sequence_no", 9999))
            parent_by_key[resource_key] = parent_key
            visited: set[str] = set()
            next_parent = parent_key
            while next_parent:
                if next_parent in visited or next_parent == resource_key:
                    raise AppError(422, "INVALID_NAV_PARENT", "Navigation parent cannot create a cycle")
                visited.add(next_parent)
                next_parent = parent_by_key.get(next_parent)
            override = await self.nav_repo.get_override(org_id, resource_key)
            if not override:
                override = OrganizationNavOrder(
                    at_organization_id=org_id,
                    resource_key=resource_key,
                )
                self.session.add(override)
            override.parent_resource_key = parent_key
            override.sequence_no = sequence_no
            override.updated_by = actor_user_id
        await self.session.commit()

    async def save_user_order(
        self,
        org_id: int,
        user_id: int,
        items: list[dict],
        actor_user_id: int,
    ) -> None:
        perms = await self._permissions_for_user(org_id, user_id)
        resources = {resource.resource_key: resource for resource in await self.resource_repo.list_active()}
        overrides = await self.nav_repo.combined_override_map(org_id, user_id)
        parent_by_key = {
            resource_key: overrides.get(resource_key, {}).get("parent_resource_key", resource.parent_resource_key)
            for resource_key, resource in resources.items()
        }
        for item in items:
            resource_key = str(item.get("resource_key", "")).upper()
            if resource_key not in resources or resources[resource_key].resource_type not in NAV_TYPES:
                raise AppError(422, "INVALID_NAV_RESOURCE", f"Unknown navigation resource {resource_key}")
            if not has_view_grant(perms, resource_key):
                raise AppError(403, "FORBIDDEN", f"Cannot update order for hidden resource {resource_key}")
            parent_key = item.get("parent_resource_key")
            if parent_key:
                parent_key = str(parent_key).upper()
                if parent_key not in resources or resources[parent_key].resource_type not in NAV_TYPES:
                    raise AppError(422, "INVALID_NAV_PARENT", f"Unknown navigation parent {parent_key}")
                if not has_view_grant(perms, parent_key):
                    raise AppError(403, "FORBIDDEN", f"Cannot move under hidden parent {parent_key}")
                if parent_key == resource_key:
                    raise AppError(422, "INVALID_NAV_PARENT", "Navigation item cannot be its own parent")
            sequence_no = int(item.get("sequence_no", 9999))
            parent_by_key[resource_key] = parent_key
            visited: set[str] = set()
            next_parent = parent_key
            while next_parent:
                if next_parent in visited or next_parent == resource_key:
                    raise AppError(422, "INVALID_NAV_PARENT", "Navigation parent cannot create a cycle")
                visited.add(next_parent)
                next_parent = parent_by_key.get(next_parent)

            override = await self.nav_repo.get_user_override(user_id, resource_key)
            if not override:
                override = UserNavOrder(user_id=user_id, resource_key=resource_key)
                self.session.add(override)
            override.parent_resource_key = parent_key
            override.sequence_no = sequence_no
            override.updated_by = actor_user_id
        await self.session.commit()

    async def _permissions_for_user(self, org_id: int, user_id: int) -> dict[str, list[str]]:
        user = await self.user_repo.get_scoped(org_id, user_id)
        if not user:
            raise AppError(404, "USER_NOT_FOUND", "User was not found")
        role_ids = await self.user_repo.role_ids_for_user(user.id, org_id)
        role_perms = await self.role_repo.permissions_for_roles(role_ids, org_id)
        return merge_permissions([permission.permissions_json for permission in role_perms])
