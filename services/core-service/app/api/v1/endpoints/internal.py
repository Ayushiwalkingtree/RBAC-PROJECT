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
async def rbac_check(
    payload: RbacCheckRequest,
    request: Request,
    session: DbSession,
    service_api_key: str | None = Header(default=None, alias="SERVICE_API_KEY"),
    x_service_token: str | None = Header(default=None, alias="X-Service-Token"),
):
    provided_key = x_service_token or service_api_key
    if provided_key != settings.service_api_key:
        raise AppError(401, "INVALID_SERVICE_API_KEY", "Service API key is invalid")

    cache_key = f"rbac:{payload.org_id}:{payload.user_id}:{payload.resource_key}:{payload.permission}"
    cached = await _cache_get(cache_key)
    if cached is not None:
        allowed = cached == "1"
        return api_response(request, RbacCheckResponse(allowed=allowed, reason="CACHE_ALLOWED" if allowed else "CACHE_DENIED").model_dump())

    user = await UserRepository(session).get_scoped(payload.org_id, payload.user_id)
    if not user or not user.is_active:
        await _cache_set(cache_key, "0")
        return api_response(request, RbacCheckResponse(allowed=False, reason="USER_NOT_FOUND_OR_INACTIVE").model_dump())

    role_ids = await UserRepository(session).role_ids_for_user(payload.user_id, payload.org_id)
    role_perms = await RoleRepository(session).permissions_for_roles(role_ids, payload.org_id)
    perms = merge_permissions([permission.permissions_json for permission in role_perms])
    allowed = has_permission(perms, payload.resource_key, payload.permission or "")
    await _cache_set(cache_key, "1" if allowed else "0")
    return api_response(request, RbacCheckResponse(allowed=allowed, reason="ALLOWED" if allowed else "DENIED").model_dump())


async def _redis_client():
    if not settings.redis_url:
        return None
    try:
        from redis.asyncio import Redis
    except ImportError:
        return None
    try:
        return Redis.from_url(settings.redis_url, decode_responses=True)
    except Exception:
        return None


async def _cache_get(key: str) -> str | None:
    redis = await _redis_client()
    if redis is None:
        return None
    try:
        return await redis.get(key)
    except Exception:
        return None
    finally:
        try:
            await redis.aclose()
        except Exception:
            pass


async def _cache_set(key: str, value: str) -> None:
    redis = await _redis_client()
    if redis is None:
        return
    try:
        await redis.set(key, value, ex=60)
    except Exception:
        pass
    finally:
        try:
            await redis.aclose()
        except Exception:
            pass
