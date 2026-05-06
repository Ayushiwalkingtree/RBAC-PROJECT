from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.rbac import build_nav_tree, merge_permissions
from app.models.refresh_token import RefreshToken
from app.repositories.navigation_repository import NavigationRepository
from app.repositories.organization_repository import OrganizationRepository
from app.repositories.resource_repository import ResourceRepository
from app.repositories.role_repository import RoleRepository
from app.repositories.token_repository import TokenRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthResponse, CurrentOrg, CurrentUser, LoginRequest
from app.services.audit_service import AuditService
from app.utils.datetime import days_from_now, minutes_from_now, utcnow
from app.utils.password import verify_password
from app.utils.tokens import create_access_token, create_refresh_token, decode_token, hash_token


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.org_repo = OrganizationRepository(session)
        self.user_repo = UserRepository(session)
        self.role_repo = RoleRepository(session)
        self.resource_repo = ResourceRepository(session)
        self.nav_repo = NavigationRepository(session)
        self.token_repo = TokenRepository(session)
        self.audit = AuditService(session)

    async def _session_access(self, org, user) -> tuple[list[str], dict[str, list[str]], list[dict]]:
        role_ids = await self.user_repo.role_ids_for_user(user.id, org.id)
        role_perms = await self.role_repo.permissions_for_roles(role_ids, org.id)
        roles = await self.role_repo.list_scoped(org.id)
        current_roles = [role.role_code for role in roles if role.id in role_ids]
        perms = merge_permissions([permission.permissions_json for permission in role_perms])
        resources = await self.resource_repo.list_active()
        nav = build_nav_tree(perms, resources, await self.nav_repo.combined_override_map(org.id, user.id))
        return current_roles, perms, nav

    async def login(self, payload: LoginRequest, user_agent: str | None = None) -> AuthResponse:
        org = await self.org_repo.get_by_code(payload.org_code)
        if not org or not org.is_active:
            raise AppError(401, "INVALID_CREDENTIALS", "Wrong email or password")
        user = await self.user_repo.get_by_email(org.id, str(payload.email))
        if not user:
            raise AppError(401, "INVALID_CREDENTIALS", "Wrong email or password")
        if not user.is_email_verified:
            raise AppError(403, "EMAIL_NOT_VERIFIED", "Verify email before login")
        if not user.is_active:
            raise AppError(403, "USER_INACTIVE", "User is inactive")
        if user.locked_until and user.locked_until > utcnow():
            raise AppError(423, "ACCOUNT_LOCKED", "Account is locked")
        if not verify_password(payload.password, user.password_hash):
            user.failed_attempts += 1
            if user.failed_attempts >= 5:
                user.locked_until = minutes_from_now(30)
            await self.session.commit()
            code = "ACCOUNT_LOCKED" if user.locked_until else "INVALID_CREDENTIALS"
            raise AppError(423 if user.locked_until else 401, code, "Wrong email or password")

        current_roles, perms, nav = await self._session_access(org, user)
        access_token, expires_at = create_access_token(
            {"sub": str(user.id), "org": str(org.id), "org_code": org.org_code, "roles": current_roles, "perms": perms, "nav": nav}
        )
        refresh_token, refresh_expires_at = create_refresh_token()
        self.token_repo.add(
            RefreshToken(
                at_organization_id=org.id,
                user_id=user.id,
                token_hash=hash_token(refresh_token),
                issued_at=utcnow(),
                expires_at=datetime.fromisoformat(refresh_expires_at),
                device_info=user_agent,
                user_agent=user_agent,
            )
        )
        user.failed_attempts = 0
        user.locked_until = None
        user.last_login_at = utcnow()
        await self.audit.write(
            org.id,
            "USER_LOGIN",
            "SESSION",
            f"{user.email} logged in",
            actor_user_id=user.id,
            user_agent=user_agent,
        )
        await self.session.commit()
        return self._auth_response(access_token, refresh_token, expires_at, user, org, current_roles, perms, nav)

    async def refresh(self, refresh_token: str) -> AuthResponse:
        stored = await self.token_repo.get_by_hash(hash_token(refresh_token))
        if not stored or stored.revoked_at or stored.expires_at <= utcnow():
            raise AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid")
        user = await self.user_repo.get_scoped(stored.at_organization_id, stored.user_id)
        org = await self.org_repo.get(stored.at_organization_id)
        if not user or not org:
            raise AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid")
        current_roles, perms, nav = await self._session_access(org, user)
        access_token, expires_at = create_access_token(
            {"sub": str(user.id), "org": str(org.id), "org_code": org.org_code, "roles": current_roles, "perms": perms, "nav": nav}
        )
        new_refresh, refresh_expires_at = create_refresh_token()
        stored.revoked_at = utcnow()
        self.token_repo.add(
            RefreshToken(
                at_organization_id=org.id,
                user_id=user.id,
                token_hash=hash_token(new_refresh),
                issued_at=utcnow(),
                expires_at=datetime.fromisoformat(refresh_expires_at),
                rotated_from_id=stored.id,
                device_info=stored.device_info or stored.user_agent,
                user_agent=stored.user_agent,
            )
        )
        await self.session.commit()
        return self._auth_response(access_token, new_refresh, expires_at, user, org, current_roles, perms, nav)

    async def current_claims(self, org_id: int, user_id: int) -> dict:
        org = await self.org_repo.get(org_id)
        user = await self.user_repo.get_scoped(org_id, user_id)
        if not org or not user:
            raise AppError(401, "INVALID_SESSION", "Session user is no longer available")
        current_roles, perms, nav = await self._session_access(org, user)
        return {
            "sub": str(user.id),
            "org": str(org.id),
            "org_code": org.org_code,
            "roles": current_roles,
            "perms": perms,
            "nav": nav,
        }

    async def logout(self, refresh_token: str, actor_user_id: int | None = None) -> None:
        stored = await self.token_repo.get_by_hash(hash_token(refresh_token))
        if stored and not stored.revoked_at:
            stored.revoked_at = utcnow()
            await self.audit.write(stored.at_organization_id, "USER_LOGOUT", "SESSION", "User logged out", actor_user_id=actor_user_id)
        await self.session.commit()

    def decode_access(self, token: str) -> dict:
        return decode_token(token)

    def _auth_response(self, access_token: str, refresh_token: str, expires_at: str, user, org, roles, perms, nav) -> AuthResponse:
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
            user=CurrentUser(
                id=user.id,
                user_id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_email_verified=user.is_email_verified,
                is_active=user.is_active,
            ),
            org=CurrentOrg(id=org.id, org_id=org.id, org_code=org.org_code, org_name=org.org_name),
            roles=roles,
            perms=perms,
            nav=nav,
        )
