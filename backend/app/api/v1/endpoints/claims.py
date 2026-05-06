from __future__ import annotations

import io
import uuid as _uuid
from typing import cast

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi import status as http_status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.dependencies import require_admin, require_viewer
from app.db.crud.claim import get_claim_metrics, get_claims
from app.db.models.claim import ClaimBatch
from app.db.models.user import User
from app.db.schemas.claim import BatchRead, ClaimFilter, ClaimListResponse, ClaimMetrics, ClaimRead
from app.db.session import get_db
from app.services import claims_parser, s3

router = APIRouter(prefix="/claims", tags=["claims"])


@router.get("/metrics", response_model=ClaimMetrics)
async def claim_metrics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_viewer),
) -> ClaimMetrics:
    return await get_claim_metrics(db)


@router.get("", response_model=ClaimListResponse)
async def list_claims(
    filters: ClaimFilter = Depends(),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_viewer),
) -> ClaimListResponse:
    items, total = await get_claims(db, filters)
    return ClaimListResponse(
        items=cast(list[ClaimRead], items),
        total=total,
        page=filters.page,
        page_size=filters.page_size,
    )


router_uploads = APIRouter(prefix="/uploads", tags=["uploads"])


@router_uploads.post("/claims-csv", response_model=BatchRead, status_code=202)
async def upload_claims_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> BatchRead:
    from fastapi import HTTPException
    from fastapi import status as http_status

    settings = get_settings()

    # Validate file
    if file.content_type not in {"text/csv", "application/csv", "application/octet-stream"}:
        raise HTTPException(
            status_code=http_status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only CSV files accepted",
        )

    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=http_status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large (max 10MB)",
        )

    # Ensure extension is .csv
    filename = file.filename or "upload.csv"
    if not filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=http_status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File must have .csv extension",
        )

    s3.ensure_bucket_exists()
    s3_key = f"uploads/claims/{_uuid.uuid4()}/{filename}"
    s3.upload_fileobj(io.BytesIO(content), s3_key, "text/csv")

    batch = ClaimBatch(
        filename=filename,
        s3_key=s3_key,
        uploaded_by_id=current_user.id,
    )
    db.add(batch)
    await db.commit()
    await db.refresh(batch)

    background_tasks.add_task(claims_parser.parse_and_import, batch.id, content)

    return cast(BatchRead, batch)


@router_uploads.get("/batches", response_model=list[BatchRead])
async def list_batches(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> list:
    result = await db.execute(
        select(ClaimBatch).order_by(ClaimBatch.created_at.desc()).limit(50)
    )
    return list(result.scalars().all())


@router_uploads.get("/batches/{batch_id}", response_model=BatchRead)
async def get_batch(
    batch_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> ClaimBatch:
    result = await db.execute(select(ClaimBatch).where(ClaimBatch.id == batch_id))
    batch = result.scalar_one_or_none()
    if batch is None:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Batch not found")
    return batch
