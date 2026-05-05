import os
from functools import lru_cache

from pydantic import BaseModel, Field


class Settings(BaseModel):
    database_url: str = Field(default="postgresql+asyncpg://postgres:postgres@localhost:5432/rbac_core")
    jwt_secret_key: str = Field(default="dev-secret-change-me")
    jwt_algorithm: str = Field(default="HS256")
    core_service_url: str = Field(default="http://127.0.0.1:8000")
    service_api_key: str = Field(default="dev-service-key")


@lru_cache
def get_settings() -> Settings:
    return Settings(
        database_url=os.getenv("DATABASE_URL", Settings.model_fields["database_url"].default),
        jwt_secret_key=os.getenv("JWT_SECRET_KEY", Settings.model_fields["jwt_secret_key"].default),
        jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256").upper(),
        core_service_url=os.getenv("CORE_SERVICE_URL", Settings.model_fields["core_service_url"].default).rstrip("/"),
        service_api_key=os.getenv("SERVICE_API_KEY", Settings.model_fields["service_api_key"].default),
    )


settings = get_settings()
