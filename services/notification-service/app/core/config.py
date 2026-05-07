from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore")
    PROJECT_NAME: str = "Notification Service"
    ENV: str = "development"
    DEBUG: bool = True
    AUTO_CREATE_TABLES: bool = True
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "notification_db"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    NT_TABLE_PREFIX: str = "nt_"
    REDIS_URL: str = "redis://localhost:6379/1"
    JWT_SECRET_KEY: str = "dev-secret-key-change-in-production-minimum-32-chars!!"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    ENCRYPTION_KEY: str = "dev-enc-key-32bytes-change-prod!!"
    EMAIL_QUEUE_STREAM: str = "nt:email:queue"
    EMAIL_DLQ_STREAM: str = "nt:email:dlq"
    EMAIL_WORKER_COUNT: int = 2
    EMAIL_MAX_RETRY: int = 3
    EMAIL_RETRY_BACKOFF_BASE_S: int = 60
    TEMPLATE_STORAGE_DEFAULT: str = "DB"
    S3_BUCKET: str = ""
    S3_ENDPOINT_URL: str = ""
    ATTACHMENT_MAX_FILE_MB: int = 25
    ATTACHMENT_MAX_TOTAL_MB: int = 50
    MAX_RECIPIENTS_PER_SEND: int = 50
    CLAMAV_ENABLED: bool = False
    CORS_ORIGINS: List[str] = ["*"]
    SERVICE_API_KEY: str = "dev-service-key"
    PLATFORM_ORG_ID: int = 1

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def DATABASE_URL_SYNC(self) -> str:
        return f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

settings = Settings()
