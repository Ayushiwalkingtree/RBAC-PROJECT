from fastapi import APIRouter, Request

from app.api.v1.endpoints.roles import serialize_role
from app.dependencies.auth import CurrentClaims, require_platform_super_admin
from app.dependencies.db import DbSession
from app.repositories.organization_repository import OrganizationRepository
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.utils.response import api_response

router = APIRouter(prefix="/tenant-access", tags=["tenant_access"])


@router.get("/organizations")
async def list_tenant_access_organizations(request: Request, session: DbSession, claims: CurrentClaims):
    require_platform_super_admin(claims)
    organizations = await OrganizationRepository(session).list_public()
    return api_response(
        request,
        [
            {
                "org_id": org.id,
                "org_code": org.org_code,
                "org_name": org.org_name,
                "is_verified": org.is_verified,
                "is_active": org.is_active,
            }
            for org in organizations
            if org.org_code != "PLATFORM"
        ],
    )


@router.get("/organizations/{org_id}/users")
async def list_tenant_access_organization_users(
    org_id: int,
    request: Request,
    session: DbSession,
    claims: CurrentClaims,
):
    require_platform_super_admin(claims)
    user_repo = UserRepository(session)
    users = await user_repo.list_scoped(org_id)
    roles = await RoleRepository(session).list_scoped(org_id)
    role_by_id = {role.id: role.role_code for role in roles}
    rows = []
    for user in users:
        role_ids = await user_repo.role_ids_for_user(user.id, org_id)
        rows.append(
            {
                "id": user.id,
                "user_id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "title": user.title,
                "department": user.department,
                "is_active": user.is_active,
                "is_email_verified": user.is_email_verified,
                "role_ids": role_ids,
                "role_codes": [role_by_id[role_id] for role_id in role_ids if role_id in role_by_id],
            }
        )
    return api_response(request, rows)


@router.get("/organizations/{org_id}/roles")
async def list_tenant_access_organization_roles(
    org_id: int,
    request: Request,
    session: DbSession,
    claims: CurrentClaims,
):
    require_platform_super_admin(claims)
    roles = await RoleRepository(session).list_scoped(org_id)
    return api_response(request, [serialize_role(role) for role in roles])
