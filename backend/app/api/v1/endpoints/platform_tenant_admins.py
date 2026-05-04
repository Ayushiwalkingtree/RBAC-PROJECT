from fastapi import APIRouter, Request

from app.dependencies.auth import CurrentClaims, get_current_user_id, require_platform_super_admin
from app.dependencies.db import DbSession
from app.schemas.permission import RolePermissionsUpdate
from app.services.platform_tenant_admin_service import PlatformTenantAdminService
from app.utils.response import api_response

router = APIRouter(prefix="/platform/tenant-admins", tags=["platform_tenant_admins"])


@router.get("")
async def list_tenant_admins(request: Request, session: DbSession, claims: CurrentClaims):
    require_platform_super_admin(claims)
    rows = await PlatformTenantAdminService(session).list_tenant_admins()
    return api_response(request, rows)


@router.get("/{org_id}/permissions")
async def get_tenant_admin_permissions(org_id: int, request: Request, session: DbSession, claims: CurrentClaims):
    require_platform_super_admin(claims)
    matrix = await PlatformTenantAdminService(session).get_permissions(org_id)
    return api_response(request, matrix)


@router.put("/{org_id}/permissions")
async def update_tenant_admin_permissions(
    org_id: int,
    payload: RolePermissionsUpdate,
    request: Request,
    session: DbSession,
    claims: CurrentClaims,
):
    require_platform_super_admin(claims)
    matrix = await PlatformTenantAdminService(session).update_permissions(
        org_id,
        payload.permissions_json,
        get_current_user_id(claims),
        allow_platform_resource_delegation=payload.allow_platform_resource_delegation,
    )
    return api_response(request, matrix)
