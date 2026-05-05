from typing import Any


PERMISSION_LABELS = {
    "VIEW": "View",
    "READ": "Read",
    "CREATE": "Create",
    "UPDATE": "Edit",
    "DELETE": "Delete",
    "EXECUTE": "Execute",
    "EXPORT": "Export",
    "DOWNLOAD": "Download",
    "APPROVE": "Approve",
    "REJECT": "Reject",
    "CONFIGURE": "Configure",
    "ASSIGN": "Assign",
}


def permission_label(key: str, fallback: Any = None) -> str:
    if isinstance(fallback, str) and fallback.strip():
        return fallback.strip()
    return PERMISSION_LABELS.get(key, key.replace("_", " ").title())


def normalize_available_permissions(value: Any) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    seen: set[str] = set()

    def add_permission(raw_key: Any, raw_label: Any = None) -> None:
        if not raw_key:
            return
        key = str(raw_key).strip().upper()
        if not key or key in seen:
            return
        seen.add(key)
        normalized.append({"key": key, "label": permission_label(key, raw_label)})

    if isinstance(value, dict):
        for key, label in value.items():
            add_permission(key, label)
        return normalized

    if not isinstance(value, list):
        return normalized

    for item in value:
        if isinstance(item, dict):
            add_permission(item.get("key"), item.get("label"))
        else:
            add_permission(item)

    return normalized


def normalize_role_permissions(value: Any) -> dict[str, list[str]]:
    if not isinstance(value, dict):
        return {}

    normalized: dict[str, list[str]] = {}
    for resource_key, permissions in value.items():
        if not resource_key or not isinstance(permissions, list):
            continue
        keys: list[str] = []
        seen: set[str] = set()
        for permission in permissions:
            key = permission.get("key") if isinstance(permission, dict) else permission
            if not key:
                continue
            normalized_key = str(key).strip().upper()
            if normalized_key and normalized_key not in seen:
                seen.add(normalized_key)
                keys.append(normalized_key)
        if keys:
            normalized[str(resource_key).strip().upper()] = keys

    return normalized
