from fastapi import APIRouter, Depends, Request

from app.dependencies.auth import CurrentClaims, get_current_org_id, get_current_user_id
from app.dependencies.db import DbSession
from app.dependencies.permissions import require_permission
from app.schemas.permission import RolePermissionsUpdate
from app.services.permission_service import PermissionService
from app.core.rbac import is_platform_super_admin
from app.utils.response import api_response

router = APIRouter(prefix="/roles/{role_id}/permissions", tags=["permissions"])


@router.get("", dependencies=[Depends(require_permission("PERM_GRANT_API", "READ"))])
async def get_permissions(role_id: int, request: Request, session: DbSession, claims: CurrentClaims):
    is_super_admin = is_platform_super_admin(str(claims.get("org_code", "")), list(claims.get("roles", [])))
    permissions = await PermissionService(session).get_role_permissions(
        get_current_org_id(claims),
        role_id,
        visible_permissions=dict(claims.get("perms", {})),
        include_all_resources=is_super_admin,
        include_all_permission_keys=is_super_admin,
    )
    return api_response(request, permissions)


@router.put("", dependencies=[Depends(require_permission("PERM_GRANT_API", "CONFIGURE"))])
async def replace_permissions(role_id: int, payload: RolePermissionsUpdate, request: Request, session: DbSession, claims: CurrentClaims):
    is_super_admin = is_platform_super_admin(str(claims.get("org_code", "")), list(claims.get("roles", [])))
    permissions = await PermissionService(session).replace_role_permissions(
        get_current_org_id(claims),
        role_id,
        payload.permissions_json,
        get_current_user_id(claims),
        grantable_permissions=dict(claims.get("perms", {})),
        include_all_grants=is_super_admin,
    )
    return api_response(request, permissions)
