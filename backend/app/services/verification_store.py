_verification_tokens: dict[str, tuple[int, int]] = {}


def store_verification_token(token: str, org_id: int, user_id: int) -> None:
    _verification_tokens[token] = (org_id, user_id)


def get_verification_token(token: str) -> tuple[int, int] | None:
    return _verification_tokens.get(token)


def pop_verification_token(token: str) -> tuple[int, int] | None:
    return _verification_tokens.pop(token, None)
