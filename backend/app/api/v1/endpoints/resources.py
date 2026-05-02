from fastapi import APIRouter, Request

from app.dependencies.auth import CurrentClaims, get_current_user_id, require_platform_super_admin
from app.dependencies.db import DbSession
from app.repositories.resource_repository import ResourceRepository
from app.schemas.resource import ResourceCreate, ResourceUpdate
from app.services.resource_service import ResourceService
from app.utils.response import api_response

router = APIRouter(prefix="/resources", tags=["resources"])


@router.get("")
async def list_resources(request: Request, session: DbSession, _: CurrentClaims):
    return api_response(request, await ResourceRepository(session).list_active())


@router.post("")
async def create_resource(payload: ResourceCreate, request: Request, session: DbSession, claims: CurrentClaims):
    require_platform_super_admin(claims)
    resource = await ResourceService(session).create(payload, get_current_user_id(claims))
    return api_response(request, resource)


@router.put("/{resource_id}")
async def update_resource(resource_id: int, payload: ResourceUpdate, request: Request, session: DbSession, claims: CurrentClaims):
    require_platform_super_admin(claims)
    resource = await ResourceService(session).update(resource_id, payload, get_current_user_id(claims))
    return api_response(request, resource)


@router.delete("/{resource_id}")
async def delete_resource(resource_id: int, request: Request, session: DbSession, claims: CurrentClaims):
    require_platform_super_admin(claims)
    await ResourceService(session).delete(resource_id, get_current_user_id(claims))
    return api_response(request, {"deleted": True})
