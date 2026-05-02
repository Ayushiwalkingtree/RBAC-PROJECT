from collections import defaultdict

from app.core.errors import AppError

NAV_TYPES = {"MENU", "DASHBOARD", "REPORT"}


def merge_permissions(role_permission_records: list[dict[str, list[str]]]) -> dict[str, list[str]]:
    merged: dict[str, set[str]] = defaultdict(set)
    for permissions_json in role_permission_records:
        for resource_key, permissions in permissions_json.items():
            merged[resource_key].update(permission.upper() for permission in permissions)
    return {resource_key: sorted(values) for resource_key, values in merged.items()}


def build_nav_tree(merged_perms: dict[str, list[str]], resources: list[object]) -> list[dict]:
    visible = []
    by_key = {getattr(resource, "resource_key"): resource for resource in resources}
    for resource in resources:
        if (
            not getattr(resource, "is_deleted", False)
            and getattr(resource, "is_active", True)
            and getattr(resource, "is_ui_visible", False)
            and getattr(resource, "resource_type") in NAV_TYPES
            and "VIEW" in merged_perms.get(getattr(resource, "resource_key"), [])
        ):
            visible.append(
                {
                    "id": getattr(resource, "id"),
                    "resource_key": getattr(resource, "resource_key"),
                    "label": getattr(resource, "resource_name"),
                    "path": getattr(resource, "ui_path", None) or "/dashboard",
                    "parent_resource_key": getattr(resource, "parent_resource_key", None),
                    "sequence_no": getattr(resource, "sequence_no", None) or 9999,
                    "children": [],
                }
            )

    items = {item["resource_key"]: item for item in visible}
    roots = []
    for item in visible:
        parent_key = item["parent_resource_key"]
        if parent_key and parent_key in items and parent_key in by_key:
            items[parent_key]["children"].append(item)
        else:
            roots.append(item)

    def sort_tree(nodes: list[dict]) -> list[dict]:
        return sorted(({**node, "children": sort_tree(node["children"])} for node in nodes), key=lambda n: n["sequence_no"])

    return sort_tree(roots)


def has_permission(perms: dict[str, list[str]], resource_key: str, permission_key: str) -> bool:
    permission = permission_key.upper()
    values = set(perms.get(resource_key, []))
    return permission in values or (permission == "VIEW" and "READ" in values) or (permission == "READ" and "VIEW" in values)


def ensure_permission(perms: dict[str, list[str]], resource_key: str, permission_key: str) -> None:
    if not has_permission(perms, resource_key, permission_key):
        raise AppError(403, "FORBIDDEN", f"Missing {resource_key} {permission_key}")


def is_platform_super_admin(org_code: str, roles: list[str]) -> bool:
    return org_code == "PLATFORM" and "SUPER_ADMIN" in {role.upper() for role in roles}
