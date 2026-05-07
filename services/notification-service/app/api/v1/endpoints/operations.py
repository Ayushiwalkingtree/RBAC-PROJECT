# from typing import Optional
# from datetime import datetime
# from fastapi import APIRouter, Depends, HTTPException, Query
# from sqlalchemy.ext.asyncio import AsyncSession
# from app.core.database import get_db
# from app.core.security import get_org_context, OrganizationContext
# from app.core.responses import ok, err, paginated
# from app.models.models import EntityTemplateLink
# from app.repositories.repositories import EntityLinkRepo, SendLogRepo
# from app.schemas.schemas import EntityLinkCreate, EntityLinkUpdate, EntityLinkResponse, SendEmailRequest, SendRawRequest, SendLogResponse, RequeueRequest
# from app.services.send_service import SendService
# from app.core.logging import get_logger
# logger = get_logger(__name__)

# links_router = APIRouter(prefix="/email-links", tags=["entity-links"])

# @links_router.get("", summary="List entity-template links")
# async def list_links(entity_type: Optional[str]=Query(None), page: int=Query(1,ge=1), ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
#     """All entity-event→template mappings. **Tenant from JWT.**"""
#     repo = EntityLinkRepo(db)
#     links, total = await repo.list(ctx.org_id, entity_type, page)
#     return paginated([EntityLinkResponse.from_model(l).model_dump() for l in links], total, page, 20)

# @links_router.post("", status_code=201, summary="Create entity-template link")
# async def create_link(body: EntityLinkCreate, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
#     """Map entity event to template. **at_organization_id from JWT.**"""
#     repo = EntityLinkRepo(db)
#     if await repo.exists(ctx.org_id, body.entity_type, body.event_name):
#         raise HTTPException(409, detail=err("LINK_EXISTS",f"Mapping for {body.entity_type}:{body.event_name} exists"))
#     link = EntityTemplateLink(at_organization_id=ctx.org_id, entity_type=body.entity_type, event_name=body.event_name,
#         nt_email_template_id=body.template_id, recipient_field=body.recipient_field,
#         cc_fields_json=body.cc_fields_json, variable_mapping_json=body.variable_mapping_json,
#         is_async=body.is_async, created_by=ctx.user_id)
#     link = await repo.create(link)
#     return ok(EntityLinkResponse.from_model(link).model_dump())

# @links_router.put("/{link_id}", summary="Update entity-template link")
# async def update_link(link_id: int, body: EntityLinkUpdate, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
#     repo = EntityLinkRepo(db)
#     link = await repo.get(ctx.org_id, link_id)
#     if not link: raise HTTPException(404, detail=err("LINK_NOT_FOUND","Not found"))
#     for f,v in body.model_dump(exclude_none=True).items():
#         if f=="template_id": link.nt_email_template_id=v
#         elif hasattr(link,f): setattr(link,f,v)
#     link.updated_by=ctx.user_id
#     link = await repo.save(link)
#     return ok(EntityLinkResponse.from_model(link).model_dump())

# @links_router.delete("/{link_id}", summary="Delete entity-template link")
# async def delete_link(link_id: int, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
#     repo = EntityLinkRepo(db)
#     link = await repo.get(ctx.org_id, link_id)
#     if not link: raise HTTPException(404, detail=err("LINK_NOT_FOUND","Not found"))
#     await repo.soft_delete(link, ctx.user_id)
#     return ok({"message": "Link removed"})

# send_router = APIRouter(prefix="/emails", tags=["send"])

# @send_router.post("/send", summary="Send template email")
# async def send_email(body: SendEmailRequest, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
#     """Send email using template. **Tenant from JWT.** has_attachment=true for files."""
#     org_id = ctx.org_id if ctx.org_id != 0 else (body.org_id or 0)
#     if not org_id: raise HTTPException(400, detail=err("MISSING_ORG","org_id required for service token"))
#     svc = SendService(db)
#     try:
#         result = await svc.send_template_email(org_id, ctx.user_id, body)
#     except ValueError as e:
#         msg=str(e); code=msg.split(":")[0]; detail_msg=msg.split(":",1)[1].strip() if ":" in msg else msg
#         status=404 if "NOT_FOUND" in code else 400 if any(x in code for x in ["MISSING","TOO_MANY"]) else 422
#         raise HTTPException(status, detail=err(code, detail_msg))
#     return ok(result)

# @send_router.post("/send-raw", summary="Send raw email (no template)")
# async def send_raw(body: SendRawRequest, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
#     """Send raw HTML. Restricted to admin/service-token. **Tenant from JWT.**"""
#     org_id = ctx.org_id if ctx.org_id != 0 else (body.org_id or 0)
#     svc = SendService(db)
#     try:
#         result = await svc.send_raw_email(org_id, ctx.user_id, body)
#     except ValueError as e:
#         raise HTTPException(422, detail=err("SEND_ERROR", str(e)))
#     return ok(result)

# jobs_router = APIRouter(prefix="/emails/jobs", tags=["jobs"])

