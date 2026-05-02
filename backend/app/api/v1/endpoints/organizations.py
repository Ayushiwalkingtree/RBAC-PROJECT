from fastapi import APIRouter, Depends, Request

from app.dependencies.auth import CurrentClaims, get_current_org_id, get_current_user_id
from app.dependencies.db import DbSession
from app.dependencies.permissions import require_permission
from app.repositories.organization_repository import OrganizationRepository
from app.schemas.organization import OrganizationPublic, OrganizationUpdate
from app.services.organization_service import OrganizationService
from app.utils.response import api_response

router = APIRouter(tags=["organizations"])


@router.get("/organizations/public")
async def public_organizations(request: Request, session: DbSession):
    orgs = await OrganizationRepository(session).list_public()
    return api_response(
        request,
        [OrganizationPublic(org_id=org.id, org_name=org.org_name, org_code=org.org_code).model_dump() for org in orgs],
    )


@router.get("/organization", dependencies=[Depends(require_permission("ORG_SETTINGS", "VIEW"))])
async def current_organization(request: Request, session: DbSession, claims: CurrentClaims):
    org = await OrganizationRepository(session).get(get_current_org_id(claims))
    return api_response(request, org)


@router.put("/organization", dependencies=[Depends(require_permission("ORG_SETTINGS", "UPDATE"))])
async def update_organization(payload: OrganizationUpdate, request: Request, session: DbSession, claims: CurrentClaims):
    org = await OrganizationService(session).update_current(get_current_org_id(claims), payload, get_current_user_id(claims))
    return api_response(request, org)
