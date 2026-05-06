"""Integration tests: auth flow against a real DB session."""
from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.models.user import User, UserRole


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, db_session: AsyncSession):
    user = User(
        email="admin@test.com",
        hashed_password=hash_password("secret123"),
        full_name="Test Admin",
        role=UserRole.admin,
    )
    db_session.add(user)
    await db_session.commit()

    r = await client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "secret123"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, db_session: AsyncSession):
    user = User(
        email="viewer@test.com",
        hashed_password=hash_password("correct"),
        full_name="Viewer",
        role=UserRole.viewer,
    )
    db_session.add(user)
    await db_session.commit()

    r = await client.post("/api/v1/auth/login", json={"email": "viewer@test.com", "password": "wrong"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_without_token(client: AsyncClient):
    r = await client.get("/api/v1/providers")
    assert r.status_code == 401  # FastAPI 0.115+ HTTPBearer returns 401 for missing credentials


@pytest.mark.asyncio
async def test_invalid_token_returns_401(client: AsyncClient):
    r = await client.get(
        "/api/v1/providers",
        headers={"Authorization": "Bearer not.a.valid.jwt"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_wrong_token_type_returns_401(client: AsyncClient):
    """A refresh token must not be accepted as an access token."""
    from app.core.security import create_refresh_token

    token = create_refresh_token(user_id=999)
    r = await client.get(
        "/api/v1/providers",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_viewer_cannot_create_provider(client: AsyncClient, db_session: AsyncSession):
    user = User(
        email="viewer2@test.com",
        hashed_password=hash_password("pass"),
        full_name="Viewer2",
        role=UserRole.viewer,
    )
    db_session.add(user)
    await db_session.commit()

    login = await client.post("/api/v1/auth/login", json={"email": "viewer2@test.com", "password": "pass"})
    token = login.json()["access_token"]

    r = await client.post(
        "/api/v1/providers",
        json={"npi": "1234567890", "full_name": "Dr. Test", "specialty_ids": []},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403
