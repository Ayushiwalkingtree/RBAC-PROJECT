from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.core.rbac import build_nav_tree, has_permission, is_platform_super_admin, merge_permissions
from app.api.v1.endpoints import permissions as permissions_endpoint
from app.services.permission_service import PermissionService
from app.services.resource_service import normalized_available_permission_keys


class ResourceStub:
    def __init__(
        self,
        key: str,
        label: str,
        parent: str | None = None,
        seq: int = 10,
        resource_type: str = "MENU",
        is_ui_visible: bool = True,
    ):
        self.id = seq
        self.resource_key = key
        self.resource_name = label
        self.resource_type = resource_type
        self.resource_group = "Dynamic"
        self.description = f"{label} access"
        self.is_deleted = False
        self.is_active = True
        self.is_ui_visible = is_ui_visible
        self.ui_path = f"/{key.lower()}"
        self.icon = None
        self.http_method = None
        self.api_path = None
        self.microservice = None
        self.parent_resource_key = parent
        self.sequence_no = seq


class PermissionRows:
    def __init__(self, rows: list[tuple[ResourceStub, list]]):
        self.rows = rows

    def all(self) -> list[tuple[ResourceStub, list]]:
        return self.rows


class PermissionSession:
    def __init__(self, permissions_json: list | None = None):
        self.permissions_json = permissions_json if permissions_json is not None else [{"key": "VIEW", "label": "View"}]

    async def execute(self, *_args, **_kwargs) -> PermissionRows:
        return PermissionRows(
            [
                (
                    ResourceStub("NEW_PAGE", "New Page", resource_type="PAGE", seq=30),
                    self.permissions_json,
                )
            ]
        )


class CapturingPermissionService:
    calls: list[dict] = []

    def __init__(self, _session):
        pass

    async def get_role_permissions(self, org_id: int, role_id: int, **kwargs) -> dict:
        self.calls.append({"org_id": org_id, "role_id": role_id, **kwargs})
        return {"role_id": role_id, "role_code": "TEST_ROLE", "resources": [], "permissions_json": {}}


def test_merge_permissions_combines_role_permissions() -> None:
    perms = merge_permissions([
        {"USER_MENU": ["VIEW"]},
        {"USER_MENU": ["READ"], "ROLE_MANAGE_API": ["CREATE"]},
    ])
    assert perms["USER_MENU"] == ["READ", "VIEW"]
    assert perms["ROLE_MANAGE_API"] == ["CREATE"]


def test_view_and_read_are_compatible() -> None:
    assert has_permission({"USER_MENU": ["READ"]}, "USER_MENU", "VIEW")
    assert has_permission({"USER_MENU": ["VIEW"]}, "USER_MENU", "READ")


def test_build_nav_tree_uses_view_permissions_and_parent_order() -> None:
    nav = build_nav_tree(
        {"ROOT": ["VIEW"], "CHILD": ["VIEW"]},
        [ResourceStub("ROOT", "Root", seq=20), ResourceStub("CHILD", "Child", parent="ROOT", seq=10)],
    )
    assert nav[0]["resource_key"] == "ROOT"
    assert nav[0]["children"][0]["resource_key"] == "CHILD"


def test_build_nav_tree_includes_parent_when_child_is_visible() -> None:
    nav = build_nav_tree(
        {"CHILD": ["VIEW"]},
        [ResourceStub("ROOT", "Root", seq=20), ResourceStub("CHILD", "Child", parent="ROOT", seq=10)],
    )
    assert nav[0]["resource_key"] == "ROOT"
    assert nav[0]["children"][0]["resource_key"] == "CHILD"


def test_dynamic_page_resource_is_not_visible_before_assignment() -> None:
    nav = build_nav_tree({}, [ResourceStub("NEW_PAGE", "New Page", resource_type="PAGE")])

    assert nav == []


def test_dynamic_page_resource_is_visible_after_tenant_admin_assignment() -> None:
    nav = build_nav_tree(
        {"NEW_PAGE": ["VIEW"]},
        [ResourceStub("NEW_PAGE", "New Page", resource_type="PAGE", seq=30)],
    )

    assert nav[0]["resource_key"] == "NEW_PAGE"
    assert nav[0]["path"] == "/new_page"
    assert nav[0]["type"] == "PAGE"


