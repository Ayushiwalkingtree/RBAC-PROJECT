import hashlib
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import EmailConfig, EmailTemplate, TemplateVersion, EntityTemplateLink, EmailSendLog, EmailQueue, SmtpProvider

def _now(): return datetime.now(timezone.utc)

class SmtpProviderRepo:
    def __init__(self, db): self.db = db
    async def get_by_name(self, name):
        r = await self.db.execute(select(SmtpProvider).where(SmtpProvider.provider_name == name))
        return r.scalar_one_or_none()
    async def list_all(self):
        r = await self.db.execute(select(SmtpProvider))
        return r.scalars().all()

class EmailConfigRepo:
    def __init__(self, db): self.db = db
    async def list(self, org_id, page=1, per_page=20):
        q = select(EmailConfig).where(EmailConfig.at_organization_id==org_id, EmailConfig.is_deleted==False)
        total = (await self.db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
        r = await self.db.execute(q.offset((page-1)*per_page).limit(per_page))
        return r.scalars().all(), total
    async def get(self, org_id, config_id):
        r = await self.db.execute(select(EmailConfig).where(EmailConfig.id==config_id, EmailConfig.at_organization_id==org_id, EmailConfig.is_deleted==False))
        return r.scalar_one_or_none()
    async def get_default(self, org_id):
        r = await self.db.execute(select(EmailConfig).where(EmailConfig.at_organization_id==org_id, EmailConfig.is_default==True, EmailConfig.is_deleted==False, EmailConfig.is_active==True))
        return r.scalar_one_or_none()
    async def name_exists(self, org_id, name, exclude_id=None):
        q = select(EmailConfig).where(EmailConfig.at_organization_id==org_id, EmailConfig.config_name==name, EmailConfig.is_deleted==False)
        if exclude_id: q = q.where(EmailConfig.id != exclude_id)
        return (await self.db.execute(q)).scalar_one_or_none() is not None
    async def demote_defaults(self, org_id, exclude_id):
        await self.db.execute(update(EmailConfig).where(EmailConfig.at_organization_id==org_id, EmailConfig.id!=exclude_id, EmailConfig.is_deleted==False).values(is_default=False, updated_at=_now()))
    async def create(self, obj):
        self.db.add(obj); await self.db.flush(); await self.db.refresh(obj); return obj
    async def save(self, obj):
        await self.db.flush(); await self.db.refresh(obj); return obj
    async def soft_delete(self, obj, user_id):
        obj.is_deleted=True; obj.updated_by=user_id; obj.updated_at=_now(); await self.db.flush()

class EmailTemplateRepo:
    def __init__(self, db): self.db = db
    async def list(self, org_id, locale=None, entity_type=None, is_platform_default=None, page=1, per_page=20):
        q = select(EmailTemplate).where(EmailTemplate.at_organization_id==org_id, EmailTemplate.is_deleted==False)
        if locale: q = q.where(EmailTemplate.locale==locale)
        if entity_type: q = q.where(EmailTemplate.entity_type==entity_type)
        if is_platform_default is not None: q = q.where(EmailTemplate.is_platform_default==is_platform_default)
        total = (await self.db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
        r = await self.db.execute(q.offset((page-1)*per_page).limit(per_page))
        return r.scalars().all(), total
    async def get(self, org_id, template_id):
        r = await self.db.execute(select(EmailTemplate).where(EmailTemplate.id==template_id, EmailTemplate.at_organization_id==org_id, EmailTemplate.is_deleted==False))
        return r.scalar_one_or_none()
    async def key_exists(self, org_id, key, locale, exclude_id=None):
        q = select(EmailTemplate).where(EmailTemplate.at_organization_id==org_id, EmailTemplate.template_key==key, EmailTemplate.locale==locale, EmailTemplate.is_deleted==False)
        if exclude_id: q = q.where(EmailTemplate.id != exclude_id)
        return (await self.db.execute(q)).scalar_one_or_none() is not None
    async def create(self, obj):
        self.db.add(obj); await self.db.flush(); await self.db.refresh(obj); return obj
    async def save(self, obj):
        await self.db.flush(); await self.db.refresh(obj); return obj
    async def soft_delete(self, obj, user_id):
        obj.is_deleted=True; obj.updated_by=user_id; obj.updated_at=_now(); await self.db.flush()

class TemplateVersionRepo:
    def __init__(self, db): self.db = db
    async def list(self, org_id, template_id, page=1, per_page=20):
        q = select(TemplateVersion).where(TemplateVersion.nt_email_template_id==template_id, TemplateVersion.at_organization_id==org_id).order_by(TemplateVersion.version.desc())
        total = (await self.db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
        r = await self.db.execute(q.offset((page-1)*per_page).limit(per_page))
        return r.scalars().all(), total
    async def get_by_version(self, org_id, template_id, version):
        r = await self.db.execute(select(TemplateVersion).where(TemplateVersion.nt_email_template_id==template_id, TemplateVersion.at_organization_id==org_id, TemplateVersion.version==version))
        return r.scalar_one_or_none()
    async def create(self, obj):
        self.db.add(obj); await self.db.flush(); return obj

class EntityLinkRepo:
    def __init__(self, db): self.db = db
    async def list(self, org_id, entity_type=None, page=1, per_page=20):
        q = select(EntityTemplateLink).where(EntityTemplateLink.at_organization_id==org_id, EntityTemplateLink.is_deleted==False)
        if entity_type: q = q.where(EntityTemplateLink.entity_type==entity_type)
        total = (await self.db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
        r = await self.db.execute(q.offset((page-1)*per_page).limit(per_page))
        return r.scalars().all(), total
    async def get(self, org_id, link_id):
        r = await self.db.execute(select(EntityTemplateLink).where(EntityTemplateLink.id==link_id, EntityTemplateLink.at_organization_id==org_id, EntityTemplateLink.is_deleted==False))
        return r.scalar_one_or_none()
    async def exists(self, org_id, entity_type, event_name, exclude_id=None):
        q = select(EntityTemplateLink).where(EntityTemplateLink.at_organization_id==org_id, EntityTemplateLink.entity_type==entity_type, EntityTemplateLink.event_name==event_name, EntityTemplateLink.is_deleted==False)
        if exclude_id: q = q.where(EntityTemplateLink.id != exclude_id)
        return (await self.db.execute(q)).scalar_one_or_none() is not None
    async def has_active_links(self, org_id, template_id):
        q = select(EntityTemplateLink).where(EntityTemplateLink.at_organization_id==org_id, EntityTemplateLink.nt_email_template_id==template_id, EntityTemplateLink.is_deleted==False)
        return (await self.db.execute(q)).scalar_one_or_none() is not None
    async def create(self, obj):
        self.db.add(obj); await self.db.flush(); await self.db.refresh(obj); return obj
    async def save(self, obj):
        await self.db.flush(); await self.db.refresh(obj); return obj
    async def soft_delete(self, obj, user_id):
        obj.is_deleted=True; obj.updated_by=user_id; obj.updated_at=_now(); await self.db.flush()

class SendLogRepo:
    def __init__(self, db): self.db = db
    async def list(self, org_id, status=None, template_id=None, entity_type=None, entity_id=None, has_attachment=None, from_date=None, to_date=None, page=1, per_page=50):
        q = select(EmailSendLog).where(EmailSendLog.at_organization_id==org_id)
        if status: q = q.where(EmailSendLog.status==status)
        if template_id: q = q.where(EmailSendLog.nt_email_template_id==template_id)
        if entity_type: q = q.where(EmailSendLog.entity_type==entity_type)
        if entity_id: q = q.where(EmailSendLog.entity_id==entity_id)
        if has_attachment is not None: q = q.where(EmailSendLog.has_attachment==has_attachment)
        if from_date: q = q.where(EmailSendLog.created_at>=from_date)
        if to_date: q = q.where(EmailSendLog.created_at<=to_date)
        q = q.order_by(EmailSendLog.created_at.desc())
        total = (await self.db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
        r = await self.db.execute(q.offset((page-1)*per_page).limit(per_page))
        return r.scalars().all(), total
    async def get(self, org_id, log_id):
        r = await self.db.execute(select(EmailSendLog).where(EmailSendLog.id==log_id, EmailSendLog.at_organization_id==org_id))
        return r.scalar_one_or_none()
    async def create(self, obj):
        self.db.add(obj); await self.db.flush(); await self.db.refresh(obj); return obj
    async def update_status(self, log_id, status, **kwargs):
        await self.db.execute(update(EmailSendLog).where(EmailSendLog.id==log_id).values(status=status, **kwargs))

class EmailQueueRepo:
    def __init__(self, db): self.db = db
    async def create(self, obj):
        self.db.add(obj); await self.db.flush(); await self.db.refresh(obj); return obj
