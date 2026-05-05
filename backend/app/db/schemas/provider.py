from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class SpecialtyRead(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str


class SpecialtyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class ProviderBase(BaseModel):
    npi: str = Field(pattern=r"^\d{10}$", description="10-digit NPI")
    full_name: str = Field(min_length=1, max_length=255)
    organization: str | None = Field(default=None, max_length=255)
    state: str | None = Field(default=None, min_length=2, max_length=2)
    city: str | None = Field(default=None, max_length=100)
    zip_code: str | None = Field(default=None, max_length=10)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None
    is_active: bool = True


class ProviderCreate(ProviderBase):
    specialty_ids: list[int] = []


class ProviderUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    organization: str | None = Field(default=None, max_length=255)
    state: str | None = Field(default=None, min_length=2, max_length=2)
    city: str | None = Field(default=None, max_length=100)
    zip_code: str | None = Field(default=None, max_length=10)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None
    is_active: bool | None = None
    specialty_ids: list[int] | None = None


class ProviderRead(ProviderBase):
    model_config = {"from_attributes": True}

    id: int
    license_document_s3_key: str | None
    created_at: datetime
    updated_at: datetime
    specialties: list[SpecialtyRead] = []


class ProviderListResponse(BaseModel):
    items: list[ProviderRead]
    total: int
    page: int
    page_size: int


class DocumentUploadResponse(BaseModel):
    s3_key: str
    filename: str
    presigned_url: str


class DocumentListItem(BaseModel):
    filename: str
    presigned_url: str
    s3_key: str
