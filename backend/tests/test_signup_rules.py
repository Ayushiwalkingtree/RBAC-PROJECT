from app.services.signup_service import CORE_ORG_ADMIN_PERMISSIONS


def test_signup_org_admin_core_permissions_exclude_resource_registry() -> None:
    assert CORE_ORG_ADMIN_PERMISSIONS["USER_LIST_API"] == ["READ"]
    assert CORE_ORG_ADMIN_PERMISSIONS["USER_CREATE_API"] == ["EXECUTE"]
    assert CORE_ORG_ADMIN_PERMISSIONS["ROLE_MANAGE_API"] == ["CREATE", "READ", "UPDATE", "DELETE"]
    assert CORE_ORG_ADMIN_PERMISSIONS["PERM_GRANT_API"] == ["READ", "CONFIGURE"]
    assert CORE_ORG_ADMIN_PERMISSIONS["ORG_SETTINGS"] == ["VIEW", "UPDATE"]
    assert "RESOURCE_MANAGE_API" not in CORE_ORG_ADMIN_PERMISSIONS
    assert "RESOURCE_REGISTRY_MENU" not in CORE_ORG_ADMIN_PERMISSIONS
