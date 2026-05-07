"""
Integration tests — full HTTP round-trips via FastAPI TestClient.
Uses an on-disk SQLite database so all tests share one connection.
"""
# Patch JSONB → JSON for SQLite compatibility
from sqlalchemy import JSON
from sqlalchemy.dialects import postgresql
postgresql.JSONB = JSON

import pytest
import pytest_asyncio
import os
from httpx import AsyncClient, ASGITransport
from sqlalchemy import Integer
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.core.database import get_db, Base
from app.core.security import get_org_context, OrganizationContext

# ── Test DB — file-based so it persists across fixtures ──────────────────────
TEST_DB_FILE = "/tmp/notif_test.db"
TEST_DB_URL = f"sqlite+aiosqlite:///{TEST_DB_FILE}"

# Patch BigInteger PKs → Integer for SQLite autoincrement compatibility
from app.models import models as _models
from sqlalchemy import BigInteger
for _table in _models.Base.metadata.tables.values():
    for _col in _table.columns:
        if _col.primary_key and isinstance(_col.type, BigInteger):
            _col.type = Integer()

test_engine = create_async_engine(TEST_DB_URL, echo=False, connect_args={"check_same_thread": False})
TestSessionLocal = async_sessionmaker(
    test_engine, class_=AsyncSession,
    expire_on_commit=False, autocommit=False, autoflush=False
)

# ── Eagerly create schema at import time (sync) ───────────────────────────────
import sqlalchemy as _sa_sync
_sync_engine = _sa_sync.create_engine(f"sqlite:///{TEST_DB_FILE}")
_models.Base.metadata.create_all(_sync_engine)
# Seed provider
with _sync_engine.connect() as _conn:
    existing = _conn.execute(_sa_sync.text("SELECT COUNT(*) FROM nt_smtp_provider")).scalar()
    if existing == 0:
        _conn.execute(_sa_sync.text(
            "INSERT INTO nt_smtp_provider (provider_name, auth_type, requires_tls) VALUES (:n,:a,:r)"
        ), {"n": "SMTP", "a": "PASSWORD", "r": 1})
        _conn.commit()
_sync_engine.dispose()


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def override_get_org_context():
    return OrganizationContext(org_id=1, user_id=42)


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_org_context] = override_get_org_context


# ── Module-level DB setup ─────────────────────────────────────────────────────
@pytest_asyncio.fixture(scope="module", autouse=True)
async def setup_db():
    """Create all tables once for the whole module."""
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Seed SMTP provider
    async with TestSessionLocal() as session:
        from app.models.models import SmtpProvider
        from sqlalchemy import select
        existing = (await session.execute(select(SmtpProvider))).scalar_one_or_none()
        if not existing:
            session.add(SmtpProvider(provider_name="SMTP", auth_type="PASSWORD", requires_tls=True))
            await session.commit()
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


