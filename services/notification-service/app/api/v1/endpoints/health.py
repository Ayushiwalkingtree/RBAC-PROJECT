from fastapi import APIRouter
from datetime import datetime, timezone
router = APIRouter(tags=["health"])

@router.get("/health", summary="Liveness probe")
async def health():
    return {"status": "ok", "service": "notification-service", "timestamp": datetime.now(timezone.utc).isoformat()}

@router.get("/healthz", summary="Readiness probe")
async def healthz():
    return {"status": "ready"}
