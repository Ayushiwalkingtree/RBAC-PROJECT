from dataclasses import dataclass
from typing import Optional
from fastapi import Header, HTTPException
from jose import JWTError, jwt
from app.core.config import settings

@dataclass
class OrganizationContext:
    org_id: int
    user_id: int

def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM], options={"verify_sub": False})
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

async def get_org_context(
    x_org_id: Optional[str] = Header(None, alias="X-Org-Id"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    authorization: Optional[str] = Header(None),
) -> OrganizationContext:
    if x_org_id and x_user_id:
        try:
            return OrganizationContext(org_id=int(x_org_id), user_id=int(x_user_id))
        except ValueError:
            raise HTTPException(status_code=401, detail="Invalid X-Org-Id or X-User-Id")
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        payload = _decode_token(token)
        org_id = payload.get("org")
        user_id = payload.get("sub")
        if org_id is None or user_id is None:
            raise HTTPException(status_code=401, detail="JWT missing org or sub claims")
        return OrganizationContext(org_id=int(org_id), user_id=int(user_id))
    raise HTTPException(status_code=401, detail="Authentication required")