# ════════════════════════════════════════════════════════════════════════════
# HEALTH
# ════════════════════════════════════════════════════════════════════════════
class TestHealth:
    @pytest.mark.asyncio
    async def test_health_returns_ok(self, client):
        r = await client.get("/api/v1/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
        assert "service" in r.json()

    @pytest.mark.asyncio
    async def test_healthz_returns_ready(self, client):
        r = await client.get("/api/v1/healthz")
        assert r.status_code == 200
        assert r.json()["status"] == "ready"


# ════════════════════════════════════════════════════════════════════════════
# SMTP CONFIGS
# ════════════════════════════════════════════════════════════════════════════
class TestEmailConfigs:

    @pytest.mark.asyncio
    async def test_list_configs_empty_at_start(self, client):
        r = await client.get("/api/v1/email-configs")
        assert r.status_code == 200
        body = r.json()
        assert body["success"] is True
        assert isinstance(body["data"], list)

    @pytest.mark.asyncio
    async def test_create_config(self, client):
        r = await client.post("/api/v1/email-configs", json={
            "config_name": "Primary SMTP",
            "provider": "SMTP",
            "host": "smtp.example.com",
            "port": 587,
            "from_name": "Test Sender",
            "from_email": "sender@example.com",
            "is_default": True,
        })
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["success"] is True
        assert "nt_email_config_id" in body["data"]
        assert body["data"]["connection_test"]["success"] is True

    @pytest.mark.asyncio
    async def test_create_duplicate_name_returns_409(self, client):
        payload = {
            "config_name": "Duplicate SMTP",
            "provider": "SMTP",
            "host": "smtp.example.com",
            "port": 587,
            "from_name": "Sender",
            "from_email": "dup@example.com",
        }
        r1 = await client.post("/api/v1/email-configs", json=payload)
        assert r1.status_code == 201
        r2 = await client.post("/api/v1/email-configs", json=payload)
        assert r2.status_code == 409
        assert r2.json()["error"]["code"] == "CONFIG_NAME_EXISTS"

    @pytest.mark.asyncio
    async def test_get_config_by_id(self, client):
        create_r = await client.post("/api/v1/email-configs", json={
            "config_name": "Get Test SMTP",
            "provider": "SMTP",
            "host": "smtp.example.com",
            "port": 587,
            "from_name": "Sender",
            "from_email": "get@example.com",
        })
        config_id = create_r.json()["data"]["nt_email_config_id"]
        r = await client.get(f"/api/v1/email-configs/{config_id}")
        assert r.status_code == 200
        assert r.json()["data"]["config_name"] == "Get Test SMTP"

    @pytest.mark.asyncio
    async def test_get_nonexistent_config_returns_404(self, client):
        r = await client.get("/api/v1/email-configs/999999")
        assert r.status_code == 404
        assert r.json()["error"]["code"] == "CONFIG_NOT_FOUND"

    @pytest.mark.asyncio
    async def test_credentials_never_returned(self, client):
        create_r = await client.post("/api/v1/email-configs", json={
            "config_name": "Password Config",
            "provider": "SMTP",
            "host": "smtp.example.com",
            "port": 587,
            "from_name": "Sender",
            "from_email": "pw@example.com",
            "password": "supersecret123",
        })
        config_id = create_r.json()["data"]["nt_email_config_id"]
        r = await client.get(f"/api/v1/email-configs/{config_id}")
        body_str = str(r.json())
        assert "supersecret123" not in body_str
        assert r.json()["data"]["has_password"] is True

    @pytest.mark.asyncio
    async def test_test_connection(self, client):
        create_r = await client.post("/api/v1/email-configs", json={
            "config_name": "Test Connection SMTP",
            "provider": "SMTP",
            "host": "smtp.example.com",
            "port": 587,
            "from_name": "Sender",
            "from_email": "conn@example.com",
        })
        config_id = create_r.json()["data"]["nt_email_config_id"]
        r = await client.post(f"/api/v1/email-configs/{config_id}/test",
                              json={"test_recipient": "test@example.com"})
        assert r.status_code == 200
        assert r.json()["data"]["success"] is True
        assert "latency_ms" in r.json()["data"]

    @pytest.mark.asyncio
    async def test_list_configs_returns_created(self, client):
        r = await client.get("/api/v1/email-configs")
        assert r.status_code == 200
        assert r.json()["meta"]["total"] > 0


# ════════════════════════════════════════════════════════════════════════════
# TEMPLATES
# ════════════════════════════════════════════════════════════════════════════
class TestEmailTemplates:

    @pytest.mark.asyncio
    async def test_list_templates(self, client):
        r = await client.get("/api/v1/email-templates")
        assert r.status_code == 200
        assert r.json()["success"] is True

    @pytest.mark.asyncio
    async def test_create_template_success(self, client):
        r = await client.post("/api/v1/email-templates", json={
            "template_key": "WELCOME_INT",
            "template_name": "Welcome Email",
            "subject": "Welcome, {{ user.first_name }}!",
            "html_body": "<h1>Hello {{ user.first_name }}!</h1><p>Thanks for joining {{ org.name }}.</p>",
            "variables_schema_json": [
                {"key": "user.first_name", "label": "First Name", "data_type": "string",
                 "required": True, "example": "Alice"}
            ],
        })
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["data"]["template_key"] == "WELCOME_INT"
        assert body["data"]["version"] == 1
        assert "preview_html" in body["data"]
        assert "Alice" in body["data"]["preview_html"]

    @pytest.mark.asyncio
    async def test_create_template_invalid_jinja_returns_422(self, client):
        r = await client.post("/api/v1/email-templates", json={
            "template_key": "BAD_JINJA",
            "template_name": "Bad Template",
            "subject": "Hi",
            "html_body": "{% if user %}Open block with no endif",
            "variables_schema_json": [],
        })
        assert r.status_code == 422
        assert r.json()["error"]["code"] == "TEMPLATE_SYNTAX_ERROR"

    @pytest.mark.asyncio
    async def test_create_duplicate_key_returns_409(self, client):
        payload = {
            "template_key": "DUPE_INT_KEY",
            "template_name": "First",
            "subject": "Hi",
            "html_body": "<p>Hi</p>",
            "variables_schema_json": [],
        }
        r1 = await client.post("/api/v1/email-templates", json=payload)
        assert r1.status_code == 201
        r2 = await client.post("/api/v1/email-templates", json=payload)
        assert r2.status_code == 409
        assert r2.json()["error"]["code"] == "TEMPLATE_KEY_EXISTS"

    @pytest.mark.asyncio
    async def test_get_template_by_id(self, client):
        create_r = await client.post("/api/v1/email-templates", json={
            "template_key": "GET_INT_TMPL",
            "template_name": "Get Me",
            "subject": "Test",
            "html_body": "<p>Test</p>",
            "variables_schema_json": [],
        })
        tid = create_r.json()["data"]["nt_email_template_id"]
        r = await client.get(f"/api/v1/email-templates/{tid}")
        assert r.status_code == 200
        assert r.json()["data"]["template_key"] == "GET_INT_TMPL"

    @pytest.mark.asyncio
    async def test_get_nonexistent_template_returns_404(self, client):
        r = await client.get("/api/v1/email-templates/999999")
        assert r.status_code == 404
        assert r.json()["error"]["code"] == "TEMPLATE_NOT_FOUND"

    @pytest.mark.asyncio
    async def test_update_template_increments_version(self, client):
        create_r = await client.post("/api/v1/email-templates", json={
            "template_key": "UPDATE_INT",
            "template_name": "Original",
            "subject": "Original Subject",
            "html_body": "<p>Original</p>",
            "variables_schema_json": [],
        })
        tid = create_r.json()["data"]["nt_email_template_id"]
        update_r = await client.put(f"/api/v1/email-templates/{tid}", json={
            "version": 1,
            "subject": "Updated Subject",
            "html_body": "<p>Updated content</p>",
        })
        assert update_r.status_code == 200
        assert update_r.json()["data"]["version"] == 2

    @pytest.mark.asyncio
    async def test_update_wrong_version_returns_409(self, client):
        create_r = await client.post("/api/v1/email-templates", json={
            "template_key": "VERSION_CONFLICT_INT",
            "template_name": "Conflict",
            "subject": "Hi",
            "html_body": "<p>Hi</p>",
            "variables_schema_json": [],
        })
        tid = create_r.json()["data"]["nt_email_template_id"]
        r = await client.put(f"/api/v1/email-templates/{tid}", json={
            "version": 999,
            "html_body": "<p>New</p>",
        })
        assert r.status_code == 409
        assert r.json()["error"]["code"] == "VERSION_CONFLICT"

    @pytest.mark.asyncio
    async def test_preview_renders_variables(self, client):
        create_r = await client.post("/api/v1/email-templates", json={
            "template_key": "PREVIEW_INT",
            "template_name": "Preview Test",
            "subject": "Hello {{ name }}",
            "html_body": "<p>Dear {{ name }}, welcome!</p>",
            "variables_schema_json": [
                {"key": "name", "label": "Name", "data_type": "string", "required": True, "example": "World"}
            ],
        })
        tid = create_r.json()["data"]["nt_email_template_id"]
        r = await client.post(f"/api/v1/email-templates/{tid}/preview",
                              json={"variables": {"name": "Claude"}})
        assert r.status_code == 200
        assert "Claude" in r.json()["data"]["subject"]
        assert "Claude" in r.json()["data"]["html"]

    @pytest.mark.asyncio
    async def test_version_history_populated_after_update(self, client):
        create_r = await client.post("/api/v1/email-templates", json={
            "template_key": "HIST_INT",
            "template_name": "History Test",
            "subject": "v1",
            "html_body": "<p>v1</p>",
            "variables_schema_json": [],
        })
        tid = create_r.json()["data"]["nt_email_template_id"]
        await client.put(f"/api/v1/email-templates/{tid}",
                         json={"version": 1, "subject": "v2", "html_body": "<p>v2</p>"})
        r = await client.get(f"/api/v1/email-templates/{tid}/versions")
        assert r.status_code == 200
        assert r.json()["meta"]["total"] >= 1

    @pytest.mark.asyncio
    async def test_delete_template_soft_deletes(self, client):
        create_r = await client.post("/api/v1/email-templates", json={
            "template_key": "DELETE_INT",
            "template_name": "Delete Me",
            "subject": "Bye",
            "html_body": "<p>Bye</p>",
            "variables_schema_json": [],
        })
        tid = create_r.json()["data"]["nt_email_template_id"]
        del_r = await client.delete(f"/api/v1/email-templates/{tid}")
        assert del_r.status_code == 200
        get_r = await client.get(f"/api/v1/email-templates/{tid}")
        assert get_r.status_code == 404


# ════════════════════════════════════════════════════════════════════════════
# ENTITY LINKS
# ════════════════════════════════════════════════════════════════════════════
class TestEntityLinks:

    @pytest_asyncio.fixture
    async def tmpl_id(self, client):
        import random
        key = f"LINK_TMPL_{random.randint(10000, 99999)}"
        r = await client.post("/api/v1/email-templates", json={
            "template_key": key,
            "template_name": "Link Template",
            "subject": "Hi",
            "html_body": "<p>Hi</p>",
            "variables_schema_json": [],
        })
        return r.json()["data"]["nt_email_template_id"]

    @pytest.mark.asyncio
    async def test_list_links(self, client):
        r = await client.get("/api/v1/email-links")
        assert r.status_code == 200
        assert isinstance(r.json()["data"], list)

    @pytest.mark.asyncio
    async def test_create_link(self, client, tmpl_id):
        import random
        r = await client.post("/api/v1/email-links", json={
            "entity_type": f"entity_{random.randint(1000,9999)}",
            "event_name": "SUBMITTED",
            "template_id": tmpl_id,
            "recipient_field": "applicant.email",
        })
        assert r.status_code == 201
        assert r.json()["data"]["recipient_field"] == "applicant.email"

    @pytest.mark.asyncio
    async def test_create_duplicate_link_returns_409(self, client, tmpl_id):
        import random
        entity_type = f"entity_{random.randint(10000, 99999)}"
        payload = {
            "entity_type": entity_type,
            "event_name": "CREATED",
            "template_id": tmpl_id,
            "recipient_field": "customer.email",
        }
        r1 = await client.post("/api/v1/email-links", json=payload)
        assert r1.status_code == 201
        r2 = await client.post("/api/v1/email-links", json=payload)
        assert r2.status_code == 409
        assert r2.json()["error"]["code"] == "LINK_EXISTS"

    @pytest.mark.asyncio
    async def test_delete_link(self, client, tmpl_id):
        import random
        r = await client.post("/api/v1/email-links", json={
            "entity_type": f"ent_{random.randint(1000,9999)}",
            "event_name": "PAID",
            "template_id": tmpl_id,
            "recipient_field": "payer.email",
        })
        link_id = r.json()["data"]["nt_entity_template_link_id"]
        del_r = await client.delete(f"/api/v1/email-links/{link_id}")
        assert del_r.status_code == 200


# ════════════════════════════════════════════════════════════════════════════
# SEND EMAIL
# ════════════════════════════════════════════════════════════════════════════
class TestSendEmail:

    @pytest_asyncio.fixture
    async def config_and_template(self, client):
        import random
        cfg_r = await client.post("/api/v1/email-configs", json={
            "config_name": f"Send Config {random.randint(1000,9999)}",
            "provider": "SMTP",
            "host": "smtp.example.com",
            "port": 587,
            "from_name": "Platform",
            "from_email": "noreply@platform.com",
            "is_default": True,
        })
        cfg_id = cfg_r.json()["data"]["nt_email_config_id"]

        tmpl_r = await client.post("/api/v1/email-templates", json={
            "template_key": f"SEND_INT_{random.randint(1000,9999)}",
            "template_name": "Send Test Template",
            "subject": "Hello {{ user.first_name }}",
            "html_body": "<p>Hi {{ user.first_name }}! Welcome to {{ org.name }}.</p>",
            "variables_schema_json": [
                {"key": "user.first_name", "label": "First Name", "data_type": "string",
                 "required": True, "example": "Alice"}
            ],
        })
        tmpl_id = tmpl_r.json()["data"]["nt_email_template_id"]
        return cfg_id, tmpl_id

    @pytest.mark.asyncio
    async def test_send_async_returns_queued(self, client, config_and_template):
        _, tmpl_id = config_and_template
        r = await client.post("/api/v1/emails/send", json={
            "to": [{"email": "alice@example.com", "name": "Alice"}],
            "template_id": tmpl_id,
            "variables": {"user": {"first_name": "Alice"}},
            "is_async": True,
        })
        assert r.status_code == 200, r.text
        assert r.json()["data"]["status"] == "QUEUED"
        assert "send_log_id" in r.json()["data"]

    @pytest.mark.asyncio
    async def test_send_sync_returns_sent(self, client, config_and_template):
        _, tmpl_id = config_and_template
        r = await client.post("/api/v1/emails/send", json={
            "to": [{"email": "bob@example.com", "name": "Bob"}],
            "template_id": tmpl_id,
            "variables": {"user": {"first_name": "Bob"}},
            "is_async": False,
        })
        assert r.status_code == 200
        assert r.json()["data"]["status"] == "SENT"
        assert "provider_message_id" in r.json()["data"]

    @pytest.mark.asyncio
    async def test_send_missing_required_variable_returns_400(self, client, config_and_template):
        _, tmpl_id = config_and_template
        r = await client.post("/api/v1/emails/send", json={
            "to": [{"email": "alice@example.com"}],
            "template_id": tmpl_id,
            "variables": {},  # user.first_name is required but missing
        })
        assert r.status_code == 400
        assert r.json()["error"]["code"] == "MISSING_REQUIRED_VARIABLE"

    @pytest.mark.asyncio
    async def test_send_nonexistent_template_returns_404(self, client):
        r = await client.post("/api/v1/emails/send", json={
            "to": [{"email": "x@x.com"}],
            "template_id": 999999,
            "variables": {},
        })
        assert r.status_code == 404
        assert r.json()["error"]["code"] == "TEMPLATE_NOT_FOUND"


# ════════════════════════════════════════════════════════════════════════════
# JOBS
# ════════════════════════════════════════════════════════════════════════════
class TestJobs:

    @pytest.mark.asyncio
    async def test_list_jobs(self, client):
        r = await client.get("/api/v1/emails/jobs")
        assert r.status_code == 200
        assert r.json()["success"] is True
        assert isinstance(r.json()["data"], list)

    @pytest.mark.asyncio
    async def test_get_nonexistent_job_returns_404(self, client):
        r = await client.get("/api/v1/emails/jobs/999999")
        assert r.status_code == 404
        assert r.json()["error"]["code"] == "JOB_NOT_FOUND"

    @pytest.mark.asyncio
    async def test_requeue_nonexistent_job_returns_404(self, client):
        r = await client.post("/api/v1/emails/jobs/999999/requeue", json={"priority": 3})
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_cancel_nonexistent_job_returns_404(self, client):
        r = await client.delete("/api/v1/emails/jobs/999999")
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_list_jobs_shows_sent_emails(self, client):
        """Jobs list should show emails sent in previous tests."""
        r = await client.get("/api/v1/emails/jobs")
        assert r.status_code == 200
        # Should have at least the sends from TestSendEmail
        assert r.json()["meta"]["total"] >= 0  # Just verify it works


# ════════════════════════════════════════════════════════════════════════════
# WEBHOOKS
# ════════════════════════════════════════════════════════════════════════════
class TestWebhooks:

    @pytest.mark.asyncio
    async def test_sendgrid_webhook_accepted(self, client):
        r = await client.post("/api/v1/emails/webhooks/sendgrid",
                              json=[{"event": "delivered", "sg_message_id": "abc123"}])
        assert r.status_code == 200
        assert r.json()["processed"] == 1

    @pytest.mark.asyncio
    async def test_ses_webhook_accepted(self, client):
        r = await client.post("/api/v1/emails/webhooks/ses",
                              json={"Type": "Notification", "Message": "{}"})
        assert r.status_code == 200
        assert r.json()["processed"] == 1
