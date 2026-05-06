"""Unit tests for the S3 service layer (boto3 calls fully mocked)."""
from __future__ import annotations

import io
from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import ClientError

from app.services import s3


@pytest.fixture()
def mock_boto_client():
    """Replace _get_s3_client so no real AWS calls are made in any test."""
    mock = MagicMock()
    with patch("app.services.s3._get_s3_client", return_value=mock):
        yield mock


def test_ensure_bucket_exists_when_bucket_present(mock_boto_client):
    """head_bucket succeeds → create_bucket is never called."""
    s3.ensure_bucket_exists()
    mock_boto_client.head_bucket.assert_called_once()
    mock_boto_client.create_bucket.assert_not_called()


def test_ensure_bucket_exists_creates_when_missing(mock_boto_client):
    """head_bucket raises ClientError → create_bucket is called once."""
    mock_boto_client.head_bucket.side_effect = ClientError(
        {"Error": {"Code": "404", "Message": "Not Found"}}, "HeadBucket"
    )
    s3.ensure_bucket_exists()
    mock_boto_client.create_bucket.assert_called_once()


def test_upload_fileobj_returns_s3_key(mock_boto_client):
    key = s3.upload_fileobj(io.BytesIO(b"col1,col2\nval1,val2\n"), "uploads/test.csv", "text/csv")
    assert key == "uploads/test.csv"
    mock_boto_client.upload_fileobj.assert_called_once()


def test_generate_presigned_url_returns_url(mock_boto_client):
    mock_boto_client.generate_presigned_url.return_value = "https://s3.example.com/signed?x=1"
    url = s3.generate_presigned_url("uploads/doc.pdf", expires_in=600)
    assert "signed" in url
    mock_boto_client.generate_presigned_url.assert_called_once()


def test_list_objects_returns_keys(mock_boto_client):
    mock_boto_client.list_objects_v2.return_value = {
        "Contents": [{"Key": "uploads/a.csv"}, {"Key": "uploads/b.csv"}]
    }
    keys = s3.list_objects("uploads/")
    assert keys == ["uploads/a.csv", "uploads/b.csv"]


def test_list_objects_empty_prefix_returns_empty_list(mock_boto_client):
    mock_boto_client.list_objects_v2.return_value = {}
    assert s3.list_objects("empty/") == []
