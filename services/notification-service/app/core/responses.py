from typing import Any, Optional

def ok(data: Any, meta: dict = {}): return {"success": True, "data": data, "error": None, "meta": meta}
def err(code: str, message: str, details: list = []): return {"success": False, "data": None, "error": {"code": code, "message": message, "details": details}}
def paginated(data: list, total: int, page: int, per_page: int):
    return ok(data, {"total": total, "page": page, "per_page": per_page, "total_pages": (total + per_page - 1) // per_page})
