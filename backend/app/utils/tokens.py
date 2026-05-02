import base64
import hashlib
import hmac
import json
import uuid
from datetime import datetime
from typing import Any

from app.core.config import settings
from app.utils.datetime import days_from_now, minutes_from_now, utcnow


def _jwt_ready():
    try:
        import jwt
    except ImportError:
        return None
    return jwt


def _json_ready_payload(payload: dict[str, Any]) -> dict[str, Any]:
    ready = dict(payload)
    for key, value in list(ready.items()):
        if isinstance(value, datetime):
            ready[key] = int(value.timestamp())
    return ready


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode((raw + padding).encode("ascii"))


def _encode_hs256(payload: dict[str, Any]) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_part = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_part = _b64url_encode(json.dumps(_json_ready_payload(payload), separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_part}.{payload_part}".encode("ascii")
    signature = hmac.new(settings.jwt_secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_part}.{payload_part}.{_b64url_encode(signature)}"


def _decode_hs256(token: str) -> dict[str, Any]:
    header_part, payload_part, signature_part = token.split(".", 2)
    signing_input = f"{header_part}.{payload_part}".encode("ascii")
    expected = hmac.new(settings.jwt_secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
    if not hmac.compare_digest(_b64url_decode(signature_part), expected):
        raise ValueError("Invalid token signature")
    payload = json.loads(_b64url_decode(payload_part).decode("utf-8"))
    exp = payload.get("exp")
    if exp is not None and int(exp) < int(utcnow().timestamp()):
        raise ValueError("Token expired")
    return payload


def create_access_token(payload: dict[str, Any]) -> tuple[str, str]:
    expires_at = minutes_from_now(settings.jwt_access_ttl_min)
    claims = {**payload, "typ": "access", "exp": expires_at, "iat": utcnow()}
    jwt = _jwt_ready()
    if jwt is not None:
        token = jwt.encode(claims, settings.jwt_secret_key, algorithm="HS256")
    else:
        token = _encode_hs256(claims)
    return token, expires_at.isoformat()


def create_refresh_token() -> tuple[str, str]:
    raw = str(uuid.uuid4())
    return raw, days_from_now(settings.jwt_refresh_ttl_days).isoformat()


def decode_token(token: str) -> dict[str, Any]:
    jwt = _jwt_ready()
    if jwt is not None:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])
    return _decode_hs256(token)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_verification_token() -> str:
    return str(uuid.uuid4())
