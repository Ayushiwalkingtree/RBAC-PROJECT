"""Unit tests for JWT extraction and OrganizationContext dependency."""
import pytest
from unittest.mock import patch
from fastapi import HTTPException
from jose import jwt
from app.core.config import settings
from app.core.security import get_org_context, OrganizationContext, _decode_token


def _make_jwt(org_id=1, user_id=42, extra=None):
    payload = {"org": org_id, "sub": user_id}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


class TestDecodeToken:
    def test_valid_token_returns_claims(self):
        token = _make_jwt(org_id=7, user_id=99)
        payload = _decode_token(token)
        assert payload["org"] == 7
        assert payload["sub"] == 99

    def test_invalid_token_raises_401(self):
        with pytest.raises(HTTPException) as exc:
            _decode_token("not.a.valid.token")
        assert exc.value.status_code == 401

    def test_wrong_secret_raises_401(self):
        bad_token = jwt.encode({"org": 1, "sub": 1}, "wrong-secret", algorithm="HS256")
        with pytest.raises(HTTPException) as exc:
            _decode_token(bad_token)
        assert exc.value.status_code == 401


class TestGetOrgContext:
    """Tests for the OrganizationContext FastAPI dependency."""

    @pytest.mark.asyncio
    async def test_kong_headers_take_priority(self):
        ctx = await get_org_context(x_org_id="5", x_user_id="10", authorization=None)
        assert ctx.org_id == 5
        assert ctx.user_id == 10

    @pytest.mark.asyncio
    async def test_bearer_token_fallback(self):
        token = _make_jwt(org_id=3, user_id=77)
        ctx = await get_org_context(x_org_id=None, x_user_id=None,
                                    authorization=f"Bearer {token}")
        assert ctx.org_id == 3
        assert ctx.user_id == 77

    @pytest.mark.asyncio
    async def test_no_auth_raises_401(self):
        with pytest.raises(HTTPException) as exc:
            await get_org_context(x_org_id=None, x_user_id=None, authorization=None)
        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_bearer_raises_401(self):
        with pytest.raises(HTTPException) as exc:
            await get_org_context(x_org_id=None, x_user_id=None,
                                  authorization="Bearer bad.token.here")
        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    async def test_jwt_missing_org_claim_raises_401(self):
        # Token without 'org' claim
        token = jwt.encode({"sub": 1}, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        with pytest.raises(HTTPException) as exc:
            await get_org_context(x_org_id=None, x_user_id=None,
                                  authorization=f"Bearer {token}")
        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    async def test_jwt_missing_sub_claim_raises_401(self):
        token = jwt.encode({"org": 1}, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        with pytest.raises(HTTPException) as exc:
            await get_org_context(x_org_id=None, x_user_id=None,
                                  authorization=f"Bearer {token}")
        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_header_values_raise_401(self):
        with pytest.raises(HTTPException) as exc:
            await get_org_context(x_org_id="not_a_number", x_user_id="42",
                                  authorization=None)
        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    async def test_org_context_dataclass_fields(self):
        ctx = await get_org_context(x_org_id="100", x_user_id="200", authorization=None)
        assert isinstance(ctx, OrganizationContext)
        assert ctx.org_id == 100
        assert ctx.user_id == 200

    @pytest.mark.asyncio
    async def test_different_orgs_isolated(self):
        """Two tokens with different orgs → different contexts — no cross-tenant bleed."""
        token_a = _make_jwt(org_id=10, user_id=1)
        token_b = _make_jwt(org_id=20, user_id=2)
        ctx_a = await get_org_context(None, None, f"Bearer {token_a}")
        ctx_b = await get_org_context(None, None, f"Bearer {token_b}")
        assert ctx_a.org_id != ctx_b.org_id
        assert ctx_a.org_id == 10
        assert ctx_b.org_id == 20
