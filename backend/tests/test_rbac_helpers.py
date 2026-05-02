from app.core.rbac import build_nav_tree, has_permission, is_platform_super_admin, merge_permissions


class ResourceStub:
    def __init__(self, key: str, label: str, parent: str | None = None, seq: int = 10):
        self.id = seq
        self.resource_key = key
        self.resource_name = label
        self.resource_type = "MENU"
        self.is_deleted = False
        self.is_active = True
        self.is_ui_visible = True
        self.ui_path = f"/{key.lower()}"
        self.parent_resource_key = parent
        self.sequence_no = seq


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


def test_super_admin_reserved_for_platform() -> None:
    assert is_platform_super_admin("PLATFORM", ["SUPER_ADMIN"])
    assert not is_platform_super_admin("ACME_BANK", ["SUPER_ADMIN"])
