import base64

from fastapi import APIRouter, Request
from sqlalchemy import text

from app.core.config import settings
from app.core.errors import AppError
from app.dependencies.db import DbSession
from app.utils.response import api_response

router = APIRouter(tags=["health"])


def _base64url_uint(value: int) -> str:
    raw = value.to_bytes((value.bit_length() + 7) // 8, "big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _jwks() -> dict:
    if not settings.jwks_enabled:
        raise AppError(404, "JWKS_DISABLED", "JWKS endpoint is not enabled")
    if settings.jwt_algorithm.upper() != "RS256":
        return {"keys": []}
    if not settings.jwt_public_key_path:
        raise AppError(503, "JWT_PUBLIC_KEY_MISSING", "JWT public key path is not configured")
    try:
        from cryptography.hazmat.primitives import serialization
    except ImportError as exc:
        raise AppError(503, "CRYPTOGRAPHY_UNAVAILABLE", "JWKS generation requires cryptography") from exc
    with open(settings.jwt_public_key_path, "rb") as public_key_file:
        public_key = serialization.load_pem_public_key(public_key_file.read())
    numbers = public_key.public_numbers()
    return {
        "keys": [
            {
                "kty": "RSA",
                "use": "sig",
                "kid": "default",
                "alg": "RS256",
                "n": _base64url_uint(numbers.n),
                "e": _base64url_uint(numbers.e),
            }
        ]
    }


@router.get("/health")
async def health(request: Request, session: DbSession):
    await session.execute(text("select 1"))
    return api_response(request, {"status": "ok", "database": "ok"})


@router.get("/healthz")
async def healthz(request: Request, session: DbSession):
    await session.execute(text("select 1"))
    return api_response(request, {"status": "ok", "database": "ok"})


@router.get("/.well-known/jwks.json")
async def jwks():
    return _jwks()
