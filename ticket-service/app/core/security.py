import asyncio
import json
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

from fastapi import Depends, Header, HTTPException
from jose import JWTError, jwt

from app.core.config import settings


def decode_jwt(token: str) -> dict[str, Any]:
    try:
        claims = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc

    try:
        user_id = int(claims["sub"])
        org_id = int(claims["org"])
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Token is missing user or organization claims") from exc

    perms = claims.get("perms") or {}
    if not isinstance(perms, dict):
        perms = {}
    return {
        "id": user_id,
        "org": org_id,
        "org_code": claims.get("org_code"),
        "roles": claims.get("roles") or [],
        "perms": perms,
        "claims": claims,
    }


def has_permission(user: dict[str, Any], resource: str, action: str) -> bool:
    permissions = user.get("perms", {}).get(resource, [])
    return action.upper() in {str(permission).upper() for permission in permissions}


async def get_current_user(authorization: str | None = Header(default=None, alias="Authorization")) -> dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return decode_jwt(authorization.split(" ", 1)[1].strip())


async def require_permission(
    user: dict[str, Any],
    resource_key: str,
    permission: str,
) -> dict[str, Any]:
    if has_permission(user, resource_key, permission):
        return user
    if await live_rbac_check(user, resource_key, permission):
        return user
    raise HTTPException(status_code=403, detail="Forbidden")


async def live_rbac_check(user: dict[str, Any], resource_key: str, permission: str) -> bool:
    payload = {
        "org_id": user["org"],
        "user_id": user["id"],
        "resource_key": resource_key,
        "permission": permission,
    }

    def post_check() -> bool:
        request = Request(
            f"{settings.core_service_url}/internal/rbac/check",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "X-Service-Token": settings.service_api_key,
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=3) as response:
                body = json.loads(response.read().decode("utf-8"))
        except (OSError, URLError, json.JSONDecodeError):
            return False
        return bool((body.get("data") or {}).get("allowed"))

    return await asyncio.to_thread(post_check)


def PermissionDependency(resource_key: str, permission: str):
    async def dependency(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        return await require_permission(user, resource_key, permission)

    return dependency
