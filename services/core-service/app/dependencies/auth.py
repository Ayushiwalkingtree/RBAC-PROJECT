from typing import Annotated, Any

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.rbac import is_platform_super_admin
from app.core.database import get_session
from app.services.auth_service import AuthService

bearer = HTTPBearer(auto_error=False)


async def get_current_claims(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict[str, Any]:
    if not credentials:
        raise AppError(401, "UNAUTHENTICATED", "Missing bearer token")
    try:
        return AuthService(session).decode_access(credentials.credentials)
    except Exception as exc:
        raise AppError(401, "INVALID_TOKEN", "Access token is invalid") from exc


CurrentClaims = Annotated[dict[str, Any], Depends(get_current_claims)]


def get_current_org_id(claims: CurrentClaims) -> int:
    return int(claims["org"])


def get_current_user_id(claims: CurrentClaims) -> int:
    return int(claims["sub"])


def require_platform_super_admin(claims: CurrentClaims) -> None:
    if not is_platform_super_admin(str(claims.get("org_code")), list(claims.get("roles", []))):
        raise AppError(403, "PLATFORM_SUPER_ADMIN_REQUIRED", "Only platform super admin can perform this action")
