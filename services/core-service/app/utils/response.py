from typing import Any

from fastapi import Request

from app.utils.datetime import utcnow


def api_response(request: Request, data: Any = None, status: bool = True) -> dict[str, Any]:
    return {
        "success": status,
        "data": data,
        "error": None,
        "meta": {
            "request_id": getattr(request.state, "request_id", ""),
            "timestamp": utcnow().isoformat(),
        },
    }
