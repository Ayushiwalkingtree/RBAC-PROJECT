from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_org_context, OrganizationContext
from app.core.responses import ok, err, paginated
from app.models.models import EmailTemplate, TemplateVersion
from app.repositories.repositories import EmailTemplateRepo, TemplateVersionRepo, EntityLinkRepo
from app.schemas.schemas import EmailTemplateCreate, EmailTemplateUpdate, EmailTemplateResponse, TemplatePreviewRequest, RestoreVersionRequest
from app.template_engine.renderer import validate_template_syntax, render_template, validate_variables, build_render_context, get_example_context
from app.core.logging import get_logger
logger = get_logger(__name__)
router = APIRouter(prefix="/email-templates", tags=["templates"])

@router.get("", summary="List email templates")
async def list_templates(locale: Optional[str]=Query(None), entity_type: Optional[str]=Query(None), is_platform_default: Optional[bool]=Query(None), page: int=Query(1,ge=1), per_page: int=Query(20,ge=1,le=100), ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """List templates for caller's org. **Tenant from JWT.**"""
    repo = EmailTemplateRepo(db)
    templates, total = await repo.list(ctx.org_id, locale, entity_type, is_platform_default, page, per_page)
    return paginated([EmailTemplateResponse.from_model(t).model_dump() for t in templates], total, page, per_page)

@router.get("/{template_id}", summary="Get email template")
async def get_template(template_id: int, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Get template. **Tenant from JWT.**"""
    t = await EmailTemplateRepo(db).get(ctx.org_id, template_id)
    if not t: raise HTTPException(404, detail=err("TEMPLATE_NOT_FOUND","Not found"))
    return ok(EmailTemplateResponse.from_model(t).model_dump())

@router.post("", status_code=201, summary="Create email template")
async def create_template(body: EmailTemplateCreate, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Create template. **at_organization_id from JWT.** Jinja2 validated on save."""
    repo = EmailTemplateRepo(db)
    if await repo.key_exists(ctx.org_id, body.template_key, body.locale):
        raise HTTPException(409, detail=err("TEMPLATE_KEY_EXISTS","Key already exists for this org+locale"))
    for src, label in [(body.subject,"Subject"),(body.html_body,"HTML body")]:
        valid, se = validate_template_syntax(src)
        if not valid: raise HTTPException(422, detail=err("TEMPLATE_SYNTAX_ERROR",f"{label}: {se}"))
    schema = [v.model_dump() for v in body.variables_schema_json]
    t = EmailTemplate(at_organization_id=ctx.org_id, template_key=body.template_key, template_name=body.template_name,
        description=body.description, entity_type=body.entity_type, subject=body.subject, html_body=body.html_body,
        text_body=body.text_body, storage_type=body.storage_type, variables_schema_json=schema,
        locale=body.locale, version=1, is_platform_default=False, nt_email_config_id=body.nt_email_config_id, created_by=ctx.user_id)
    t = await repo.create(t)
    ex = get_example_context(schema)
    ctx_full = build_render_context(ex, {"id": ctx.org_id, "name": f"Org {ctx.org_id}"})
    _, ps, _ = render_template(body.subject, ctx_full)
    _, ph, _ = render_template(body.html_body, ctx_full)
    return ok({"nt_email_template_id": t.id, "template_key": t.template_key, "version": 1, "preview_subject": ps, "preview_html": ph})

@router.put("/{template_id}", summary="Update email template")
async def update_template(template_id: int, body: EmailTemplateUpdate, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Update template. Snapshots previous. **Tenant from JWT. version required.**"""
    repo = EmailTemplateRepo(db); ver_repo = TemplateVersionRepo(db)
    t = await repo.get(ctx.org_id, template_id)
    if not t: raise HTTPException(404, detail=err("TEMPLATE_NOT_FOUND","Not found"))
    if t.version != body.version: raise HTTPException(409, detail=err("VERSION_CONFLICT",f"Current: {t.version}, provided: {body.version}"))
    for src in [body.subject, body.html_body]:
        if src:
            valid, se = validate_template_syntax(src)
            if not valid: raise HTTPException(422, detail=err("TEMPLATE_SYNTAX_ERROR", se))
    snap = TemplateVersion(nt_email_template_id=t.id, at_organization_id=ctx.org_id, version=t.version,
        subject=t.subject, html_body=t.html_body, text_body=t.text_body,
        variables_schema_json=t.variables_schema_json or [], saved_by=ctx.user_id, change_note=body.change_note or "Updated")
    await ver_repo.create(snap)
    for f, v in body.model_dump(exclude_none=True, exclude={"version","change_note"}).items():
        if f=="variables_schema_json": t.variables_schema_json=[i.model_dump() if hasattr(i,"model_dump") else i for i in v]
        elif hasattr(t,f): setattr(t,f,v)
    t.version+=1; t.updated_by=ctx.user_id
    t = await repo.save(t)
    schema = t.variables_schema_json or []
    ctx_full = build_render_context(get_example_context(schema), {"id": ctx.org_id})
    _, ph, _ = render_template(t.html_body or "", ctx_full)
    return ok({"nt_email_template_id": t.id, "version": t.version, "preview_html": ph})

@router.post("/{template_id}/preview", summary="Preview template")
async def preview_template(template_id: int, body: TemplatePreviewRequest, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Render template — no email sent. **Tenant from JWT.**"""
    t = await EmailTemplateRepo(db).get(ctx.org_id, template_id)
    if not t: raise HTTPException(404, detail=err("TEMPLATE_NOT_FOUND","Not found"))
    schema = t.variables_schema_json or []
    merged = {**get_example_context(schema), **body.variables}
    ctx_full = build_render_context(merged, {"id": ctx.org_id})
    ok_s, subj, es = render_template(t.subject, ctx_full)
    ok_h, html, eh = render_template(t.html_body or "", ctx_full)
    ok_t, text, _ = render_template(t.text_body or "", ctx_full)
    if not ok_s or not ok_h: raise HTTPException(422, detail=err("TEMPLATE_SYNTAX_ERROR", es or eh))
    _, missing = validate_variables(schema, body.variables)
    return ok({"subject": subj, "html": html, "text": text, "missing_variables": missing})

@router.get("/{template_id}/versions", summary="Version history")
async def get_versions(template_id: int, page: int=Query(1,ge=1), per_page: int=Query(20,ge=1,le=50), ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Version history. **Tenant from JWT.**"""
    versions, total = await TemplateVersionRepo(db).list(ctx.org_id, template_id, page, per_page)
    data = [{"version":v.version,"saved_by":v.saved_by,"saved_at":v.saved_at.isoformat() if v.saved_at else None,"change_note":v.change_note} for v in versions]
    return paginated(data, total, page, per_page)

@router.post("/{template_id}/versions/{version}/restore", summary="Restore version")
async def restore_version(template_id: int, version: int, body: RestoreVersionRequest, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Rollback to version. **Tenant from JWT.**"""
    repo = EmailTemplateRepo(db); ver_repo = TemplateVersionRepo(db)
    t = await repo.get(ctx.org_id, template_id)
    if not t: raise HTTPException(404, detail=err("TEMPLATE_NOT_FOUND","Not found"))
    old = await ver_repo.get_by_version(ctx.org_id, template_id, version)
    if not old: raise HTTPException(404, detail=err("VERSION_NOT_FOUND",f"Version {version} not found"))
    snap = TemplateVersion(nt_email_template_id=t.id, at_organization_id=ctx.org_id, version=t.version,
        subject=t.subject, html_body=t.html_body, text_body=t.text_body,
        variables_schema_json=t.variables_schema_json or [], saved_by=ctx.user_id,
        change_note=f"Auto-snapshot before restore to v{version}")
    await ver_repo.create(snap)
    t.subject=old.subject; t.html_body=old.html_body; t.text_body=old.text_body
    t.variables_schema_json=old.variables_schema_json; t.version+=1; t.updated_by=ctx.user_id
    t = await repo.save(t)
    return ok({"nt_email_template_id": t.id, "version": t.version, "message": f"Restored from version {version}"})

@router.delete("/{template_id}", summary="Delete template")
async def delete_template(template_id: int, ctx: OrganizationContext=Depends(get_org_context), db: AsyncSession=Depends(get_db)):
    """Soft-delete. **Tenant from JWT.**"""
    repo = EmailTemplateRepo(db); link_repo = EntityLinkRepo(db)
    t = await repo.get(ctx.org_id, template_id)
    if not t: raise HTTPException(404, detail=err("TEMPLATE_NOT_FOUND","Not found"))
    if t.is_platform_default: raise HTTPException(422, detail=err("PLATFORM_DEFAULT_PROTECTED","Cannot delete platform default"))
    if await link_repo.has_active_links(ctx.org_id, template_id): raise HTTPException(422, detail=err("TEMPLATE_HAS_ACTIVE_LINKS","Remove entity links first"))
    await repo.soft_delete(t, ctx.user_id)
    return ok({"message": "Template removed"})
