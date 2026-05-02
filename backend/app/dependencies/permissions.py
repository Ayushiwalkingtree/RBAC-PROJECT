from typing import Annotated

from fastapi import Depends

from app.core.rbac import ensure_permission
from app.dependencies.auth import get_current_claims


def require_permission(resource_key: str, permission_key: str):
    async def dependency(claims: Annotated[dict, Depends(get_current_claims)]) -> None:
        ensure_permission(dict(claims.get("perms", {})), resource_key, permission_key)

    return dependency
