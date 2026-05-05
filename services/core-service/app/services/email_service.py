import logging
import smtplib
from email.message import EmailMessage
from typing import Protocol

from app.core.config import settings
from app.core.errors import AppError

logger = logging.getLogger(__name__)


class EmailSender(Protocol):
    async def send_verification_email(
        self,
        email: str,
        full_name: str,
        org_name: str,
        verification_url: str,
    ) -> None: ...


class EmailService:
    async def send_verification_email(
        self,
        email: str,
        full_name: str,
        org_name: str,
        verification_url: str,
    ) -> None:
        provider = settings.email_provider.lower()
        if provider == "console":
            logger.warning("DEV EMAIL: Verify email for %s: %s", email, verification_url)
            return

        if provider == "smtp":
            self._send_smtp(email, full_name, org_name, verification_url)
            return

        raise AppError(500, "EMAIL_PROVIDER_INVALID", "Email provider is not configured")

    def _send_smtp(self, email: str, full_name: str, org_name: str, verification_url: str) -> None:
        if not settings.smtp_host:
            raise AppError(500, "SMTP_NOT_CONFIGURED", "SMTP host is not configured")

        message = EmailMessage()
        message["Subject"] = f"Verify your {org_name} account"
        message["From"] = settings.smtp_from_email
        message["To"] = email
        message.set_content(
            "\n".join(
                [
                    f"Hi {full_name},",
                    "",
                    f"Your administrator account for {org_name} is ready.",
                    f"Verify your email: {verification_url}",
                    "",
                    "If you did not request this account, ignore this email.",
                ]
            )
        )

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
