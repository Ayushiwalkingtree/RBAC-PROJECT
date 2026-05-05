from fastapi import APIRouter, Request

from app.core.rbac import is_platform_super_admin
from app.dependencies.auth import CurrentClaims, get_current_org_id, get_current_user_id
from app.dependencies.db import DbSession
from app.schemas.navigation import NavigationOrderUpdate
from app.services.navigation_order_service import NavigationOrderService
from app.utils.response import api_response

router = APIRouter(prefix="/navigation", tags=["navigation"])


def can_manage_nav_order(claims: dict) -> bool:
    perms = dict(claims.get("perms", {}))
    return is_platform_super_admin(str(claims.get("org_code", "")), list(claims.get("roles", []))) or "VIEW" in perms.get("NAV_ORDER_MENU", [])


@router.get("/order")
async def get_navigation_order(request: Request, session: DbSession, claims: CurrentClaims):
    if not can_manage_nav_order(claims):
        from app.core.errors import AppError

        raise AppError(403, "FORBIDDEN", "Missing navigation order access")
    is_super_admin = is_platform_super_admin(str(claims.get("org_code", "")), list(claims.get("roles", [])))
    tree = await NavigationOrderService(session).list_order(
        get_current_org_id(claims),
        dict(claims.get("perms", {})),
        is_platform_super_admin=is_super_admin,
    )
    return api_response(request, tree)


@router.put("/order")
async def update_navigation_order(payload: NavigationOrderUpdate, request: Request, session: DbSession, claims: CurrentClaims):
    perms = dict(claims.get("perms", {}))
    is_super_admin = is_platform_super_admin(str(claims.get("org_code", "")), list(claims.get("roles", [])))
    if not is_super_admin and "UPDATE" not in perms.get("NAV_ORDER_API", []):
        from app.core.errors import AppError

        raise AppError(403, "FORBIDDEN", "Missing navigation order update access")
    await NavigationOrderService(session).save_order(
        get_current_org_id(claims),
        [item.model_dump() for item in payload.items],
        get_current_user_id(claims),
        perms,
        is_platform_super_admin=is_super_admin,
    )
    tree = await NavigationOrderService(session).list_order(
        get_current_org_id(claims),
        perms,
        is_platform_super_admin=is_super_admin,
    )
    return api_response(request, tree)
