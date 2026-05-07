from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    environment: Literal["development", "production", "test"] = "development"
    api_v1_prefix: str = "/api/v1"

    # Database
    database_url: str = Field(..., description="Async SQLAlchemy database URL")

    @field_validator("database_url", mode="before")
    @classmethod
    def _fix_database_url(cls, v: str) -> str:
        # Fly.io injects postgres:// — rewrite to postgresql+asyncpg://
        if isinstance(v, str) and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        return v

    # Security
    secret_key: str = Field(..., description="JWT signing secret")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # AWS / LocalStack
    aws_default_region: str = "us-east-1"
    aws_access_key_id: str = "test"
    aws_secret_access_key: str = "test"
    localstack_endpoint_url: str | None = None
    s3_bucket_name: str = "hcms-documents"
    use_secrets_manager: bool = False
    db_secret_name: str = "hcms/db/credentials"

    # Rate limiting
    rate_limit_default: str = "100/minute"
    rate_limit_auth: str = "5/minute"

    # File uploads
    max_upload_bytes: int = 10 * 1024 * 1024  # 10 MB
    enable_uploads: bool = True

    # CORS (comma-separated origins for production, e.g. https://app.vercel.app)
    cors_origins: list[str] = []

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
