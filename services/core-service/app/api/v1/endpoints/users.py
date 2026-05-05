from fastapi import APIRouter, Depends, Request
from sqlalchemy import select

from app.core.errors import AppError
from app.core.rbac import is_platform_super_admin
from app.dependencies.auth import CurrentClaims, get_current_org_id, get_current_user_id
from app.dependencies.db import DbSession
from app.dependencies.permissions import require_permission
from app.models.user import UserRole
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.navigation import NavigationOrderUpdate
from app.schemas.user import UserCreate, UserResponse, UserRolesUpdate, UserUpdate
from app.services.audit_service import AuditService
from app.services.effective_access_service import EffectiveAccessService
from app.services.navigation_order_service import NavigationOrderService
from app.services.user_service import UserService
from app.utils.datetime import utcnow
from app.utils.response import api_response

router = APIRouter(prefix="/users", tags=["users"])


def serialize_user(user, role_ids: list[int], role_codes: list[str] | None = None) -> dict:
    return UserResponse(
        id=user.id,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        title=user.title,
        department=user.department,
        phone=user.phone,
        is_active=user.is_active,
        is_email_verified=user.is_email_verified,
        mfa_enabled=user.mfa_enabled,
        role_ids=role_ids,
        role_codes=role_codes or [],
    ).model_dump()


def is_org_admin(claims: dict) -> bool:
    return "ORG_ADMIN" in {str(role).upper() for role in claims.get("roles", [])}


async def resolve_navigation_order_user(user_id: int, session: DbSession, claims: CurrentClaims):
    repo = UserRepository(session)
    if is_platform_super_admin(str(claims.get("org_code", "")), list(claims.get("roles", []))):
        user = await repo.get_by_id(user_id)
    elif is_org_admin(claims):
        user = await repo.get_scoped(get_current_org_id(claims), user_id)
    else:
        raise AppError(403, "FORBIDDEN", "Only platform super admin or organization admin can manage user navigation order")
    if not user:
        raise AppError(404, "USER_NOT_FOUND", "User was not found")
    return user


@router.get("", dependencies=[Depends(require_permission("USER_LIST_API", "READ"))])
async def list_users(request: Request, session: DbSession, claims: CurrentClaims):
    repo = UserRepository(session)
    org_id = get_current_org_id(claims)
    users = await repo.list_scoped(org_id)
    roles = await RoleRepository(session).list_scoped(org_id)
    role_by_id = {role.id: role.role_code for role in roles}
    rows = []
    for user in users:
        role_ids = await repo.role_ids_for_user(user.id)
        rows.append(serialize_user(user, role_ids, [role_by_id[role_id] for role_id in role_ids if role_id in role_by_id]))
    return api_response(request, rows)


@router.post("", dependencies=[Depends(require_permission("USER_CREATE_API", "EXECUTE"))])
async def create_user(payload: UserCreate, request: Request, session: DbSession, claims: CurrentClaims):
    user, dev_url = await UserService(session).create(get_current_org_id(claims), payload, get_current_user_id(claims))
    return api_response(request, {"user": serialize_user(user, payload.role_ids), "dev_verification_url": dev_url})


@router.get("/{user_id}", dependencies=[Depends(require_permission("USER_LIST_API", "READ"))])
async def get_user(user_id: int, request: Request, session: DbSession, claims: CurrentClaims):
    repo = UserRepository(session)
    user = await repo.get_scoped(get_current_org_id(claims), user_id)
    if not user:
        from app.core.errors import AppError

        raise AppError(404, "USER_NOT_FOUND", "User was not found")
    return api_response(request, serialize_user(user, await repo.role_ids_for_user(user.id)))


@router.get("/{user_id}/effective-access", dependencies=[Depends(require_permission("USER_LIST_API", "READ"))])
async def get_user_effective_access(user_id: int, request: Request, session: DbSession, claims: CurrentClaims):
    access = await EffectiveAccessService(session).for_user(get_current_org_id(claims), user_id)
    return api_response(request, access)


@router.get("/{user_id}/navigation/order")
async def get_user_navigation_order(user_id: int, request: Request, session: DbSession, claims: CurrentClaims):
    user = await resolve_navigation_order_user(user_id, session, claims)
    tree = await NavigationOrderService(session).list_user_order(user.at_organization_id, user.id)
    return api_response(request, tree)


