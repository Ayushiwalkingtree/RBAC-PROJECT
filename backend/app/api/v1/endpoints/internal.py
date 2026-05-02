from fastapi import APIRouter, Header, Request

from app.core.config import settings
from app.core.errors import AppError
from app.core.rbac import has_permission, merge_permissions
from app.dependencies.db import DbSession
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.permission import RbacCheckRequest, RbacCheckResponse
from app.utils.response import api_response

router = APIRouter(prefix="/internal/rbac", tags=["internal"])


@router.post("/check")
async def rbac_check(payload: RbacCheckRequest, request: Request, session: DbSession, service_api_key: str | None = Header(default=None, alias="SERVICE_API_KEY")):
    if service_api_key != settings.service_api_key:
        raise AppError(401, "INVALID_SERVICE_API_KEY", "Service API key is invalid")
    role_ids = await UserRepository(session).role_ids_for_user(payload.user_id)
    role_perms = await RoleRepository(session).permissions_for_roles(role_ids)
    perms = merge_permissions([permission.permissions_json for permission in role_perms])
    return api_response(request, RbacCheckResponse(allowed=has_permission(perms, payload.resource_key, payload.permission_key)).model_dump())
