from fastapi import APIRouter

from app.api.v1.endpoints import audit_logs, auth, internal, organizations, permissions, resources, roles, signup, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(signup.router)
api_router.include_router(auth.router)
api_router.include_router(organizations.router)
api_router.include_router(resources.router)
api_router.include_router(roles.router)
api_router.include_router(permissions.router)
api_router.include_router(users.router)
api_router.include_router(audit_logs.router)
api_router.include_router(internal.router)
