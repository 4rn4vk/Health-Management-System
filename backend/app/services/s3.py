from __future__ import annotations

import mimetypes
from functools import lru_cache
from typing import BinaryIO

import boto3
from botocore.exceptions import ClientError

from app.core.config import get_settings

settings = get_settings()

_ALLOWED_MIME_TYPES = {"text/csv", "application/csv", "application/octet-stream"}
_ALLOWED_EXTENSIONS = {".csv"}


@lru_cache
def _get_s3_client():
    kwargs: dict = {
        "region_name": settings.aws_default_region,
        "aws_access_key_id": settings.aws_access_key_id,
        "aws_secret_access_key": settings.aws_secret_access_key,
    }
    if settings.localstack_endpoint_url:
        kwargs["endpoint_url"] = settings.localstack_endpoint_url
    return boto3.client("s3", **kwargs)


def ensure_bucket_exists() -> None:
    """Creates the S3 bucket if it doesn't exist (idempotent, for LocalStack)."""
    client = _get_s3_client()
    try:
        client.head_bucket(Bucket=settings.s3_bucket_name)
    except ClientError:
        client.create_bucket(Bucket=settings.s3_bucket_name)


def upload_fileobj(file_obj: BinaryIO, s3_key: str, content_type: str = "application/octet-stream") -> str:
    """Uploads a file-like object to S3. Returns the s3_key."""
    _get_s3_client().upload_fileobj(
        file_obj,
        settings.s3_bucket_name,
        s3_key,
        ExtraArgs={"ContentType": content_type},
    )
    return s3_key


def generate_presigned_url(s3_key: str, expires_in: int = 3600) -> str:
    return _get_s3_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_name, "Key": s3_key},
        ExpiresIn=expires_in,
    )


def list_objects(prefix: str) -> list[str]:
    """Returns a list of S3 keys under a prefix."""
    response = _get_s3_client().list_objects_v2(Bucket=settings.s3_bucket_name, Prefix=prefix)
    return [obj["Key"] for obj in response.get("Contents", [])]