def test_dynamic_page_resource_requires_view_permission_for_navigation() -> None:
    nav = build_nav_tree(
        {},
        [ResourceStub("BANK_MANAGEMENT", "Bank management", resource_type="PAGE", seq=30)],
    )

    assert nav == []


def test_navigation_requires_explicit_view_grant() -> None:
    nav = build_nav_tree(
        {"NEW_PAGE": ["READ"]},
        [ResourceStub("NEW_PAGE", "New Page", resource_type="PAGE", seq=30)],
    )

    assert nav == []


def test_permission_driven_navigation_keeps_hidden_api_and_button_resources_out() -> None:
    nav = build_nav_tree(
        {"VISIBLE_MENU": ["VIEW"], "HIDDEN_MENU": ["VIEW"], "DYNAMIC_API": ["VIEW"], "DYNAMIC_BUTTON": ["VIEW"]},
        [
            ResourceStub("VISIBLE_MENU", "Visible", resource_type="MENU", seq=10),
            ResourceStub("HIDDEN_MENU", "Hidden", resource_type="MENU", is_ui_visible=False, seq=20),
            ResourceStub("DYNAMIC_API", "API", resource_type="API", seq=30),
            ResourceStub("DYNAMIC_BUTTON", "Button", resource_type="BUTTON", seq=40),
        ],
    )

    assert [item["resource_key"] for item in nav] == ["VISIBLE_MENU"]


def test_permission_driven_navigation_preserves_existing_seeded_order() -> None:
    nav = build_nav_tree(
        {"USERS_MENU": ["VIEW"], "DASH_MENU": ["VIEW"], "REPORTS_MENU": ["VIEW"]},
        [
            ResourceStub("USERS_MENU", "Users", resource_type="MENU", seq=20),
            ResourceStub("DASH_MENU", "Dashboard", resource_type="MENU", seq=10),
            ResourceStub("REPORTS_MENU", "Reports", resource_type="MENU", seq=40),
        ],
    )

    assert [item["resource_key"] for item in nav] == ["DASH_MENU", "USERS_MENU", "REPORTS_MENU"]


def test_removing_parent_view_hides_parent_when_no_children_are_visible() -> None:
    nav = build_nav_tree(
        {"CHILD": []},
        [ResourceStub("ROOT", "Root", seq=20), ResourceStub("CHILD", "Child", parent="ROOT", seq=10)],
    )

    assert nav == []


def test_resource_create_preserves_selected_dynamic_menu_permissions() -> None:
    permissions = normalized_available_permission_keys(
        ["VIEW", "CREATE", "READ", "UPDATE", "DELETE"],
        resource_type="MENU",
        is_ui_visible=True,
    )

    assert permissions == ["VIEW", "CREATE", "READ", "UPDATE", "DELETE"]


def test_resource_create_accepts_permission_definition_payloads() -> None:
    permissions = normalized_available_permission_keys(
        [{"key": "VIEW", "label": "View"}, {"key": "UPDATE", "label": "Edit"}],
        resource_type="MENU",
        is_ui_visible=True,
    )

    assert permissions == ["VIEW", "UPDATE"]


def test_dynamic_menu_without_selected_permissions_falls_back_to_view() -> None:
    permissions = normalized_available_permission_keys([], resource_type="MENU", is_ui_visible=True)

    assert permissions == ["VIEW"]


def test_api_and_button_without_selected_permissions_stay_empty() -> None:
    assert normalized_available_permission_keys([], resource_type="API", is_ui_visible=False) == []
    assert normalized_available_permission_keys([], resource_type="BUTTON", is_ui_visible=True) == []


@pytest.mark.asyncio
async def test_tenant_access_matrix_includes_dynamic_registered_resource() -> None:
    service = PermissionService(PermissionSession())
    service.role_repo.get_scoped = AsyncMock(return_value=SimpleNamespace(id=1, role_code="ORG_ADMIN"))
    service.permission_repo.get_role_permission = AsyncMock(return_value=SimpleNamespace(permissions_json={}))

    matrix = await service.get_role_permissions(
        10,
        1,
        include_all_resources=True,
        include_all_permission_keys=True,
    )

    assert matrix["resources"][0]["resource_key"] == "NEW_PAGE"
    assert matrix["resources"][0]["available_permissions"] == [
        {"key": "VIEW", "label": "View", "granted": False}
    ]