# @jobs_router.get("", summary="List email jobs")
# async def list_jobs(status: Optional[str]=Query(None), template_id: Optional[int]=Query(None), entity_type: Optional[str]=Query(None), entity_id: Optional[int]=Query(None), has_attachment: Optional[bool]=Query(None), from_date: Optional[datetime]=Query(None), to_date: Optional[datetime]=Query(None), page: int=Query(1,ge=1), per_page: int=Query(50,ge=1,le=100), ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
#     """Email send log for caller's org. **Tenant from JWT.**"""
#     repo = SendLogRepo(db)
#     logs, total = await repo.list(ctx.org_id, status, template_id, entity_type, entity_id, has_attachment, from_date, to_date, page, per_page)
#     return paginated([SendLogResponse.from_model(l).model_dump() for l in logs], total, page, per_page)

# @jobs_router.get("/{send_log_id}", summary="Get email job")
# async def get_job(send_log_id: int, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
#     """Job detail. **Tenant from JWT** — another org's job returns 404."""
#     log = await SendLogRepo(db).get(ctx.org_id, send_log_id)
#     if not log: raise HTTPException(404, detail=err("JOB_NOT_FOUND","Not found"))
#     return ok(SendLogResponse.from_model(log).model_dump())

# @jobs_router.post("/{send_log_id}/requeue", summary="Re-queue failed job")
# async def requeue_job(send_log_id: int, body: RequeueRequest, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
#     """Re-queue FAILED/DLQ job. **Tenant from JWT.**"""
#     svc = SendService(db)
#     try:
#         return ok(await svc.requeue_job(ctx.org_id, send_log_id, body.priority))
#     except ValueError as e:
#         msg=str(e); code=msg.split(":")[0]; status=404 if "NOT_FOUND" in code else 422
#         raise HTTPException(status, detail=err(code, msg.split(":",1)[-1].strip()))

# @jobs_router.delete("/{send_log_id}", summary="Cancel queued job")
# async def cancel_job(send_log_id: int, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
#     """Cancel QUEUED job. **Tenant from JWT.**"""
#     svc = SendService(db)
#     try:
#         return ok(await svc.cancel_job(ctx.org_id, send_log_id))
#     except ValueError as e:
#         msg=str(e); code=msg.split(":")[0]; status=404 if "NOT_FOUND" in code else 422
#         raise HTTPException(status, detail=err(code, msg.split(":",1)[-1].strip()))

# webhooks_router = APIRouter(prefix="/emails/webhooks", tags=["webhooks"])

# @webhooks_router.post("/{provider}", summary="Delivery webhook ingest")
# async def webhook_ingest(provider: str, db: AsyncSession=Depends(get_db)):
#     """Provider delivery callbacks. **No JWT** — Kong IP restriction + signature validation."""
#     logger.info(f"[WEBHOOK] provider={provider}")
#     return {"processed": 1}




from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_org_context, OrganizationContext
from app.core.responses import ok, err, paginated
from app.models.models import EntityTemplateLink
from app.repositories.repositories import EntityLinkRepo, SendLogRepo
from app.schemas.schemas import EntityLinkCreate, EntityLinkUpdate, EntityLinkResponse, SendEmailRequest, SendRawRequest, SendLogResponse, RequeueRequest
from app.services.send_service import SendService
from app.core.logging import get_logger
logger = get_logger(__name__)

links_router = APIRouter(prefix="/email-links", tags=["entity-links"])

