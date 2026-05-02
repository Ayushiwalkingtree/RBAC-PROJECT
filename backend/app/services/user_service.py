from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.user import User, UserRole
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserUpdate
from app.services.audit_service import AuditService
from app.utils.datetime import utcnow
from app.utils.password import hash_password
from app.utils.tokens import new_verification_token

_user_verification_tokens: dict[str, tuple[int, int]] = {}


class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = UserRepository(session)
        self.role_repo = RoleRepository(session)
        self.audit = AuditService(session)

    async def create(self, org_id: int, payload: UserCreate, actor_user_id: int) -> tuple[User, str]:
        if await self.repo.get_by_email(org_id, str(payload.email)):
            raise AppError(409, "EMAIL_EXISTS", "Email already exists in this organization")
        for role_id in payload.role_ids:
            if not await self.role_repo.get_scoped(org_id, role_id):
                raise AppError(404, "ROLE_NOT_FOUND", "Role was not found")
        user = User(
            at_organization_id=org_id,
            email=str(payload.email).lower(),
            password_hash=hash_password(payload.password),
            full_name=payload.full_name,
            title=payload.title,
            department=payload.department,
            phone=payload.phone,
            is_active=payload.is_active,
            is_email_verified=False,
            password_changed_at=utcnow(),
        )
        self.repo.add(user)
        await self.session.flush()
        for role_id in payload.role_ids:
            self.repo.add_role(
                UserRole(
                    user_id=user.id,
                    role_id=role_id,
                    at_organization_id=org_id,
                    assigned_at=utcnow(),
                    assigned_by=actor_user_id,
                )
            )
        token = new_verification_token()
        _user_verification_tokens[token] = (org_id, user.id)
        await self.audit.write(
            org_id,
            "USER_CREATED",
            "USER",
            f"{user.email} created",
            actor_user_id=actor_user_id,
            target_user_id=user.id,
            new_value_json={"email": user.email, "full_name": user.full_name, "role_ids": payload.role_ids},
        )
        await self.session.commit()
        return user, token

    async def update(self, org_id: int, user_id: int, payload: UserUpdate, actor_user_id: int | None = None) -> User:
        user = await self.repo.get_scoped(org_id, user_id)
        if not user:
            raise AppError(404, "USER_NOT_FOUND", "User was not found")
        old_value = {
            "email": user.email,
            "full_name": user.full_name,
            "title": user.title,
            "department": user.department,
            "phone": user.phone,
            "is_active": user.is_active,
        }
        if payload.email:
            duplicate = await self.repo.get_by_email(org_id, str(payload.email))
            if duplicate and duplicate.id != user.id:
                raise AppError(409, "EMAIL_EXISTS", "Email already exists in this organization")
            user.email = str(payload.email).lower()
        if payload.full_name:
            user.full_name = payload.full_name
        if payload.password:
            user.password_hash = hash_password(payload.password)
            user.password_changed_at = utcnow()
        if payload.title is not None:
            user.title = payload.title
        if payload.department is not None:
            user.department = payload.department
        if payload.phone is not None:
            user.phone = payload.phone
        if payload.is_active is not None:
            user.is_active = payload.is_active
        await self.audit.write(
            org_id,
            "USER_UPDATED",
            "USER",
            f"{user.email} updated",
            actor_user_id=actor_user_id,
            target_user_id=user.id,
            resource_id=str(user.id),
            old_value_json=old_value,
            new_value_json={
                "email": user.email,
                "full_name": user.full_name,
                "title": user.title,
                "department": user.department,
                "phone": user.phone,
                "is_active": user.is_active,
                "password_changed": payload.password is not None,
            },
        )
        await self.session.commit()
        return user

    async def delete(self, org_id: int, user_id: int, actor_user_id: int | None = None) -> None:
        user = await self.repo.get_scoped(org_id, user_id)
        if not user:
            raise AppError(404, "USER_NOT_FOUND", "User was not found")
        user.is_deleted = True
        user.is_active = False
        await self.audit.write(
            org_id,
            "USER_DELETED",
            "USER",
            f"{user.email} deleted",
            actor_user_id=actor_user_id,
            target_user_id=user.id,
            resource_id=str(user.id),
            old_value_json={"is_deleted": False, "is_active": True},
            new_value_json={"is_deleted": True, "is_active": False},
        )
        await self.session.commit()
