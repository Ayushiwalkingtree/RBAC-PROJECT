import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.errors import AppError, error_response
from app.core.logging import configure_logging

configure_logging()

app = FastAPI(title="Core RBAC API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request.state.request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    response = await call_next(request)
    response.headers["x-request-id"] = request.state.request_id
    return response


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return error_response(request, exc.code, exc.message, exc.status_code, exc.details)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return error_response(request, "VALIDATION_ERROR", "Request validation failed", 422, exc.errors())


@app.get("/health")
async def health():
    return {"success": True, "data": {"status": "ok"}, "error": None, "meta": {"request_id": "", "timestamp": ""}}


app.include_router(api_router)
