from app.schemas.signup import SignupRequest, SignupResponse
from app.services.signup_service import DEFAULT_SIGNUP_PLAN, DEFAULT_SIGNUP_TIMEZONE, CORE_ORG_ADMIN_PERMISSIONS
from app.utils.email_domain import email_domain, is_public_email_domain


def test_signup_org_admin_core_permissions_exclude_resource_registry() -> None:
    assert CORE_ORG_ADMIN_PERMISSIONS["USER_LIST_API"] == ["READ"]
    assert CORE_ORG_ADMIN_PERMISSIONS["USER_CREATE_API"] == ["EXECUTE"]
    assert CORE_ORG_ADMIN_PERMISSIONS["ROLE_MANAGE_API"] == ["CREATE", "READ", "UPDATE", "DELETE"]
    assert CORE_ORG_ADMIN_PERMISSIONS["PERM_GRANT_API"] == ["READ", "CONFIGURE"]
    assert CORE_ORG_ADMIN_PERMISSIONS["ORG_SETTINGS"] == ["VIEW", "UPDATE"]
    assert CORE_ORG_ADMIN_PERMISSIONS["ROLES_MENU"] == ["VIEW"]
    assert CORE_ORG_ADMIN_PERMISSIONS["PERMISSION_MATRIX_MENU"] == ["VIEW"]
    assert CORE_ORG_ADMIN_PERMISSIONS["SETTINGS_MENU"] == ["VIEW"]
    assert CORE_ORG_ADMIN_PERMISSIONS["AUDIT_LOG_MENU"] == ["VIEW"]
    assert "RESOURCE_MANAGE_API" not in CORE_ORG_ADMIN_PERMISSIONS
    assert "RESOURCE_REGISTRY_MENU" not in CORE_ORG_ADMIN_PERMISSIONS


def test_signup_response_does_not_expose_verification_token() -> None:
    response = SignupResponse(
        organization_id=1,
        org_code="ACME_BANK",
        admin_user_id=2,
        message="Organization created. Please verify your email using the link sent to your inbox.",
    )

    assert "verification_token" not in response.model_dump()


def test_signup_request_does_not_require_org_code_plan_or_timezone() -> None:
    payload = SignupRequest(
        org_name="Demo Tenant",
        admin_name="Demo Admin",
        admin_email="admin@example.com",
        password="SecurePass123!",
    )

    assert payload.model_dump() == {
        "org_name": "Demo Tenant",
        "admin_name": "Demo Admin",
        "admin_email": "admin@example.com",
        "password": "SecurePass123!",
    }
    assert DEFAULT_SIGNUP_TIMEZONE == "Asia/Kolkata"
    assert DEFAULT_SIGNUP_PLAN == "STARTER"


def test_signup_business_email_domain_rules() -> None:
    assert email_domain("Admin@ABC.com") == "abc.com"
    assert is_public_email_domain("gmail.com")
    assert not is_public_email_domain("abc.com")
