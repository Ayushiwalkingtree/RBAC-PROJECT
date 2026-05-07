from fastapi import APIRouter
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.email_configs import router as configs_router
from app.api.v1.endpoints.templates import router as templates_router
from app.api.v1.endpoints.operations import links_router, send_router, jobs_router, webhooks_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(configs_router)
api_router.include_router(templates_router)
api_router.include_router(links_router)
api_router.include_router(send_router)
api_router.include_router(jobs_router)
api_router.include_router(webhooks_router)
