from fastapi import APIRouter

from app.api.v1.endpoints import audit_logs, auth, health, internal, navigation, organizations, permissions, platform_organizations, platform_tenant_admins, resources, roles, signup, tenant_access, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(signup.router)
api_router.include_router(auth.router)
api_router.include_router(organizations.router)
api_router.include_router(resources.router)
api_router.include_router(roles.router)
api_router.include_router(permissions.router)
api_router.include_router(navigation.router)
api_router.include_router(platform_organizations.router)
api_router.include_router(platform_tenant_admins.router)
api_router.include_router(tenant_access.router)
api_router.include_router(users.router)
api_router.include_router(audit_logs.router)
api_router.include_router(internal.router)
