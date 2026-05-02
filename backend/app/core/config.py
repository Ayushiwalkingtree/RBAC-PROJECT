from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).resolve().parents[2] / ".env")


class Settings(BaseModel):
    database_url: str = Field(default="postgresql+asyncpg://postgres:postgres@localhost:5432/rbac_core")
    jwt_secret_key: str = Field(default="dev-secret-change-me")
    jwt_access_ttl_min: int = Field(default=15)
    jwt_refresh_ttl_days: int = Field(default=7)
    bcrypt_rounds: int = Field(default=12)
    platform_org_id: int = Field(default=1)
    env: str = Field(default="development")
    backend_cors_origins: str = Field(default="http://localhost:5173,http://127.0.0.1:5173")
    service_api_key: str = Field(default="dev-service-key")
    redis_url: str | None = None

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    import os

    return Settings(
        database_url=os.getenv("DATABASE_URL", Settings.model_fields["database_url"].default),
        jwt_secret_key=os.getenv("JWT_SECRET_KEY", Settings.model_fields["jwt_secret_key"].default),
        jwt_access_ttl_min=int(os.getenv("JWT_ACCESS_TTL_MIN", "15")),
        jwt_refresh_ttl_days=int(os.getenv("JWT_REFRESH_TTL_DAYS", "7")),
        bcrypt_rounds=int(os.getenv("BCRYPT_ROUNDS", "12")),
        platform_org_id=int(os.getenv("PLATFORM_ORG_ID", "1")),
        env=os.getenv("ENV", "development"),
        backend_cors_origins=os.getenv(
            "BACKEND_CORS_ORIGINS",
            Settings.model_fields["backend_cors_origins"].default,
        ),
        service_api_key=os.getenv("SERVICE_API_KEY", "dev-service-key"),
        redis_url=os.getenv("REDIS_URL") or None,
    )


settings = get_settings()
