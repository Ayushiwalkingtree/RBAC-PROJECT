"""
Shared pytest fixtures — mock-based, no real DB required for unit tests.
Integration tests use an in-memory SQLite engine via override.
"""
import asyncio
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock


# ── JWT helper ────────────────────────────────────────────────────────────────
def make_jwt(org_id: int = 1, user_id: int = 42) -> str:
    from jose import jwt
    from app.core.config import settings
    return jwt.encode(
        {"org": org_id, "sub": user_id, "roles": ["ADMIN"]},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


@pytest.fixture
def auth_headers():
    return {"Authorization": f"Bearer {make_jwt(org_id=1, user_id=42)}"}


@pytest.fixture
def org_headers():
    """Simulate Kong-injected X-Org-Id / X-User-Id headers."""
    return {"X-Org-Id": "1", "X-User-Id": "42"}


# ── Mock ORM objects ───────────────────────────────────────────────────────────
def mock_smtp_provider(provider_id=1, name="SMTP"):
    p = MagicMock()
    p.id = provider_id
    p.provider_name = name
    p.auth_type = "PASSWORD"
    p.requires_tls = True
    return p


def mock_email_config(config_id=1, org_id=1, is_default=True):
    c = MagicMock()
    c.id = config_id
    c.at_organization_id = org_id
    c.config_name = "Test SMTP"
    c.from_name = "Test Sender"
    c.from_email = "sender@example.com"
    c.is_default = is_default
    c.is_active = True
    c.is_deleted = False
    c.password_enc = "enc_pass"
    c.api_key_enc = None
    c.host = "smtp.example.com"
    c.port = 587
    c.use_tls = True
    c.created_at = datetime.now(timezone.utc)
    return c


def mock_email_template(template_id=1, org_id=1):
    t = MagicMock()
    t.id = template_id
    t.at_organization_id = org_id
    t.template_key = "WELCOME"
    t.template_name = "Welcome Email"
    t.description = "Welcome new users"
    t.entity_type = "user"
    t.subject = "Welcome, {{ user.first_name }}!"
    t.html_body = "<h1>Hello {{ user.first_name }}!</h1><p>Welcome to {{ org.name }}.</p>"
    t.text_body = "Hello {{ user.first_name }}!"
    t.storage_type = "DB"
    t.variables_schema_json = [
        {"key": "user.first_name", "label": "First Name", "data_type": "string",
         "required": True, "example": "Alice", "default_value": None}
    ]
    t.locale = "en"
    t.version = 1
    t.is_platform_default = False
    t.is_deleted = False
    t.is_active = True
    t.created_at = datetime.now(timezone.utc)
    return t


def mock_send_log(log_id=1, org_id=1, status="QUEUED"):
    l = MagicMock()
    l.id = log_id
    l.at_organization_id = org_id
    l.status = status
    l.subject = "Welcome, Alice!"
    l.to_email_masked = "a***@example.com"
    l.has_attachment = False
    l.attachment_count = 0
    l.attachment_names_json = []
    l.retry_count = 0
    l.failure_reason = None
    l.sent_at = None
    l.delivered_at = None
    l.opened_at = None
    l.entity_type = None
    l.entity_id = None
    l.created_at = datetime.now(timezone.utc)
    return l


def mock_entity_link(link_id=1, org_id=1, template_id=1):
    l = MagicMock()
    l.id = link_id
    l.at_organization_id = org_id
    l.entity_type = "loan_application"
    l.event_name = "SUBMITTED"
    l.nt_email_template_id = template_id
    l.recipient_field = "applicant.email"
    l.cc_fields_json = []
    l.variable_mapping_json = {}
    l.is_async = True
    l.is_active = True
    l.is_deleted = False
    l.created_at = datetime.now(timezone.utc)
    return l
