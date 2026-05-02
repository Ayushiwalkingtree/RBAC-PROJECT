from fastapi import APIRouter, Request

from app.dependencies.auth import CurrentClaims, get_current_user_id, require_platform_super_admin
from app.dependencies.db import DbSession
from app.repositories.resource_repository import ResourceRepository
from app.schemas.resource import ResourceCreate, ResourceResponse, ResourceUpdate
from app.services.resource_service import ResourceService
from app.utils.response import api_response

router = APIRouter(prefix="/resources", tags=["resources"])


def permission_keys(permissions: list) -> list[str]:
    keys: list[str] = []
    for permission in permissions:
        if isinstance(permission, dict):
            key = permission.get("key")
        else:
            key = permission
        if key:
            keys.append(str(key).upper())
    return keys


async def serialize_resource(repo: ResourceRepository, resource) -> dict:
    permissions = await repo.permission_by_resource_id(resource.id)
    return ResourceResponse(
        id=resource.id,
        resource_id=resource.id,
        resource_key=resource.resource_key,
        resource_name=resource.resource_name,
        resource_type=resource.resource_type,
        resource_group=resource.resource_group,
        description=resource.description,
        allowed_permissions=permission_keys(permissions.permissions_json) if permissions else [],
        http_method=resource.http_method,
        api_path=resource.api_path,
        microservice=resource.microservice,
        is_ui_visible=resource.is_ui_visible,
        is_active=resource.is_active,
        ui_path=resource.ui_path,
        icon=resource.icon,
        sequence_no=resource.sequence_no,
        parent_resource_key=resource.parent_resource_key,
    ).model_dump()


@router.get("")
async def list_resources(request: Request, session: DbSession, _: CurrentClaims):
    repo = ResourceRepository(session)
    return api_response(request, [await serialize_resource(repo, resource) for resource in await repo.list_active()])


@router.post("")
async def create_resource(payload: ResourceCreate, request: Request, session: DbSession, claims: CurrentClaims):
    require_platform_super_admin(claims)
    resource = await ResourceService(session).create(payload, get_current_user_id(claims))
    return api_response(request, await serialize_resource(ResourceRepository(session), resource))


@router.put("/{resource_id}")
async def update_resource(resource_id: int, payload: ResourceUpdate, request: Request, session: DbSession, claims: CurrentClaims):
    require_platform_super_admin(claims)
    resource = await ResourceService(session).update(resource_id, payload, get_current_user_id(claims))
    return api_response(request, await serialize_resource(ResourceRepository(session), resource))


@router.delete("/{resource_id}")
async def delete_resource(resource_id: int, request: Request, session: DbSession, claims: CurrentClaims):
    require_platform_super_admin(claims)
    await ResourceService(session).delete(resource_id, get_current_user_id(claims))
    return api_response(request, {"deleted": True})
