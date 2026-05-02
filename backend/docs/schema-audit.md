# Backend Schema Audit Against Core Service RBAC LLD

Source of truth: LLD column list provided in the implementation request. `Core_Service_RBAC_LLD.docx` was not present in the workspace.

## Summary

All audited tables use the `at_` prefix. Tenant-owned tables retain `at_organization_id`. Existing backward-compatible UI/API columns were kept where already used, and new canonical LLD fields were added through migration `0002_align_schema_with_lld`.

Service-facing SQLAlchemy attributes such as `user_id`, `role_id`, and `resource_id` are preserved for API compatibility, while the database columns are mapped to LLD names such as `at_user_id`, `at_role_id`, and `at_resource_id`.

## at_organization

- LLD columns: `id`, `org_code`, `org_name`, `plan`, `is_verified`, `settings_json`, `subscription_ends_at`, `is_active`, `created_at`, `created_by`, `updated_at`, `updated_by`, `is_deleted`.
- Current columns after alignment: `id`, `org_code`, `org_name`, `timezone`, `plan`, `logo_url`, `support_email`, `allowed_origins`, `is_active`, `is_verified`, audit block, `settings_json`, `subscription_ends_at`.
- Missing columns added: `settings_json JSONB default {}`, `subscription_ends_at timestamptz`.
- Extra columns kept: `timezone`, `logo_url`, `support_email`, `allowed_origins`; these are backward-compatible UI fields and are mirrored from/to `settings_json`.
- Service impact: signup stores timezone/support email in `settings_json`; organization update treats `settings_json` as canonical and mirrors known values to legacy columns.

## at_resource

- LLD columns: `resource_key`, `resource_name`, `resource_type`, `resource_group`, `description`, `sequence_no`, `parent_resource_key`, `http_method`, `api_path`, `microservice`, `is_ui_visible`, `is_active`, audit block, `is_deleted`.
- Current columns after alignment: all LLD columns plus `ui_path`, `icon`.
- Missing columns added: none.
- Extra columns kept: `ui_path`, `icon`; used by navigation/UI rendering and backward-compatible.
- Service impact: resource create/update/delete remain soft-delete based and now audit old/new values.

## at_resource_permission

- LLD columns: `id`, `at_resource_id`, `resource_key`, `permissions_json`, `is_active`, audit block, `is_deleted`, unique `at_resource_id`.
- Current columns after alignment: `id`, `at_resource_id` mapped as model `resource_id`, `resource_key`, `permissions_json`, `is_active`, audit block.
- Missing columns added: `resource_key`, `is_active`; existing `resource_id` column renamed to `at_resource_id`.
- Extra columns kept: none harmful.
- Service impact: resource permission creation/upsert now writes `resource_key`; deletes mark permission rows inactive/deleted.

## at_role

- LLD columns: `id`, `at_organization_id`, `role_code`, `role_name`, `description`, `is_system`, `is_active`, audit block, `is_deleted`, unique `(at_organization_id, role_code)`.
- Current columns after alignment: all LLD columns.
- Missing columns added: `is_active`.
- Extra columns kept: none harmful.
- Service impact: role delete remains soft delete and now also sets `is_active = false`; role create/update/delete audit old/new values.

## at_role_permission

- LLD columns: `id`, `at_role_id`, `at_organization_id`, `permissions_json`, `updated_at`, `updated_by`, unique `at_role_id`.
- Current columns after alignment: LLD columns plus `created_at`, `created_by`, `is_deleted`.
- Missing columns added: `at_organization_id`; existing `role_id` column renamed to `at_role_id`.
- Extra columns kept: `created_at`, `created_by`, `is_deleted` as implementation enhancement for no-hard-delete consistency.
- Service impact: role permission create/update writes `at_organization_id`; permission replacement sets `updated_by` and audits old/new permission JSON.

## at_user

- LLD columns: `id`, `at_organization_id`, `email`, `password_hash`, `full_name`, `department`, `phone`, `is_email_verified`, `mfa_enabled`, `mfa_secret_enc`, `last_login_at`, `failed_attempts`, `locked_until`, `password_changed_at`, `is_active`, audit block, `is_deleted`, unique `(at_organization_id, email)`.
- Current columns after alignment: all LLD columns plus `title`.
- Missing columns added: `phone`, `mfa_enabled`, `mfa_secret_enc`, `password_changed_at`.
- Extra columns kept: `title`; existing UI/user forms depend on it.
- Service impact: signup/user creation and password update set `password_changed_at`; login updates `last_login_at`, `failed_attempts`, and `locked_until`; responses do not expose `password_hash` or `mfa_secret_enc`.

## at_user_role

- LLD columns: `id`, `at_user_id`, `at_role_id`, `at_organization_id`, `assigned_at`, `assigned_by`, unique `(at_user_id, at_role_id)`.
- Current columns after alignment: LLD columns plus audit block and `is_deleted`.
- Missing columns added: `assigned_at`, `assigned_by`; existing `user_id`/`role_id` columns renamed to `at_user_id`/`at_role_id`.
- Extra columns kept: audit block and `is_deleted` as no-hard-delete implementation enhancement.
- Service impact: assignment services validate user/role organization scope and now fill assignment metadata.

## at_refresh_token

- LLD columns: `id`, `at_user_id`, `at_organization_id`, `token_hash`, `issued_at`, `expires_at`, `revoked_at`, `device_info`, indexes on user/revoked and token hash.
- Current columns after alignment: all LLD columns plus `rotated_from_id`, `user_agent`, audit block and `is_deleted`.
- Missing columns added: `issued_at`, `device_info`; existing `user_id` column renamed to `at_user_id`.
- Extra columns kept: `rotated_from_id`, `user_agent`, audit block and `is_deleted`; these support refresh-token rotation and backward compatibility.
- Service impact: login/refresh writes `issued_at` and mirrors request user-agent into `device_info`.

## at_audit_log

- LLD columns: `id`, `at_organization_id`, `at_user_id`, `action`, `resource_type`, `resource_id`, `old_value_json`, `new_value_json`, `ip_address`, `user_agent`, `correlation_id`, `created_at`, required indexes.
- Current columns after alignment: all LLD columns plus `actor_user_id`, `target_user_id`, `resource_key`, `message`, `details_json`.
- Missing columns added: `at_user_id`, `old_value_json`, `new_value_json`, `ip_address`, `user_agent`, `correlation_id`; required indexes added.
- Extra columns kept: actor/target split, `resource_key`, `message`, `details_json`; they are useful for existing audit pages and richer messages.
- Service impact: audit service maps actor to `at_user_id` and supports old/new values, request/device metadata, and correlation IDs.

## Verification Notes

- `alembic upgrade head` completed and `alembic_version` is `0002_align_schema_with_lld`.
- `scripts/seed.py` was run twice successfully after migration.
- `settings_json` contains timezone for seeded organizations.
- `pytest` could not be executed with the available Python runtime because the project venv points to a broken Windows Store Python alias and the fallback embedded Python lacks `unittest`. The existing test functions were run manually and passed.
