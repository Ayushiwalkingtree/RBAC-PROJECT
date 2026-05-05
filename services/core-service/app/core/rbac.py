from collections import defaultdict

from app.core.errors import AppError

NAV_TYPES = {"MENU", "PAGE", "DASHBOARD", "REPORT"}


def merge_permissions(role_permission_records: list[dict[str, list[str]]]) -> dict[str, list[str]]:
    merged: dict[str, set[str]] = defaultdict(set)
    for permissions_json in role_permission_records:
        for resource_key, permissions in permissions_json.items():
            merged[resource_key.upper()].update(permission.upper() for permission in permissions)
    return {resource_key: sorted(values) for resource_key, values in merged.items()}


def has_view_grant(perms: dict[str, list[str]], resource_key: str) -> bool:
    return "VIEW" in {permission.upper() for permission in perms.get(resource_key.upper(), [])}


def build_nav_tree(
    merged_perms: dict[str, list[str]],
    resources: list[object],
    nav_overrides: dict[str, dict] | None = None,
) -> list[dict]:
    nav_overrides = nav_overrides or {}
    by_key = {getattr(resource, "resource_key"): resource for resource in resources}
    nav_candidates = {
        getattr(resource, "resource_key"): resource
        for resource in resources
        if (
            not getattr(resource, "is_deleted", False)
            and getattr(resource, "is_active", True)
            and getattr(resource, "is_ui_visible", False)
            and getattr(resource, "resource_type") in NAV_TYPES
        )
    }
    visible_keys: set[str] = set()

    def effective_parent_key(resource_key: str) -> str | None:
        resource = nav_candidates.get(resource_key)
        if not resource:
            return None
        return nav_overrides.get(resource_key, {}).get("parent_resource_key", getattr(resource, "parent_resource_key", None))

    for resource in resources:
        resource_key = getattr(resource, "resource_key")
        if resource_key not in nav_candidates:
            continue
        if not has_view_grant(merged_perms, resource_key):
            continue
        visible_keys.add(resource_key)
        parent_key = effective_parent_key(resource_key)
        seen_parents: set[str] = set()
        while parent_key and parent_key in nav_candidates and parent_key not in seen_parents:
            seen_parents.add(parent_key)
            visible_keys.add(parent_key)
            parent_key = effective_parent_key(parent_key)

    visible = [
        {
            "id": getattr(resource, "id"),
            "resource_key": getattr(resource, "resource_key"),
            "label": getattr(resource, "resource_name"),
            "path": getattr(resource, "ui_path", None) or "/dashboard",
            "parent_resource_key": effective_parent_key(resource_key),
            "sequence_no": nav_overrides.get(resource_key, {}).get("sequence_no", getattr(resource, "sequence_no", None) or 9999),
            "type": getattr(resource, "resource_type", "MENU"),
            "icon": getattr(resource, "icon", None),
            "children": [],
        }
        for resource_key, resource in nav_candidates.items()
        if resource_key in visible_keys
    ]

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
    values = set(perms.get(resource_key.upper(), []))
    return permission in values or (permission == "VIEW" and "READ" in values) or (permission == "READ" and "VIEW" in values)


def ensure_permission(perms: dict[str, list[str]], resource_key: str, permission_key: str) -> None:
    if not has_permission(perms, resource_key, permission_key):
        raise AppError(403, "FORBIDDEN", f"Missing {resource_key} {permission_key}")


def is_platform_super_admin(org_code: str, roles: list[str]) -> bool:
    return org_code == "PLATFORM" and "SUPER_ADMIN" in {role.upper() for role in roles}
