import re

import bcrypt

from app.core.config import settings
from app.core.errors import AppError


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
    salt = bcrypt.gensalt(rounds=settings.bcrypt_rounds)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
