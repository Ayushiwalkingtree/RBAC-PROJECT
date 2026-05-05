from app.services.signup_service import CORE_ORG_ADMIN_PERMISSIONS
from app.schemas.signup import SignupResponse


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
