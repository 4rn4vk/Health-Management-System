from __future__ import annotations

import io
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_admin, require_viewer
from app.db.crud import provider as crud
from app.db.models.user import User
from app.db.schemas.provider import (
    DocumentListItem,
    DocumentUploadResponse,
    ProviderCreate,
    ProviderListResponse,
    ProviderRead,
    ProviderUpdate,
    SpecialtyRead,
)
from app.db.session import get_db
from app.services import s3

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("/specialties", response_model=list[SpecialtyRead])
async def list_specialties(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_viewer),
) -> list:
    return await crud.get_specialties(db)


@router.get("", response_model=ProviderListResponse)
async def list_providers(
    search: str | None = Query(default=None, max_length=200),
    state: str | None = Query(default=None, max_length=2),
    specialty_ids: list[int] = Query(default=[]),
    is_active: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_viewer),
) -> ProviderListResponse:
    items, total = await crud.get_providers(
        db,
        search=search,
        state=state,
        specialty_ids=specialty_ids or None,
        is_active=is_active,
        page=page,
        page_size=page_size,
    )
    return ProviderListResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=ProviderRead, status_code=201)
async def create_provider(
    data: ProviderCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> ProviderRead:
    return await crud.create_provider(db, data)


@router.get("/{provider_id}", response_model=ProviderRead)
async def get_provider(
    provider_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_viewer),
) -> ProviderRead:
    return await crud.get_provider(db, provider_id)


@router.put("/{provider_id}", response_model=ProviderRead)
async def update_provider(
    provider_id: int,
    data: ProviderUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> ProviderRead:
    return await crud.update_provider(db, provider_id, data)


@router.delete("/{provider_id}", status_code=204)
async def delete_provider(
    provider_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    await crud.delete_provider(db, provider_id)


@router.post("/{provider_id}/documents/upload", response_model=DocumentUploadResponse)
async def upload_provider_document(
    provider_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> DocumentUploadResponse:
    from app.core.config import get_settings

    settings = get_settings()

    if file.size and file.size > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large"
        )

    allowed_ct = {"text/csv", "application/pdf", "image/png", "image/jpeg"}
    if file.content_type and file.content_type not in allowed_ct:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Unsupported file type"
        )

    provider = await crud.get_provider(db, provider_id)
    content = await file.read()
    s3_key = f"providers/{provider_id}/documents/{uuid.uuid4()}/{file.filename}"
    s3.upload_fileobj(io.BytesIO(content), s3_key, file.content_type or "application/octet-stream")

    provider.license_document_s3_key = s3_key
    await db.commit()

    presigned = s3.generate_presigned_url(s3_key)
    return DocumentUploadResponse(
        s3_key=s3_key, filename=file.filename or "", presigned_url=presigned
    )


@router.get("/{provider_id}/documents", response_model=list[DocumentListItem])
async def list_provider_documents(
    provider_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_viewer),
) -> list[DocumentListItem]:
    await crud.get_provider(db, provider_id)  # 404 guard
    keys = s3.list_objects(f"providers/{provider_id}/documents/")
    return [
        DocumentListItem(
            filename=k.split("/")[-1],
            s3_key=k,
            presigned_url=s3.generate_presigned_url(k),
        )
        for k in keys
    ]
