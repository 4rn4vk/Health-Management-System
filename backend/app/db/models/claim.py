from __future__ import annotations

import enum
from datetime import UTC, date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.provider import Provider
    from app.db.models.user import User


class ClaimStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    denied = "denied"
    paid = "paid"


class ClaimType(str, enum.Enum):
    professional = "professional"
    institutional = "institutional"
    dental = "dental"


class BatchStatus(str, enum.Enum):
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ClaimBatch(Base):
    __tablename__ = "claim_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    s3_key: Mapped[str] = mapped_column(String(512), nullable=False)
    status: Mapped[BatchStatus] = mapped_column(
        Enum(BatchStatus), default=BatchStatus.processing, nullable=False
    )
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    imported_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_detail: Mapped[str | None] = mapped_column(Text)
    uploaded_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    uploaded_by_user: Mapped[User] = relationship("User", back_populates="batches")
    claims: Mapped[list[Claim]] = relationship("Claim", back_populates="batch")


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    claim_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    provider_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("providers.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    batch_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("claim_batches.id", ondelete="SET NULL")
    )
    claim_type: Mapped[ClaimType] = mapped_column(Enum(ClaimType), nullable=False)
    status: Mapped[ClaimStatus] = mapped_column(
        Enum(ClaimStatus), default=ClaimStatus.pending, nullable=False, index=True
    )
    service_date: Mapped[date] = mapped_column(Date, nullable=False)
    billed_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    approved_amount: Mapped[float | None] = mapped_column(Numeric(12, 2))
    patient_id: Mapped[str | None] = mapped_column(String(50))  # anonymised, no real PII
    diagnosis_code: Mapped[str | None] = mapped_column(String(20))
    procedure_code: Mapped[str | None] = mapped_column(String(20))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    provider: Mapped[Provider] = relationship("Provider", back_populates="claims")
    batch: Mapped[ClaimBatch | None] = relationship("ClaimBatch", back_populates="claims")
