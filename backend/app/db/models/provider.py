from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# Many-to-many join table
provider_specialties = Table(
    "provider_specialties",
    Base.metadata,
    Column("provider_id", Integer, ForeignKey("providers.id", ondelete="CASCADE"), primary_key=True),
    Column("specialty_id", Integer, ForeignKey("specialties.id", ondelete="CASCADE"), primary_key=True),
)


class Specialty(Base):
    __tablename__ = "specialties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)

    providers: Mapped[list["Provider"]] = relationship(
        "Provider", secondary=provider_specialties, back_populates="specialties"
    )


class Provider(Base):
    __tablename__ = "providers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    npi: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    organization: Mapped[str | None] = mapped_column(String(255))
    state: Mapped[str | None] = mapped_column(String(2))
    city: Mapped[str | None] = mapped_column(String(100))
    zip_code: Mapped[str | None] = mapped_column(String(10))
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    license_document_s3_key: Mapped[str | None] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    specialties: Mapped[list[Specialty]] = relationship(
        "Specialty", secondary=provider_specialties, back_populates="providers"
    )
    claims: Mapped[list["Claim"]] = relationship("Claim", back_populates="provider")  # noqa: F821
