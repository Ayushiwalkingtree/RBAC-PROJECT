from fastapi import APIRouter, Depends, Request

from app.dependencies.auth import CurrentClaims, get_current_org_id, get_current_user_id
from app.dependencies.db import DbSession
from app.dependencies.permissions import require_permission
from app.models.user import UserRole
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserResponse, UserRolesUpdate, UserUpdate
from app.services.audit_service import AuditService
from app.services.user_service import UserService
from app.utils.response import api_response

router = APIRouter(prefix="/users", tags=["users"])


def serialize_user(user, role_ids: list[int]) -> dict:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        title=user.title,
        department=user.department,
        is_active=user.is_active,
        is_email_verified=user.is_email_verified,
        role_ids=role_ids,
    ).model_dump()


@router.get("", dependencies=[Depends(require_permission("USER_LIST_API", "READ"))])
async def list_users(request: Request, session: DbSession, claims: CurrentClaims):
    repo = UserRepository(session)
    users = await repo.list_scoped(get_current_org_id(claims))
    return api_response(request, [serialize_user(user, await repo.role_ids_for_user(user.id)) for user in users])


@router.post("", dependencies=[Depends(require_permission("USER_CREATE_API", "EXECUTE"))])
async def create_user(payload: UserCreate, request: Request, session: DbSession, claims: CurrentClaims):
    user, token = await UserService(session).create(get_current_org_id(claims), payload, get_current_user_id(claims))
    return api_response(request, {"user": serialize_user(user, payload.role_ids), "verification_token": token})


@router.get("/{user_id}", dependencies=[Depends(require_permission("USER_LIST_API", "READ"))])
async def get_user(user_id: int, request: Request, session: DbSession, claims: CurrentClaims):
    repo = UserRepository(session)
    user = await repo.get_scoped(get_current_org_id(claims), user_id)
    if not user:
        from app.core.errors import AppError

        raise AppError(404, "USER_NOT_FOUND", "User was not found")
    return api_response(request, serialize_user(user, await repo.role_ids_for_user(user.id)))


@router.put("/{user_id}", dependencies=[Depends(require_permission("USER_UPDATE_API", "EXECUTE"))])
async def update_user(user_id: int, payload: UserUpdate, request: Request, session: DbSession, claims: CurrentClaims):
    user = await UserService(session).update(get_current_org_id(claims), user_id, payload)
    return api_response(request, serialize_user(user, await UserRepository(session).role_ids_for_user(user.id)))


@router.delete("/{user_id}", dependencies=[Depends(require_permission("USER_DELETE_API", "EXECUTE"))])
async def delete_user(user_id: int, request: Request, session: DbSession, claims: CurrentClaims):
    await UserService(session).delete(get_current_org_id(claims), user_id)
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
    for existing in user.roles:
        existing.is_deleted = True
    for role_id in payload.role_ids:
        session.add(UserRole(user_id=user_id, role_id=role_id, at_organization_id=org_id))
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
    active_roles = [user_role for user_role in user.roles if not user_role.is_deleted]
    if len(active_roles) <= 1:
        from app.core.errors import AppError

        raise AppError(409, "LAST_ROLE_REMOVE_BLOCKED", "Cannot remove the last role")
    for user_role in active_roles:
        if user_role.role_id == role_id:
            user_role.is_deleted = True
    await AuditService(session).write(org_id, "ROLE_REMOVED", "USER_ROLE", "Role removed from user", actor_user_id=get_current_user_id(claims), target_user_id=user_id, resource_id=str(role_id))
    await session.commit()
    return api_response(request, {"removed": True})
