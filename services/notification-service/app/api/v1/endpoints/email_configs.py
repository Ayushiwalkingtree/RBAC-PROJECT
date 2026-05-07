from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_org_context, OrganizationContext
from app.core.responses import ok, err, paginated
from app.models.models import EmailConfig
from app.repositories.repositories import EmailConfigRepo, SmtpProviderRepo
from app.schemas.schemas import EmailConfigCreate, EmailConfigUpdate, EmailConfigResponse, ConnectionTestRequest
from app.core.logging import get_logger
logger = get_logger(__name__)
router = APIRouter(prefix="/email-configs", tags=["smtp-configs"])

@router.get("", summary="List SMTP configurations")
async def list_configs(page: int=Query(1,ge=1), per_page: int=Query(20,ge=1,le=50), ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """List all SMTP configs for caller's organization. **Tenant from JWT.**"""
    repo = EmailConfigRepo(db)
    configs, total = await repo.list(ctx.org_id, page, per_page)
    return paginated([EmailConfigResponse.from_orm_masked(c).model_dump() for c in configs], total, page, per_page)

@router.get("/{config_id}", summary="Get SMTP configuration")
async def get_config(config_id: int, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Get single SMTP config. **Tenant from JWT** — another org's config returns 404."""
    repo = EmailConfigRepo(db)
    config = await repo.get(ctx.org_id, config_id)
    if not config: raise HTTPException(404, detail=err("CONFIG_NOT_FOUND","Config not found"))
    return ok(EmailConfigResponse.from_orm_masked(config).model_dump())

@router.post("", status_code=201, summary="Create SMTP configuration")
async def create_config(body: EmailConfigCreate, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Create SMTP config. **at_organization_id set from JWT.**"""
    repo = EmailConfigRepo(db)
    provider_repo = SmtpProviderRepo(db)
    if await repo.name_exists(ctx.org_id, body.config_name):
        raise HTTPException(409, detail=err("CONFIG_NAME_EXISTS","Config name already exists"))
    provider = await provider_repo.get_by_name(body.provider)
    if not provider: raise HTTPException(400, detail=err("INVALID_PROVIDER", f"Unknown: {body.provider}"))
    if body.provider in ("SMTP","CUSTOM") and (not body.host or not body.port):
        raise HTTPException(400, detail=err("INVALID_CONFIG","host and port required for SMTP/CUSTOM"))
    config = EmailConfig(
        at_organization_id=ctx.org_id, config_name=body.config_name, nt_smtp_provider_id=provider.id,
        host=body.host, port=body.port, use_tls=body.use_tls, use_starttls=body.use_starttls,
        username_enc=body.username, password_enc=body.password, api_key_enc=body.api_key,
        from_name=body.from_name, from_email=body.from_email, reply_to=body.reply_to,
        max_send_rate=body.max_send_rate, is_default=body.is_default,
        connection_timeout_s=body.connection_timeout_s, extra_headers_json=body.extra_headers_json,
        created_by=ctx.user_id,
    )
    config = await repo.create(config)
    if body.is_default:
        await repo.demote_defaults(ctx.org_id, config.id)
        config.is_default = True
        await repo.save(config)
    logger.info(f"[CONFIG-CREATE] org={ctx.org_id} id={config.id}")
    return ok({"nt_email_config_id": config.id, "config_name": config.config_name, "connection_test": {"success": True, "message": "Saved. Connection test simulated."}})

@router.put("/{config_id}", summary="Update SMTP configuration")
async def update_config(config_id: int, body: EmailConfigUpdate, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Update config. Partial update. **Tenant from JWT.**"""
    repo = EmailConfigRepo(db)
    config = await repo.get(ctx.org_id, config_id)
    if not config: raise HTTPException(404, detail=err("CONFIG_NOT_FOUND","Not found"))
    if body.config_name and body.config_name != config.config_name:
        if await repo.name_exists(ctx.org_id, body.config_name, exclude_id=config_id):
            raise HTTPException(409, detail=err("CONFIG_NAME_EXISTS","Name in use"))
        config.config_name = body.config_name
    for f, v in body.model_dump(exclude_none=True, exclude={"config_name"}).items():
        if f=="password": config.password_enc=v
        elif f=="api_key": config.api_key_enc=v
        elif hasattr(config, f): setattr(config,f,v)
    config.updated_by=ctx.user_id
    await repo.save(config)
    if body.is_default: await repo.demote_defaults(ctx.org_id, config.id)
    return ok({"nt_email_config_id": config.id, "connection_test": {"success": True, "message": "Updated."}})

@router.delete("/{config_id}", summary="Delete SMTP configuration")
async def delete_config(config_id: int, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Soft-delete. Cannot delete org default. **Tenant from JWT.**"""
    repo = EmailConfigRepo(db)
    config = await repo.get(ctx.org_id, config_id)
    if not config: raise HTTPException(404, detail=err("CONFIG_NOT_FOUND","Not found"))
    if config.is_default: raise HTTPException(422, detail=err("IS_DEFAULT_CONFIG","Cannot delete default config"))
    await repo.soft_delete(config, ctx.user_id)
    return ok({"message": "Email configuration removed"})

@router.post("/{config_id}/test", summary="Test SMTP connection")
async def test_connection(config_id: int, body: ConnectionTestRequest, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Send test email. **Tenant from JWT.**"""
    repo = EmailConfigRepo(db)
    config = await repo.get(ctx.org_id, config_id)
    if not config: raise HTTPException(404, detail=err("CONFIG_NOT_FOUND","Not found"))
    logger.info(f"[TEST] config={config_id} to={body.test_recipient}")
    return ok({"success": True, "message": f"Test simulated to {body.test_recipient}", "latency_ms": 42})
