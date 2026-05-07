import hashlib
import uuid
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.logging import get_logger
from app.models.models import EmailSendLog, EmailQueue
from app.repositories.repositories import EmailConfigRepo, EmailTemplateRepo, SendLogRepo, EmailQueueRepo
from app.schemas.schemas import SendEmailRequest, SendRawRequest
from app.template_engine.renderer import validate_variables, build_render_context, render_template

logger = get_logger(__name__)
def _now(): return datetime.now(timezone.utc)
def _mask(e): p=e.split("@"); return f"{p[0][0]}***@{p[1]}" if len(p)==2 else "***"
def _hash(e): return hashlib.sha256(e.lower().encode()).hexdigest()


async def _send_via_smtp(config, to_recipients, subject, html_body, text_body=None):
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"]    = f"{config.from_name} <{config.from_email}>"
    message["To"]      = ", ".join([r["email"] for r in to_recipients])
    if text_body:
        message.attach(MIMEText(text_body, "plain"))
    message.attach(MIMEText(html_body, "html"))
    await aiosmtplib.send(
        message,
        hostname  = config.host,
        port      = config.port,
        username  = config.username_enc,
        password  = config.password_enc,
        use_tls   = True if config.port == 465 else False,
        start_tls = True if config.port == 587 else False,
        timeout   = config.connection_timeout_s,
    )
    logger.info(f"[SMTP-SENT] From={config.from_email} To={[r['email'] for r in to_recipients]}")


class SendService:
    def __init__(self, db: AsyncSession):
        self.db=db
        self.config_repo=EmailConfigRepo(db)
        self.template_repo=EmailTemplateRepo(db)
        self.log_repo=SendLogRepo(db)
        self.queue_repo=EmailQueueRepo(db)

    async def send_template_email(self, org_id, user_id, req: SendEmailRequest):
        if len(req.to)+len(req.cc)+len(req.bcc) > settings.MAX_RECIPIENTS_PER_SEND:
            raise ValueError(f"TOO_MANY_RECIPIENTS: Max {settings.MAX_RECIPIENTS_PER_SEND}")
        template = await self.template_repo.get(org_id, req.template_id)
        if not template: raise ValueError("TEMPLATE_NOT_FOUND: Template not found")
        config = await self.config_repo.get(org_id, req.email_config_id) if req.email_config_id else await self.config_repo.get_default(org_id)
        if not config: raise ValueError("NO_EMAIL_CONFIG: No active email configuration")
        schema = template.variables_schema_json or []
        is_valid, missing = validate_variables(schema, req.variables)
        if not is_valid: raise ValueError(f"MISSING_REQUIRED_VARIABLE: {', '.join(missing)}")
        org_ctx = {"id": org_id, "name": f"Organization {org_id}"}
        ctx = build_render_context(req.variables, org_ctx)
        ok_s, subject, err_s = render_template(template.subject, ctx)
        if not ok_s: raise ValueError(f"TEMPLATE_SYNTAX_ERROR: {err_s}")
        ok_h, html, err_h = render_template(template.html_body or "", ctx)
        if not ok_h: raise ValueError(f"TEMPLATE_SYNTAX_ERROR: {err_h}")
        ok_t, text, _ = render_template(template.text_body or "", ctx)
        primary = req.to[0].email
        log = EmailSendLog(
            at_organization_id=org_id, nt_email_template_id=template.id,
            nt_email_config_id=config.id, entity_type=req.entity_type, entity_id=req.entity_id,
            to_email_hash=_hash(primary), to_email_masked=_mask(primary), cc_count=len(req.cc),
            subject=subject, has_attachment=req.has_attachment,
            attachment_count=len(req.attachments),
            attachment_names_json=[a.filename for a in req.attachments],
            status="QUEUED", triggered_by=user_id, correlation_id=req.correlation_id, queued_at=_now(),
        )
        log = await self.log_repo.create(log)
        if req.is_async:
            q = EmailQueue(nt_email_send_log_id=log.id, at_organization_id=org_id,
                payload_json={"send_log_id":log.id,"to":[{"email":r.email,"name":r.name} for r in req.to],"subject":subject,"html":html,"text":text},
                queue_status="PENDING", priority=req.priority)
            await self.queue_repo.create(q)
            logger.info(f"[QUEUED] send_log_id={log.id} to={primary}")
            return {"send_log_id": log.id, "status": "QUEUED", "estimated_send_at": _now().isoformat()}
        else:
            try:
                to_list = [{"email": r.email, "name": r.name} for r in req.to]
                await _send_via_smtp(config, to_list, subject, html, text)
                msg_id = f"smtp-{uuid.uuid4().hex[:12]}"
                await self.log_repo.update_status(log.id, "SENT", provider_message_id=msg_id, sent_at=_now())
                return {"send_log_id": log.id, "status": "SENT", "provider_message_id": msg_id}
            except Exception as e:
                logger.error(f"[SMTP-ERROR] send_log_id={log.id} error={str(e)}")
                await self.log_repo.update_status(log.id, "FAILED", failure_reason=str(e))
                raise ValueError(f"SMTP_SEND_FAILED: {str(e)}")

    async def send_raw_email(self, org_id, user_id, req: SendRawRequest):
        config = await self.config_repo.get(org_id, req.email_config_id) if req.email_config_id else await self.config_repo.get_default(org_id)
        if not config: raise ValueError("NO_EMAIL_CONFIG: No active email config")
        primary = req.to[0].email
        log = EmailSendLog(
            at_organization_id=org_id, nt_email_config_id=config.id,
            to_email_hash=_hash(primary), to_email_masked=_mask(primary),
            cc_count=0, subject=req.subject, has_attachment=req.has_attachment,
            attachment_count=len(req.attachments),
            attachment_names_json=[a.filename for a in req.attachments],
            status="QUEUED", triggered_by=user_id, queued_at=_now(),
        )
        log = await self.log_repo.create(log)
        try:
            to_list = [{"email": r.email, "name": r.name} for r in req.to]
            await _send_via_smtp(config, to_list, req.subject, req.html_body, req.text_body)
            msg_id = f"smtp-{uuid.uuid4().hex[:12]}"
            await self.log_repo.update_status(log.id, "SENT", provider_message_id=msg_id, sent_at=_now())
            return {"send_log_id": log.id, "status": "SENT", "provider_message_id": msg_id}
        except Exception as e:
            logger.error(f"[RAW-SMTP-ERROR] send_log_id={log.id} error={str(e)}")
            await self.log_repo.update_status(log.id, "FAILED", failure_reason=str(e))
            raise ValueError(f"SMTP_SEND_FAILED: {str(e)}")

    async def requeue_job(self, org_id, log_id, priority):
        log = await self.log_repo.get(org_id, log_id)
        if not log: raise ValueError("JOB_NOT_FOUND: Job not found")
        if log.status not in ("FAILED","DLQ"): raise ValueError("NOT_REQUEUABLE: Job not in FAILED or DLQ")
        await self.log_repo.update_status(log_id, "QUEUED", queued_at=_now())
        return {"send_log_id": log_id, "status": "QUEUED", "queue_position": 1}

    async def cancel_job(self, org_id, log_id):
        log = await self.log_repo.get(org_id, log_id)
        if not log: raise ValueError("JOB_NOT_FOUND: Job not found")
        if log.status != "QUEUED": raise ValueError("NOT_CANCELLABLE: Job past QUEUED status")
        await self.log_repo.update_status(log_id, "CANCELLED")
        return {"message": "Job cancelled"}