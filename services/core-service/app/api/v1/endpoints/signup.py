from fastapi import APIRouter, Request

from app.dependencies.db import DbSession
from app.schemas.signup import SignupRequest, VerifyEmailRequest
from app.services.signup_service import SignupService
from app.utils.response import api_response

router = APIRouter(tags=["signup"])


@router.post("/signup")
async def signup(payload: SignupRequest, request: Request, session: DbSession):
    result = await SignupService(session).signup(payload)
    return api_response(request, result.model_dump())


@router.post("/verify-email")
async def verify_email(payload: VerifyEmailRequest, request: Request, session: DbSession):
    message = await SignupService(session).verify_email(payload.token)
    return api_response(request, {"verified": True, "message": message})
