import hashlib
import uuid
from typing import Any

import jwt

from app.core.config import settings
from app.utils.datetime import days_from_now, minutes_from_now, utcnow


def create_access_token(payload: dict[str, Any]) -> tuple[str, str]:
    expires_at = minutes_from_now(settings.jwt_access_ttl_min)
    token = jwt.encode(
        {**payload, "typ": "access", "exp": expires_at, "iat": utcnow()},
        settings.jwt_secret_key,
        algorithm="HS256",
    )
    return token, expires_at.isoformat()


def create_refresh_token() -> tuple[str, str]:
    raw = str(uuid.uuid4())
    return raw, days_from_now(settings.jwt_refresh_ttl_days).isoformat()


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_verification_token() -> str:
    return str(uuid.uuid4())
