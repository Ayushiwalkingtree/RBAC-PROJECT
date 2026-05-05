from typing import Any

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

from app.utils.datetime import utcnow


class AppError(HTTPException):
    def __init__(self, status_code: int, code: str, message: str, details: list[Any] | None = None):
        super().__init__(status_code=status_code, detail=message)
        self.code = code
        self.message = message
        self.details = details or []


def error_response(request: Request, code: str, message: str, status_code: int, details: list[Any] | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "data": None,
            "error": {"code": code, "message": message, "details": details or []},
            "meta": {
                "request_id": getattr(request.state, "request_id", ""),
                "timestamp": utcnow().isoformat(),
            },
        },
    )
