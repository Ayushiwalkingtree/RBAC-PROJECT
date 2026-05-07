from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine, Base
from app.core.logging import get_logger

logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Notification Service...")
    if settings.AUTO_CREATE_TABLES:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables verified.")
    logger.info("Notification Service ready.")
    yield
    await engine.dispose()

app = FastAPI(
    title="Notification Service",
    description="""
## Notification Service API v2.0

JWT-scoped multi-tenant email notification microservice.

### Tenant Resolution
**No org_id in any URL.** Every request extracts `org` and `sub` from the Bearer JWT.

### Quick Start
1. Get a JWT from the Core Service login endpoint  
2. Use `Authorization: Bearer <token>` header  
3. Create an SMTP config → Create a template → Send email

### Key Endpoints
| Resource | Path |
|----------|------|
| SMTP Configs | `/api/v1/email-configs` |
| Templates | `/api/v1/email-templates` |
| Entity Links | `/api/v1/email-links` |
| Send Email | `/api/v1/emails/send` |
| Jobs/Log | `/api/v1/emails/jobs` |
    """,
    version="2.0.0",
    openapi_tags=[
        {"name": "health", "description": "Health and readiness probes"},
        {"name": "smtp-configs", "description": "Per-tenant SMTP provider configuration"},
        {"name": "templates", "description": "Jinja2 email template management with version history"},
        {"name": "entity-links", "description": "Entity-event → template mappings for automatic dispatch"},
        {"name": "send", "description": "Send template-based or raw emails with optional attachments"},
        {"name": "jobs", "description": "Send log, job tracking, re-queue, and cancel"},
        {"name": "webhooks", "description": "Provider delivery webhook ingest (SendGrid, SES, etc.)"},
    ],
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(api_router, prefix="/api/v1")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"success": False, "data": None, "error": {"code": "INTERNAL_ERROR", "message": "Internal server error", "details": []}, "meta": {}})


from fastapi import HTTPException
from fastapi.responses import JSONResponse as _JSONResponse

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Convert HTTPException to standard envelope format."""
    detail = exc.detail
    if isinstance(detail, dict) and "error" in detail:
        # Already in our format — unwrap and return as envelope
        return _JSONResponse(status_code=exc.status_code, content={
            "success": False,
            "data": None,
            "error": detail["error"],
            "meta": {},
        })
    # Plain string detail
    return _JSONResponse(status_code=exc.status_code, content={
        "success": False,
        "data": None,
        "error": {"code": "HTTP_ERROR", "message": str(detail), "details": []},
        "meta": {},
    })
