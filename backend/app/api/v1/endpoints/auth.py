from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.crud.auth import login, refresh
from app.db.schemas.auth import LoginRequest, RefreshRequest, TokenPair
from app.db.session import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenPair)
async def login_endpoint(request: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenPair:
    return await login(request, db)


@router.post("/refresh", response_model=TokenPair)
async def refresh_endpoint(
    request: RefreshRequest, db: AsyncSession = Depends(get_db)
) -> TokenPair:
    return await refresh(request, db)
