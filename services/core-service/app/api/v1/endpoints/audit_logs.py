from datetime import date

from fastapi import APIRouter, Depends, Request

from app.dependencies.auth import CurrentClaims, get_current_org_id
from app.dependencies.db import DbSession
from app.dependencies.permissions import require_permission
from app.repositories.audit_repository import AuditRepository
from app.utils.response import api_response

router = APIRouter(prefix="/audit-logs", tags=["audit_logs"])


@router.get("", dependencies=[Depends(require_permission("AUDIT_LOG_API", "READ"))])
async def list_audit_logs(
    request: Request,
    session: DbSession,
    claims: CurrentClaims,
    action: str | None = None,
    resource_type: str | None = None,
    user_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
):
    logs = await AuditRepository(session).list_scoped(
        get_current_org_id(claims),
        action=action,
        resource_type=resource_type,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
    )
    return api_response(request, logs)
