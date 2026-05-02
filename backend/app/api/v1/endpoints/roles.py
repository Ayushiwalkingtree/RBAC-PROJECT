from fastapi import APIRouter, Depends, Request

from app.dependencies.auth import CurrentClaims, get_current_org_id, get_current_user_id
from app.dependencies.db import DbSession
from app.dependencies.permissions import require_permission
from app.repositories.role_repository import RoleRepository
from app.schemas.role import RoleCreate, RoleUpdate
from app.services.role_service import RoleService
from app.utils.response import api_response

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("", dependencies=[Depends(require_permission("ROLE_MANAGE_API", "READ"))])
async def list_roles(request: Request, session: DbSession, claims: CurrentClaims):
    return api_response(request, await RoleRepository(session).list_scoped(get_current_org_id(claims)))


@router.post("", dependencies=[Depends(require_permission("ROLE_MANAGE_API", "CREATE"))])
async def create_role(payload: RoleCreate, request: Request, session: DbSession, claims: CurrentClaims):
    role = await RoleService(session).create(get_current_org_id(claims), payload, get_current_user_id(claims))
    return api_response(request, role)


@router.put("/{role_id}", dependencies=[Depends(require_permission("ROLE_MANAGE_API", "UPDATE"))])
async def update_role(role_id: int, payload: RoleUpdate, request: Request, session: DbSession, claims: CurrentClaims):
    role = await RoleService(session).update(get_current_org_id(claims), role_id, payload)
    return api_response(request, role)


@router.delete("/{role_id}", dependencies=[Depends(require_permission("ROLE_MANAGE_API", "DELETE"))])
async def delete_role(role_id: int, request: Request, session: DbSession, claims: CurrentClaims):
    await RoleService(session).delete(get_current_org_id(claims), role_id)
    return api_response(request, {"deleted": True})
