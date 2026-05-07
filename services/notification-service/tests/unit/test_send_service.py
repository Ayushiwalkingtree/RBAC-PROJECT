"""Unit tests for SendService — fully mocked, no DB required."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.send_service import SendService
from app.schemas.schemas import SendEmailRequest, SendRawRequest, Recipient, AttachmentItem


def _make_request(**kwargs):
    defaults = dict(
        to=[Recipient(email="alice@example.com", name="Alice")],
        template_id=1,
        variables={"user": {"first_name": "Alice"}},
        is_async=True,
    )
    defaults.update(kwargs)
    return SendEmailRequest(**defaults)


def _mock_db():
    db = MagicMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    db.execute = AsyncMock()
    return db


def _mock_template(template_id=1):
    t = MagicMock()
    t.id = template_id
    t.subject = "Welcome, {{ user.first_name }}!"
    t.html_body = "<h1>Hello {{ user.first_name }}</h1>"
    t.variables_schema_json = [
        {"key": "user.first_name", "required": True, "default_value": None, "example": "Alice"}
    ]
    t.at_organization_id = 1
    return t


def _mock_config(config_id=1):
    c = MagicMock()
    c.id = config_id
    c.from_name = "Platform"
    c.from_email = "noreply@platform.com"
    return c


def _mock_log(log_id=99):
    l = MagicMock()
    l.id = log_id
    l.status = "QUEUED"
    return l


class TestSendTemplateEmail:

    @pytest.mark.asyncio
    async def test_async_send_returns_queued(self):
        db = _mock_db()
        svc = SendService(db)
        svc.template_repo = MagicMock()
        svc.template_repo.get = AsyncMock(return_value=_mock_template())
        svc.config_repo = MagicMock()
        svc.config_repo.get_default = AsyncMock(return_value=_mock_config())
        svc.config_repo.get = AsyncMock(return_value=_mock_config())
        svc.log_repo = MagicMock()
        svc.log_repo.create = AsyncMock(return_value=_mock_log(99))
        svc.log_repo.update_status = AsyncMock()
        svc.queue_repo = MagicMock()
        svc.queue_repo.create = AsyncMock(return_value=MagicMock())

        req = _make_request(is_async=True)
        result = await svc.send_template_email(org_id=1, user_id=42, req=req)

        assert result["status"] == "QUEUED"
        assert "send_log_id" in result
        assert result["send_log_id"] == 99

    @pytest.mark.asyncio
    async def test_sync_send_returns_sent(self):
        db = _mock_db()
        svc = SendService(db)
        svc.template_repo = MagicMock()
        svc.template_repo.get = AsyncMock(return_value=_mock_template())
        svc.config_repo = MagicMock()
        svc.config_repo.get_default = AsyncMock(return_value=_mock_config())
        svc.config_repo.get = AsyncMock(return_value=_mock_config())
        svc.log_repo = MagicMock()
        svc.log_repo.create = AsyncMock(return_value=_mock_log(10))
        svc.log_repo.update_status = AsyncMock()
        svc.queue_repo = MagicMock()

        req = _make_request(is_async=False)
        result = await svc.send_template_email(org_id=1, user_id=42, req=req)

        assert result["status"] == "SENT"
        assert "provider_message_id" in result

    @pytest.mark.asyncio
    async def test_template_not_found_raises(self):
        db = _mock_db()
        svc = SendService(db)
        svc.template_repo = MagicMock()
        svc.template_repo.get = AsyncMock(return_value=None)
        svc.config_repo = MagicMock()
        svc.config_repo.get_default = AsyncMock(return_value=_mock_config())
        svc.log_repo = MagicMock()
        svc.queue_repo = MagicMock()

        with pytest.raises(ValueError) as exc:
            await svc.send_template_email(1, 42, _make_request())
        assert "TEMPLATE_NOT_FOUND" in str(exc.value)

    @pytest.mark.asyncio
    async def test_no_email_config_raises(self):
        db = _mock_db()
        svc = SendService(db)
        svc.template_repo = MagicMock()
        svc.template_repo.get = AsyncMock(return_value=_mock_template())
        svc.config_repo = MagicMock()
        svc.config_repo.get_default = AsyncMock(return_value=None)
        svc.config_repo.get = AsyncMock(return_value=None)
        svc.log_repo = MagicMock()
        svc.queue_repo = MagicMock()

        with pytest.raises(ValueError) as exc:
            await svc.send_template_email(1, 42, _make_request())
        assert "NO_EMAIL_CONFIG" in str(exc.value)

    @pytest.mark.asyncio
    async def test_missing_required_variable_raises(self):
        db = _mock_db()
        svc = SendService(db)
        template = _mock_template()
        template.variables_schema_json = [
            {"key": "otp", "required": True, "default_value": None, "example": "123456"}
        ]
        svc.template_repo = MagicMock()
        svc.template_repo.get = AsyncMock(return_value=template)
        svc.config_repo = MagicMock()
        svc.config_repo.get_default = AsyncMock(return_value=_mock_config())
        svc.config_repo.get = AsyncMock(return_value=_mock_config())
        svc.log_repo = MagicMock()
        svc.queue_repo = MagicMock()

        req = _make_request(variables={})  # otp missing
        with pytest.raises(ValueError) as exc:
            await svc.send_template_email(1, 42, req)
        assert "MISSING_REQUIRED_VARIABLE" in str(exc.value)
        assert "otp" in str(exc.value)

    @pytest.mark.asyncio
    async def test_too_many_recipients_raises(self):
        db = _mock_db()
        svc = SendService(db)
        svc.template_repo = MagicMock()
        svc.config_repo = MagicMock()
        svc.log_repo = MagicMock()
        svc.queue_repo = MagicMock()

        # Build request with 51 recipients (limit is 50)
        many = [Recipient(email=f"user{i}@x.com") for i in range(51)]
        req = _make_request(to=many)
        with pytest.raises(ValueError) as exc:
            await svc.send_template_email(1, 42, req)
        assert "TOO_MANY_RECIPIENTS" in str(exc.value)

    @pytest.mark.asyncio
    async def test_org_scoping_uses_correct_org(self):
        """Verify org_id=1 is passed to template_repo, not org_id=2."""
        db = _mock_db()
        svc = SendService(db)
        svc.template_repo = MagicMock()
        svc.template_repo.get = AsyncMock(return_value=None)
        svc.config_repo = MagicMock()
        svc.config_repo.get_default = AsyncMock(return_value=None)
        svc.log_repo = MagicMock()
        svc.queue_repo = MagicMock()

        try:
            await svc.send_template_email(org_id=1, user_id=42, req=_make_request())
        except ValueError:
            pass

        # template_repo.get must be called with org_id=1 (not 2 or anything else)
        svc.template_repo.get.assert_called_once_with(1, 1)


class TestRequeueJob:

    @pytest.mark.asyncio
    async def test_requeue_failed_job_succeeds(self):
        db = _mock_db()
        svc = SendService(db)
        log = _mock_log()
        log.status = "FAILED"
        svc.log_repo = MagicMock()
        svc.log_repo.get = AsyncMock(return_value=log)
        svc.log_repo.update_status = AsyncMock()

        result = await svc.requeue_job(org_id=1, log_id=99, priority=3)
        assert result["status"] == "QUEUED"

    @pytest.mark.asyncio
    async def test_requeue_dlq_job_succeeds(self):
        db = _mock_db()
        svc = SendService(db)
        log = _mock_log()
        log.status = "DLQ"
        svc.log_repo = MagicMock()
        svc.log_repo.get = AsyncMock(return_value=log)
        svc.log_repo.update_status = AsyncMock()

        result = await svc.requeue_job(1, 99, 5)
        assert result["status"] == "QUEUED"

    @pytest.mark.asyncio
    async def test_requeue_sent_job_raises(self):
        db = _mock_db()
        svc = SendService(db)
        log = _mock_log()
        log.status = "SENT"
        svc.log_repo = MagicMock()
        svc.log_repo.get = AsyncMock(return_value=log)

        with pytest.raises(ValueError) as exc:
            await svc.requeue_job(1, 99, 3)
        assert "NOT_REQUEUABLE" in str(exc.value)

    @pytest.mark.asyncio
    async def test_requeue_not_found_raises(self):
        db = _mock_db()
        svc = SendService(db)
        svc.log_repo = MagicMock()
        svc.log_repo.get = AsyncMock(return_value=None)

        with pytest.raises(ValueError) as exc:
            await svc.requeue_job(1, 999, 3)
        assert "JOB_NOT_FOUND" in str(exc.value)


class TestCancelJob:

    @pytest.mark.asyncio
    async def test_cancel_queued_job_succeeds(self):
        db = _mock_db()
        svc = SendService(db)
        log = _mock_log()
        log.status = "QUEUED"
        svc.log_repo = MagicMock()
        svc.log_repo.get = AsyncMock(return_value=log)
        svc.log_repo.update_status = AsyncMock()

        result = await svc.cancel_job(1, 99)
        assert "cancelled" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_cancel_sent_job_raises(self):
        db = _mock_db()
        svc = SendService(db)
        log = _mock_log()
        log.status = "SENT"
        svc.log_repo = MagicMock()
        svc.log_repo.get = AsyncMock(return_value=log)

        with pytest.raises(ValueError) as exc:
            await svc.cancel_job(1, 99)
        assert "NOT_CANCELLABLE" in str(exc.value)

    @pytest.mark.asyncio
    async def test_cancel_not_found_raises(self):
        db = _mock_db()
        svc = SendService(db)
        svc.log_repo = MagicMock()
        svc.log_repo.get = AsyncMock(return_value=None)

        with pytest.raises(ValueError) as exc:
            await svc.cancel_job(1, 999)
        assert "JOB_NOT_FOUND" in str(exc.value)
