"""Unit tests for JWT security helpers."""
from __future__ import annotations

import pytest
from jose import JWTError

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_round_trip():
    hashed = hash_password("mysecret")
    assert verify_password("mysecret", hashed)
    assert not verify_password("wrong", hashed)


def test_access_token_payload():
    token = create_access_token(user_id=42, role="admin")
    payload = decode_token(token)
    assert payload["sub"] == "42"
    assert payload["role"] == "admin"
    assert payload["type"] == "access"


def test_refresh_token_payload():
    token = create_refresh_token(user_id=7)
    payload = decode_token(token)
    assert payload["sub"] == "7"
    assert payload["type"] == "refresh"


def test_tampered_token_raises():
    token = create_access_token(user_id=1, role="viewer")
    with pytest.raises(JWTError):
        decode_token(token + "tampered")
