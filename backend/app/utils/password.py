import base64
import hashlib
import hmac
import re
import secrets

try:
    import bcrypt
except ImportError:
    bcrypt = None

from app.core.config import settings
from app.core.errors import AppError

PBKDF2_PREFIX = "pbkdf2_sha256"
PBKDF2_ITERATIONS = 390000
PBKDF2_PURE_PY_ITERATIONS = 120000


def _pbkdf2_sha256(password: bytes, salt: bytes, iterations: int) -> bytes:
    if hasattr(hashlib, "pbkdf2_hmac"):
        return hashlib.pbkdf2_hmac("sha256", password, salt, iterations)

    block = hmac.new(password, salt + (1).to_bytes(4, "big"), hashlib.sha256).digest()
    digest = bytearray(block)
    current = block
    for _ in range(iterations - 1):
        current = hmac.new(password, current, hashlib.sha256).digest()
        digest = bytearray(left ^ right for left, right in zip(digest, current, strict=True))
    return bytes(digest)


def validate_password_policy(password: str) -> None:
    if (
        len(password) < 8
        or not re.search(r"[A-Z]", password)
        or not re.search(r"\d", password)
        or not re.search(r"[^A-Za-z0-9]", password)
    ):
        raise AppError(422, "WEAK_PASSWORD", "Password must contain 8+ chars, uppercase, number, and special character")


def hash_password(password: str) -> str:
    validate_password_policy(password)
    if bcrypt is not None:
        salt = bcrypt.gensalt(rounds=settings.bcrypt_rounds)
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    salt = secrets.token_bytes(16)
    iterations = PBKDF2_ITERATIONS if hasattr(hashlib, "pbkdf2_hmac") else PBKDF2_PURE_PY_ITERATIONS
    digest = _pbkdf2_sha256(password.encode("utf-8"), salt, iterations)
    encoded_salt = base64.urlsafe_b64encode(salt).decode("ascii")
    encoded_digest = base64.urlsafe_b64encode(digest).decode("ascii")
    return f"{PBKDF2_PREFIX}${iterations}${encoded_salt}${encoded_digest}"


def verify_password(password: str, password_hash: str) -> bool:
    if password_hash.startswith(f"{PBKDF2_PREFIX}$"):
        try:
            _, iterations, encoded_salt, encoded_digest = password_hash.split("$", 3)
            salt = base64.urlsafe_b64decode(encoded_salt.encode("ascii"))
            expected = base64.urlsafe_b64decode(encoded_digest.encode("ascii"))
            actual = _pbkdf2_sha256(password.encode("utf-8"), salt, int(iterations))
        except (ValueError, TypeError):
            return False
        return hmac.compare_digest(actual, expected)

    if bcrypt is None:
        return False
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
