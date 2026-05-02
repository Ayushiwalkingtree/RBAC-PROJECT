from fastapi import APIRouter, Depends, Request

from app.dependencies.auth import CurrentClaims, get_current_org_id, get_current_user_id
from app.dependencies.db import DbSession
from app.dependencies.permissions import require_permission
from app.repositories.organization_repository import OrganizationRepository
from app.schemas.organization import OrganizationPublic, OrganizationResponse, OrganizationUpdate
from app.services.organization_service import OrganizationService
from app.utils.response import api_response

router = APIRouter(tags=["organizations"])


def serialize_organization(org) -> dict:
    settings_json = org.settings_json or {}
    allowed_origins = settings_json.get("allowed_origins")
    if not isinstance(allowed_origins, list):
        allowed_origins = [origin for origin in (org.allowed_origins or "").split(",") if origin]
    return OrganizationResponse(
        id=org.id,
        org_id=org.id,
        org_name=org.org_name,
        org_code=org.org_code,
        timezone=settings_json.get("timezone") or org.timezone,
        plan=org.plan,
        settings_json=settings_json,
        subscription_ends_at=org.subscription_ends_at,
        logo_url=settings_json.get("logo_url") or org.logo_url,
        support_email=settings_json.get("support_email") or org.support_email,
        allowed_origins=allowed_origins,
        is_verified=org.is_verified,
    ).model_dump()


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
    return api_response(request, serialize_organization(org))


@router.put("/organization", dependencies=[Depends(require_permission("ORG_SETTINGS", "UPDATE"))])
async def update_organization(payload: OrganizationUpdate, request: Request, session: DbSession, claims: CurrentClaims):
    org = await OrganizationService(session).update_current(get_current_org_id(claims), payload, get_current_user_id(claims))
    return api_response(request, serialize_organization(org))
