from datetime import datetime, timezone
from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.config import settings

P = settings.NT_TABLE_PREFIX

def utcnow():
    return datetime.now(timezone.utc)

class AuditMixin:
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    created_by = Column(BigInteger, nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=utcnow)
    updated_by = Column(BigInteger, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)

class SmtpProvider(Base):
    __tablename__ = f"{P}smtp_provider"
    id = Column(f"{P}smtp_provider_id", Integer, primary_key=True, autoincrement=True)
    provider_name = Column(String(50), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    auth_type = Column(String(30), nullable=False)
    requires_tls = Column(Boolean, nullable=False, default=True)
    configs = relationship("EmailConfig", back_populates="provider")

class EmailConfig(Base, AuditMixin):
    __tablename__ = f"{P}email_config"
    id = Column(f"{P}email_config_id", BigInteger, primary_key=True, autoincrement=True)
    at_organization_id = Column(BigInteger, nullable=False, index=True)
    config_name = Column(String(150), nullable=False)
    nt_smtp_provider_id = Column(Integer, ForeignKey(f"{P}smtp_provider.{P}smtp_provider_id"), nullable=False)
    host = Column(String(255), nullable=True)
    port = Column(SmallInteger, nullable=True)
    use_tls = Column(Boolean, nullable=False, default=True)
    use_starttls = Column(Boolean, nullable=False, default=False)
    username_enc = Column(String(512), nullable=True)
    password_enc = Column(String(512), nullable=True)
    oauth2_client_id_enc = Column(String(512), nullable=True)
    oauth2_client_secret_enc = Column(String(512), nullable=True)
    oauth2_refresh_token_enc = Column(String(512), nullable=True)
    oauth2_token_url = Column(String(500), nullable=True)
    api_key_enc = Column(String(512), nullable=True)
    from_name = Column(String(150), nullable=False)
    from_email = Column(String(255), nullable=False)
    reply_to = Column(String(255), nullable=True)
    max_send_rate = Column(Integer, nullable=True)
    is_default = Column(Boolean, nullable=False, default=False)
    connection_timeout_s = Column(SmallInteger, nullable=False, default=30)
    send_timeout_s = Column(SmallInteger, nullable=False, default=60)
    extra_headers_json = Column(JSONB, nullable=False, default=dict)
    provider = relationship("SmtpProvider", back_populates="configs")
    templates = relationship("EmailTemplate", back_populates="email_config")
    send_logs = relationship("EmailSendLog", back_populates="email_config")

class EmailTemplate(Base, AuditMixin):
    __tablename__ = f"{P}email_template"
    id = Column(f"{P}email_template_id", BigInteger, primary_key=True, autoincrement=True)
    at_organization_id = Column(BigInteger, nullable=False, index=True)
    template_key = Column(String(100), nullable=False)
    template_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    entity_type = Column(String(150), nullable=True)
    subject = Column(String(500), nullable=False)
    html_body = Column(Text, nullable=True)
    text_body = Column(Text, nullable=True)
    storage_type = Column(String(20), nullable=False, default="DB")
    storage_path = Column(String(500), nullable=True)
    variables_schema_json = Column(JSONB, nullable=False, default=list)
    locale = Column(String(10), nullable=False, default="en")
    version = Column(Integer, nullable=False, default=1)
    is_platform_default = Column(Boolean, nullable=False, default=False)
    nt_email_config_id = Column(BigInteger, ForeignKey(f"{P}email_config.{P}email_config_id"), nullable=True)
    email_config = relationship("EmailConfig", back_populates="templates")
    versions = relationship("TemplateVersion", back_populates="template")
    entity_links = relationship("EntityTemplateLink", back_populates="template")
    send_logs = relationship("EmailSendLog", back_populates="template")

class TemplateVersion(Base):
    __tablename__ = f"{P}template_version"
    id = Column(f"{P}template_version_id", BigInteger, primary_key=True, autoincrement=True)
    nt_email_template_id = Column(BigInteger, ForeignKey(f"{P}email_template.{P}email_template_id"), nullable=False)
    at_organization_id = Column(BigInteger, nullable=False)
    version = Column(Integer, nullable=False)
    subject = Column(String(500), nullable=False)
    html_body = Column(Text, nullable=True)
    text_body = Column(Text, nullable=True)
    variables_schema_json = Column(JSONB, nullable=False, default=list)
    saved_by = Column(BigInteger, nullable=False)
    saved_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    change_note = Column(Text, nullable=True)
    template = relationship("EmailTemplate", back_populates="versions")

class EntityTemplateLink(Base, AuditMixin):
    __tablename__ = f"{P}entity_template_link"
    id = Column(f"{P}entity_template_link_id", BigInteger, primary_key=True, autoincrement=True)
    at_organization_id = Column(BigInteger, nullable=False, index=True)
    entity_type = Column(String(150), nullable=False)
    event_name = Column(String(150), nullable=False)
    # nt_email_template_id = Column(BigInteger, ForeignKey(f"{P}email_template.{P}email_template_id"), nullable=False)
    # recipient_field = Column(String(150), nullable=False)
    nt_email_template_id = Column(BigInteger, ForeignKey(f"{P}email_template.{P}email_template_id"), nullable=False)
    nt_email_config_id   = Column(BigInteger, ForeignKey(f"{P}email_config.{P}email_config_id"), nullable=True)
    recipient_field      = Column(String(150), nullable=False)
    cc_fields_json = Column(JSONB, nullable=False, default=list)
    variable_mapping_json = Column(JSONB, nullable=False, default=dict)
    is_async = Column(Boolean, nullable=False, default=True)
    template = relationship("EmailTemplate", back_populates="entity_links")

class EmailSendLog(Base):
    __tablename__ = f"{P}email_send_log"
    id = Column(f"{P}email_send_log_id", BigInteger, primary_key=True, autoincrement=True)
    at_organization_id = Column(BigInteger, nullable=False, index=True)
    nt_email_template_id = Column(BigInteger, ForeignKey(f"{P}email_template.{P}email_template_id"), nullable=True)
    nt_email_config_id = Column(BigInteger, ForeignKey(f"{P}email_config.{P}email_config_id"), nullable=False)
    entity_type = Column(String(150), nullable=True)
    entity_id = Column(BigInteger, nullable=True)
    event_name = Column(String(150), nullable=True)
    to_email_hash = Column(String(64), nullable=False)
    to_email_masked = Column(String(255), nullable=False)
    cc_count = Column(SmallInteger, nullable=False, default=0)
    subject = Column(String(500), nullable=False)
    has_attachment = Column(Boolean, nullable=False, default=False)
    attachment_count = Column(SmallInteger, nullable=False, default=0)
    attachment_names_json = Column(JSONB, nullable=False, default=list)
    status = Column(String(30), nullable=False, default="QUEUED")
    provider_message_id = Column(String(255), nullable=True)
    failure_reason = Column(Text, nullable=True)
    retry_count = Column(SmallInteger, nullable=False, default=0)
    queued_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    opened_at = Column(DateTime(timezone=True), nullable=True)
    triggered_by = Column(BigInteger, nullable=True)
    correlation_id = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    template = relationship("EmailTemplate", back_populates="send_logs")
    email_config = relationship("EmailConfig", back_populates="send_logs")
    queue_entries = relationship("EmailQueue", back_populates="send_log")

class EmailQueue(Base, AuditMixin):
    __tablename__ = f"{P}email_queue"
    id = Column(f"{P}email_queue_id", BigInteger, primary_key=True, autoincrement=True)
    nt_email_send_log_id = Column(BigInteger, ForeignKey(f"{P}email_send_log.{P}email_send_log_id"), nullable=False)
    at_organization_id = Column(BigInteger, nullable=False)
    payload_json = Column(JSONB, nullable=False)
    queue_status = Column(String(30), nullable=False, default="PENDING")
    priority = Column(SmallInteger, nullable=False, default=5)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)
    retry_count = Column(SmallInteger, nullable=False, default=0)
    last_error = Column(Text, nullable=True)
    dlq_at = Column(DateTime(timezone=True), nullable=True)
    send_log = relationship("EmailSendLog", back_populates="queue_entries")
