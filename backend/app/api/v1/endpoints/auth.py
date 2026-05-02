from fastapi import APIRouter, Request

from app.dependencies.auth import CurrentClaims
from app.dependencies.db import DbSession
from app.schemas.auth import LoginRequest, LogoutRequest, RefreshRequest
from app.services.auth_service import AuthService
from app.utils.response import api_response

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(payload: LoginRequest, request: Request, session: DbSession):
    result = await AuthService(session).login(payload, request.headers.get("user-agent"))
    return api_response(request, result.model_dump())


@router.post("/refresh")
async def refresh(payload: RefreshRequest, request: Request, session: DbSession):
    result = await AuthService(session).refresh(payload.refresh_token)
    return api_response(request, result.model_dump())


@router.post("/logout")
async def logout(payload: LogoutRequest, request: Request, session: DbSession, claims: CurrentClaims):
    await AuthService(session).logout(payload.refresh_token, int(claims["sub"]))
    return api_response(request, {"logged_out": True})


@router.get("/me")
async def me(request: Request, claims: CurrentClaims):
    return api_response(request, claims)
