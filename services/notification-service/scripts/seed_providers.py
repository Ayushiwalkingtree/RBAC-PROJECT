import asyncio
import os
import sys
from pathlib import Path

from sqlalchemy import select

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))
os.chdir(SERVICE_ROOT)

from app.core.database import AsyncSessionLocal, Base, engine  # noqa: E402
from app.models.models import SmtpProvider  # noqa: E402


PROVIDERS = [
    ("SMTP", "Standard SMTP server", "PASSWORD", True),
    ("GMAIL_OAUTH2", "Gmail via OAuth2 refresh token", "OAUTH2", True),
    ("SENDGRID", "SendGrid HTTP Mail Send API v3", "API_KEY", True),
    ("AWS_SES", "Amazon Simple Email Service", "IAM_ROLE", True),
    ("CUSTOM", "Custom SMTP or API provider", "PASSWORD", False),
]


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    inserted = 0
    async with AsyncSessionLocal() as session:
        for name, description, auth_type, requires_tls in PROVIDERS:
            exists = (
                await session.execute(
                    select(SmtpProvider).where(SmtpProvider.provider_name == name)
                )
            ).scalar_one_or_none()
            if exists:
                continue

            session.add(
                SmtpProvider(
                    provider_name=name,
                    description=description,
                    auth_type=auth_type,
                    requires_tls=requires_tls,
                )
            )
            inserted += 1

        await session.commit()

    await engine.dispose()
    print(f"Seeded SMTP providers. Inserted={inserted}")


if __name__ == "__main__":
    asyncio.run(seed())
