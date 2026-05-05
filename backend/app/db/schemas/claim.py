from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.db.models.claim import BatchStatus, ClaimStatus, ClaimType


class ClaimRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    claim_number: str
    provider_id: int
    batch_id: int | None
    claim_type: ClaimType
    status: ClaimStatus
    service_date: date
    billed_amount: float
    approved_amount: float | None
    patient_id: str | None
    diagnosis_code: str | None
    procedure_code: str | None
    notes: str | None
    created_at: datetime
    processed_at: datetime | None


class ClaimListResponse(BaseModel):
    items: list[ClaimRead]
    total: int
    page: int
    page_size: int


class ClaimFilter(BaseModel):
    provider_id: int | None = None
    status: ClaimStatus | None = None
    claim_type: ClaimType | None = None
    service_date_from: date | None = None
    service_date_to: date | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=25, ge=1, le=100)


class BatchRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    filename: str
    s3_key: str
    status: BatchStatus
    total_rows: int
    imported_rows: int
    error_count: int
    error_detail: str | None
    uploaded_by_id: int | None
    created_at: datetime
    completed_at: datetime | None


class ClaimMetrics(BaseModel):
    status_breakdown: dict[str, int]
    monthly_billed: list[dict]   # [{month, total_billed, total_approved}]
    provider_volume: list[dict]  # [{provider_id, provider_name, claim_count}]
    avg_processing_days: float | None
