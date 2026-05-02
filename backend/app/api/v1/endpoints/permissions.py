from fastapi import APIRouter, Depends, Request

from app.dependencies.auth import CurrentClaims, get_current_org_id, get_current_user_id
from app.dependencies.db import DbSession
from app.dependencies.permissions import require_permission
from app.schemas.permission import RolePermissionsUpdate
from app.services.permission_service import PermissionService
from app.utils.response import api_response

router = APIRouter(prefix="/roles/{role_id}/permissions", tags=["permissions"])


@router.get("", dependencies=[Depends(require_permission("PERM_GRANT_API", "READ"))])
async def get_permissions(role_id: int, request: Request, session: DbSession, claims: CurrentClaims):
    permissions = await PermissionService(session).get_role_permissions(get_current_org_id(claims), role_id)
    return api_response(request, permissions)


@router.put("", dependencies=[Depends(require_permission("PERM_GRANT_API", "CONFIGURE"))])
async def replace_permissions(role_id: int, payload: RolePermissionsUpdate, request: Request, session: DbSession, claims: CurrentClaims):
    permissions = await PermissionService(session).replace_role_permissions(
        get_current_org_id(claims),
        role_id,
        payload.permissions_json,
        get_current_user_id(claims),
    )
    return api_response(request, permissions)
