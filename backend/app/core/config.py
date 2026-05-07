from __future__ import annotations

from functools import lru_cache
from typing import Literal
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

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
        if isinstance(v, str):
            # Fly.io injects postgres:// — rewrite to postgresql+asyncpg://
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql+asyncpg://", 1)
            # SQLAlchemy asyncpg dialect cannot pass sslmode= as a connect kwarg.
            # Replace sslmode=<value> with ssl=<value> — asyncpg parses the
            # `ssl` query param as an sslmode string (disable/allow/prefer/...).
            if "sslmode" in v:
                parsed = urlparse(v)
                params = parse_qs(parsed.query, keep_blank_values=True)
                sslmode_values = params.pop("sslmode", ["disable"])
                params["ssl"] = [sslmode_values[0]]
                v = urlunparse(parsed._replace(query=urlencode(params, doseq=True)))
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
    # Stored as str to avoid pydantic_settings JSON-decoding list fields from env vars.
    cors_origins: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
