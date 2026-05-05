from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.claims import router as claims_router
from app.api.v1.endpoints.claims import router_uploads
from app.api.v1.endpoints.providers import router as providers_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(providers_router)
api_router.include_router(claims_router)
api_router.include_router(router_uploads)