@router.put("/{user_id}/navigation/order")
async def update_user_navigation_order(
    user_id: int,
    payload: NavigationOrderUpdate,
    request: Request,
    session: DbSession,
    claims: CurrentClaims,
):
    user = await resolve_navigation_order_user(user_id, session, claims)
    await NavigationOrderService(session).save_user_order(
        user.at_organization_id,
        user.id,
        [item.model_dump() for item in payload.items],
        get_current_user_id(claims),
    )
    tree = await NavigationOrderService(session).list_user_order(user.at_organization_id, user.id)
    return api_response(request, tree)


@router.put("/{user_id}", dependencies=[Depends(require_permission("USER_UPDATE_API", "EXECUTE"))])
async def update_user(user_id: int, payload: UserUpdate, request: Request, session: DbSession, claims: CurrentClaims):
    user = await UserService(session).update(get_current_org_id(claims), user_id, payload, get_current_user_id(claims))
    return api_response(request, serialize_user(user, await UserRepository(session).role_ids_for_user(user.id)))


@router.delete("/{user_id}", dependencies=[Depends(require_permission("USER_DELETE_API", "EXECUTE"))])
async def delete_user(user_id: int, request: Request, session: DbSession, claims: CurrentClaims):
    await UserService(session).delete(get_current_org_id(claims), user_id, get_current_user_id(claims))
    return api_response(request, {"deleted": True})


@router.post("/{user_id}/roles", dependencies=[Depends(require_permission("USER_UPDATE_API", "EXECUTE"))])
async def replace_user_roles(user_id: int, payload: UserRolesUpdate, request: Request, session: DbSession, claims: CurrentClaims):
    org_id = get_current_org_id(claims)
    user = await UserRepository(session).get_scoped(org_id, user_id)
    if not user:
        from app.core.errors import AppError

        raise AppError(404, "USER_NOT_FOUND", "User was not found")
    for role_id in payload.role_ids:
        if not await RoleRepository(session).get_scoped(org_id, role_id):
            from app.core.errors import AppError

            raise AppError(404, "ROLE_NOT_FOUND", "Role was not found")
    existing_result = await session.execute(select(UserRole).where(UserRole.user_id == user_id))
    existing_roles = list(existing_result.scalars())
    for existing in existing_roles:
        existing.is_deleted = True
    for role_id in payload.role_ids:
        existing = next((candidate for candidate in existing_roles if candidate.role_id == role_id), None)
        if existing:
            existing.is_deleted = False
            existing.assigned_at = existing.assigned_at or utcnow()
            existing.assigned_by = get_current_user_id(claims)
        else:
            session.add(
                UserRole(
                    user_id=user_id,
                    role_id=role_id,
                    at_organization_id=org_id,
                    assigned_at=utcnow(),
                    assigned_by=get_current_user_id(claims),
                )
            )
    await AuditService(session).write(org_id, "ROLE_ASSIGNED", "USER_ROLE", "User roles replaced", actor_user_id=get_current_user_id(claims), target_user_id=user_id)
    await session.commit()
    return api_response(request, {"role_ids": payload.role_ids})


@router.delete("/{user_id}/roles/{role_id}", dependencies=[Depends(require_permission("USER_UPDATE_API", "EXECUTE"))])
async def remove_user_role(user_id: int, role_id: int, request: Request, session: DbSession, claims: CurrentClaims):
    org_id = get_current_org_id(claims)
    user = await UserRepository(session).get_scoped(org_id, user_id)
    if not user:
        from app.core.errors import AppError

        raise AppError(404, "USER_NOT_FOUND", "User was not found")
    active_result = await session.execute(
        select(UserRole).where(UserRole.user_id == user_id, UserRole.is_deleted.is_(False))
    )
    active_roles = list(active_result.scalars())
    if len(active_roles) <= 1:
        from app.core.errors import AppError

        raise AppError(409, "LAST_ROLE_REMOVE_BLOCKED", "Cannot remove the last role")
    for user_role in active_roles:
        if user_role.role_id == role_id:
            user_role.is_deleted = True
    await AuditService(session).write(org_id, "ROLE_REMOVED", "USER_ROLE", "Role removed from user", actor_user_id=get_current_user_id(claims), target_user_id=user_id, resource_id=str(role_id))
    await session.commit()
    return api_response(request, {"removed": True})