@pytest.mark.asyncio
async def test_tenant_access_matrix_returns_selected_dynamic_permissions_ungranted() -> None:
    service = PermissionService(PermissionSession(["VIEW", "CREATE", "READ", "UPDATE", "DELETE"]))
    service.role_repo.get_scoped = AsyncMock(return_value=SimpleNamespace(id=1, role_code="ORG_ADMIN"))
    service.permission_repo.get_role_permission = AsyncMock(return_value=SimpleNamespace(permissions_json={}))

    matrix = await service.get_role_permissions(
        10,
        1,
        include_all_resources=True,
        include_all_permission_keys=True,
    )

    assert matrix["resources"][0]["available_permissions"] == [
        {"key": "VIEW", "label": "View", "granted": False},
        {"key": "CREATE", "label": "Create", "granted": False},
        {"key": "READ", "label": "Read", "granted": False},
        {"key": "UPDATE", "label": "Edit", "granted": False},
        {"key": "DELETE", "label": "Delete", "granted": False},
    ]


@pytest.mark.asyncio
async def test_tenant_access_matrix_marks_dynamic_resource_granted_after_assignment() -> None:
    service = PermissionService(PermissionSession(["VIEW", "CREATE", "READ", "UPDATE", "DELETE"]))
    service.role_repo.get_scoped = AsyncMock(return_value=SimpleNamespace(id=1, role_code="ORG_ADMIN"))
    service.permission_repo.get_role_permission = AsyncMock(
        return_value=SimpleNamespace(permissions_json={"NEW_PAGE": ["VIEW", "CREATE"]})
    )

    matrix = await service.get_role_permissions(
        10,
        1,
        include_all_resources=True,
        include_all_permission_keys=True,
    )

    granted = {
        permission["key"]: permission["granted"]
        for permission in matrix["resources"][0]["available_permissions"]
    }
    assert granted["VIEW"] is True
    assert granted["CREATE"] is True
    assert granted["READ"] is False


@pytest.mark.asyncio
async def test_tenant_access_matrix_falls_back_to_view_for_empty_dynamic_menu_permissions() -> None:
    service = PermissionService(PermissionSession([]))
    service.role_repo.get_scoped = AsyncMock(return_value=SimpleNamespace(id=1, role_code="ORG_ADMIN"))
    service.permission_repo.get_role_permission = AsyncMock(return_value=SimpleNamespace(permissions_json={}))

    matrix = await service.get_role_permissions(
        10,
        1,
        include_all_resources=True,
        include_all_permission_keys=True,
    )

    assert matrix["resources"][0]["available_permissions"] == [
        {"key": "VIEW", "label": "View", "granted": False}
    ]


@pytest.mark.asyncio
async def test_super_admin_permission_matrix_endpoint_uses_dynamic_available_permission_keys(monkeypatch) -> None:
    CapturingPermissionService.calls = []
    monkeypatch.setattr(permissions_endpoint, "PermissionService", CapturingPermissionService)

    request = SimpleNamespace(state=SimpleNamespace(request_id="test-request"))
    response = await permissions_endpoint.get_permissions(
        1,
        request,
        object(),
        {
            "org": 1,
            "sub": 1,
            "org_code": "PLATFORM",
            "roles": ["SUPER_ADMIN"],
            "perms": {},
        },
    )

    assert response["success"] is True
    assert CapturingPermissionService.calls[0]["include_all_resources"] is True
    assert CapturingPermissionService.calls[0]["include_all_permission_keys"] is True


@pytest.mark.asyncio
async def test_org_admin_permission_matrix_endpoint_keeps_permission_boundary(monkeypatch) -> None:
    CapturingPermissionService.calls = []
    monkeypatch.setattr(permissions_endpoint, "PermissionService", CapturingPermissionService)

    request = SimpleNamespace(state=SimpleNamespace(request_id="test-request"))
    await permissions_endpoint.get_permissions(
        1,
        request,
        object(),
        {
            "org": 10,
            "sub": 20,
            "org_code": "ACME_BANK",
            "roles": ["ORG_ADMIN"],
            "perms": {"USER_MENU": ["VIEW"]},
        },
    )

    assert CapturingPermissionService.calls[0]["include_all_resources"] is False
    assert CapturingPermissionService.calls[0]["include_all_permission_keys"] is False


def test_super_admin_reserved_for_platform() -> None:
    assert is_platform_super_admin("PLATFORM", ["SUPER_ADMIN"])
    assert not is_platform_super_admin("ACME_BANK", ["SUPER_ADMIN"])
