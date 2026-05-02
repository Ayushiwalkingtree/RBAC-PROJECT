from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models.organization import Organization
from app.models.role import Role, RolePermission
from app.models.user import User, UserRole
from app.repositories.organization_repository import OrganizationRepository
from app.repositories.user_repository import UserRepository
from app.schemas.signup import SignupRequest, SignupResponse
from app.services.audit_service import AuditService
from app.utils.password import hash_password
from app.utils.tokens import new_verification_token

CORE_ORG_ADMIN_PERMISSIONS: dict[str, list[str]] = {
    "USER_LIST_API": ["READ"],
    "USER_CREATE_API": ["EXECUTE"],
    "USER_UPDATE_API": ["EXECUTE"],
    "USER_DELETE_API": ["EXECUTE"],
    "ROLE_MANAGE_API": ["CREATE", "READ", "UPDATE", "DELETE"],
    "PERM_GRANT_API": ["READ", "CONFIGURE"],
    "ORG_SETTINGS": ["VIEW", "UPDATE"],
    "AUDIT_LOG_API": ["READ"],
    "USER_MENU": ["VIEW", "CREATE", "READ", "UPDATE", "DELETE"],
    "ADMIN_MENU": ["VIEW"],
}

_verification_tokens: dict[str, tuple[int, int]] = {}


class SignupService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.org_repo = OrganizationRepository(session)
        self.user_repo = UserRepository(session)
        self.audit = AuditService(session)

    async def signup(self, payload: SignupRequest) -> SignupResponse:
        org_code = payload.org_code.strip().upper()
        if await self.org_repo.get_by_code(org_code):
            raise AppError(409, "ORG_CODE_EXISTS", "Organization code already exists")

        org = Organization(
            org_code=org_code,
            org_name=payload.org_name.strip(),
            timezone=payload.timezone,
            plan=payload.plan.upper(),
            support_email=str(payload.admin_email),
        )
        self.org_repo.add(org)
        await self.session.flush()

        role = Role(
            at_organization_id=org.id,
            role_code="ORG_ADMIN",
            role_name="Organization Admin",
            description="Tenant administrator",
            is_system=True,
        )
        self.session.add(role)
        await self.session.flush()
        self.session.add(RolePermission(role_id=role.id, permissions_json=CORE_ORG_ADMIN_PERMISSIONS))

        user = User(
            at_organization_id=org.id,
            email=str(payload.admin_email).lower(),
            password_hash=hash_password(payload.password),
            full_name=payload.admin_name.strip(),
            title="Organization Admin",
            department="Administration",
            is_email_verified=False,
        )
        self.user_repo.add(user)
        await self.session.flush()
        self.user_repo.add_role(UserRole(user_id=user.id, role_id=role.id, at_organization_id=org.id))

        token = new_verification_token()
        _verification_tokens[token] = (org.id, user.id)
        await self.audit.write(
            org.id,
            "ORG_CREATED",
            "ORGANIZATION",
            f"{org.org_name} created",
            actor_user_id=user.id,
            target_user_id=user.id,
            resource_id=str(org.id),
        )
        await self.session.commit()
        return SignupResponse(
            organization_id=org.id,
            org_code=org.org_code,
            admin_user_id=user.id,
            message="Organization created. First administrator created as Organization Admin.",
            verification_token=token if settings.env == "development" else None,
        )

    async def verify_email(self, token: str) -> None:
        token_data = _verification_tokens.pop(token, None)
        if not token_data:
            raise AppError(404, "INVALID_VERIFICATION_TOKEN", "Verification token was not found")
        org_id, user_id = token_data
        user = await self.user_repo.get_scoped(org_id, user_id)
        org = await self.org_repo.get(org_id)
        if not user or not org:
            raise AppError(404, "INVALID_VERIFICATION_TOKEN", "Verification token was not found")
        user.is_email_verified = True
        org.is_verified = True
        await self.audit.write(
            org_id,
            "EMAIL_VERIFIED",
            "USER",
            f"{user.email} verified email",
            actor_user_id=user.id,
            target_user_id=user.id,
            resource_id=str(user.id),
        )
        await self.session.commit()