@links_router.get("", summary="List entity-template links")
async def list_links(entity_type: Optional[str]=Query(None), page: int=Query(1,ge=1), ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """All entity-event→template mappings. **Tenant from JWT.**"""
    repo = EntityLinkRepo(db)
    links, total = await repo.list(ctx.org_id, entity_type, page)
    return paginated([EntityLinkResponse.from_model(l).model_dump() for l in links], total, page, 20)

@links_router.post("", status_code=201, summary="Create entity-template link")
async def create_link(body: EntityLinkCreate, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Map entity event to template. **at_organization_id from JWT.**"""
    repo = EntityLinkRepo(db)
    if await repo.exists(ctx.org_id, body.entity_type, body.event_name):
        raise HTTPException(409, detail=err("LINK_EXISTS",f"Mapping for {body.entity_type}:{body.event_name} exists"))
    link = EntityTemplateLink(
        at_organization_id    = ctx.org_id,
        entity_type           = body.entity_type,
        event_name            = body.event_name,
        nt_email_template_id  = body.template_id,
        nt_email_config_id    = body.email_config_id,   # ← save SMTP config override
        recipient_field       = body.recipient_field,
        cc_fields_json        = body.cc_fields_json,
        variable_mapping_json = body.variable_mapping_json,
        is_async              = body.is_async,
        created_by            = ctx.user_id,
    )
    link = await repo.create(link)
    return ok(EntityLinkResponse.from_model(link).model_dump())

@links_router.put("/{link_id}", summary="Update entity-template link")
async def update_link(link_id: int, body: EntityLinkUpdate, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    repo = EntityLinkRepo(db)
    link = await repo.get(ctx.org_id, link_id)
    if not link: raise HTTPException(404, detail=err("LINK_NOT_FOUND","Not found"))
    for f, v in body.model_dump(exclude_unset=True).items():
        if f == "template_id":
            link.nt_email_template_id = v
        elif f == "email_config_id":
            link.nt_email_config_id = v         # ← map to DB column name
        elif hasattr(link, f):
            setattr(link, f, v)
    link.updated_by=ctx.user_id
    link = await repo.save(link)
    return ok(EntityLinkResponse.from_model(link).model_dump())

@links_router.delete("/{link_id}", summary="Delete entity-template link")
async def delete_link(link_id: int, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    repo = EntityLinkRepo(db)
    link = await repo.get(ctx.org_id, link_id)
    if not link: raise HTTPException(404, detail=err("LINK_NOT_FOUND","Not found"))
    await repo.soft_delete(link, ctx.user_id)
    return ok({"message": "Link removed"})

send_router = APIRouter(prefix="/emails", tags=["send"])

@send_router.post("/send", summary="Send template email")
async def send_email(body: SendEmailRequest, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Send email using template. **Tenant from JWT.** has_attachment=true for files."""
    org_id = ctx.org_id if ctx.org_id != 0 else (body.org_id or 0)
    if not org_id: raise HTTPException(400, detail=err("MISSING_ORG","org_id required for service token"))
    svc = SendService(db)
    try:
        result = await svc.send_template_email(org_id, ctx.user_id, body)
    except ValueError as e:
        msg=str(e); code=msg.split(":")[0]; detail_msg=msg.split(":",1)[1].strip() if ":" in msg else msg
        status=404 if "NOT_FOUND" in code else 400 if any(x in code for x in ["MISSING","TOO_MANY"]) else 422
        raise HTTPException(status, detail=err(code, detail_msg))
    return ok(result)

@send_router.post("/send-raw", summary="Send raw email (no template)")
async def send_raw(body: SendRawRequest, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Send raw HTML. Restricted to admin/service-token. **Tenant from JWT.**"""
    org_id = ctx.org_id if ctx.org_id != 0 else (body.org_id or 0)
    svc = SendService(db)
    try:
        result = await svc.send_raw_email(org_id, ctx.user_id, body)
    except ValueError as e:
        raise HTTPException(422, detail=err("SEND_ERROR", str(e)))
    return ok(result)

jobs_router = APIRouter(prefix="/emails/jobs", tags=["jobs"])

@jobs_router.get("", summary="List email jobs")
async def list_jobs(status: Optional[str]=Query(None), template_id: Optional[int]=Query(None), entity_type: Optional[str]=Query(None), entity_id: Optional[int]=Query(None), has_attachment: Optional[bool]=Query(None), from_date: Optional[datetime]=Query(None), to_date: Optional[datetime]=Query(None), page: int=Query(1,ge=1), per_page: int=Query(50,ge=1,le=100), ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Email send log for caller's org. **Tenant from JWT.**"""
    repo = SendLogRepo(db)
    logs, total = await repo.list(ctx.org_id, status, template_id, entity_type, entity_id, has_attachment, from_date, to_date, page, per_page)
    return paginated([SendLogResponse.from_model(l).model_dump() for l in logs], total, page, per_page)

@jobs_router.get("/{send_log_id}", summary="Get email job")
async def get_job(send_log_id: int, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Job detail. **Tenant from JWT** — another org's job returns 404."""
    log = await SendLogRepo(db).get(ctx.org_id, send_log_id)
    if not log: raise HTTPException(404, detail=err("JOB_NOT_FOUND","Not found"))
    return ok(SendLogResponse.from_model(log).model_dump())

@jobs_router.post("/{send_log_id}/requeue", summary="Re-queue failed job")
async def requeue_job(send_log_id: int, body: RequeueRequest, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Re-queue FAILED/DLQ job. **Tenant from JWT.**"""
    svc = SendService(db)
    try:
        return ok(await svc.requeue_job(ctx.org_id, send_log_id, body.priority))
    except ValueError as e:
        msg=str(e); code=msg.split(":")[0]; status=404 if "NOT_FOUND" in code else 422
        raise HTTPException(status, detail=err(code, msg.split(":",1)[-1].strip()))

@jobs_router.delete("/{send_log_id}", summary="Cancel queued job")
async def cancel_job(send_log_id: int, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Cancel QUEUED job. **Tenant from JWT.**"""
    svc = SendService(db)
    try:
        return ok(await svc.cancel_job(ctx.org_id, send_log_id))
    except ValueError as e:
        msg=str(e); code=msg.split(":")[0]; status=404 if "NOT_FOUND" in code else 422
        raise HTTPException(status, detail=err(code, msg.split(":",1)[-1].strip()))

webhooks_router = APIRouter(prefix="/emails/webhooks", tags=["webhooks"])

@webhooks_router.post("/{provider}", summary="Delivery webhook ingest")
async def webhook_ingest(provider: str, db: AsyncSession=Depends(get_db)):
    """Provider delivery callbacks. **No JWT** — Kong IP restriction + signature validation."""
    logger.info(f"[WEBHOOK] provider={provider}")
    return {"processed": 1}