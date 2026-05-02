from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.refresh_token import RefreshToken


class TokenRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        result = await self.session.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash, RefreshToken.is_deleted.is_(False))
        )
        return result.scalar_one_or_none()

    def add(self, token: RefreshToken) -> None:
        self.session.add(token)
