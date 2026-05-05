from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.provider import Provider, Specialty
from app.db.schemas.provider import ProviderCreate, ProviderUpdate


async def get_specialties(db: AsyncSession) -> list[Specialty]:
    result = await db.execute(select(Specialty).order_by(Specialty.name))
    return list(result.scalars().all())


async def get_providers(
    db: AsyncSession,
    *,
    search: str | None = None,
    state: str | None = None,
    specialty_ids: list[int] | None = None,
    is_active: bool | None = None,
    page: int = 1,
    page_size: int = 25,
) -> tuple[list[Provider], int]:
    query = select(Provider).options(selectinload(Provider.specialties))

    if search:
        like = f"%{search}%"
        query = query.where(
            Provider.full_name.ilike(like) | Provider.organization.ilike(like) | Provider.npi.ilike(like)
        )
    if state:
        query = query.where(Provider.state == state.upper())
    if is_active is not None:
        query = query.where(Provider.is_active == is_active)
    if specialty_ids:
        query = query.join(Provider.specialties).where(Specialty.id.in_(specialty_ids))

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    query = query.order_by(Provider.full_name).offset((page - 1) * page_size).limit(page_size)
    rows = list((await db.execute(query)).scalars().unique().all())
    return rows, total


async def get_provider(db: AsyncSession, provider_id: int) -> Provider:
    result = await db.execute(
        select(Provider).options(selectinload(Provider.specialties)).where(Provider.id == provider_id)
    )
    provider = result.scalar_one_or_none()
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    return provider


async def create_provider(db: AsyncSession, data: ProviderCreate) -> Provider:
    existing = await db.execute(select(Provider).where(Provider.npi == data.npi))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="NPI already registered")

    specialties = []
    for sid in data.specialty_ids:
        sp = (await db.execute(select(Specialty).where(Specialty.id == sid))).scalar_one_or_none()
        if sp is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Specialty {sid} not found")
        specialties.append(sp)

    provider = Provider(**data.model_dump(exclude={"specialty_ids"}), specialties=specialties)
    db.add(provider)
    await db.commit()
    await db.refresh(provider)
    return await get_provider(db, provider.id)


async def update_provider(db: AsyncSession, provider_id: int, data: ProviderUpdate) -> Provider:
    provider = await get_provider(db, provider_id)

    update_data = data.model_dump(exclude_unset=True, exclude={"specialty_ids"})
    for field, value in update_data.items():
        setattr(provider, field, value)

    if data.specialty_ids is not None:
        specialties = []
        for sid in data.specialty_ids:
            sp = (await db.execute(select(Specialty).where(Specialty.id == sid))).scalar_one_or_none()
            if sp is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Specialty {sid} not found"
                )
            specialties.append(sp)
        provider.specialties = specialties

    await db.commit()
    return await get_provider(db, provider_id)


async def delete_provider(db: AsyncSession, provider_id: int) -> None:
    provider = await get_provider(db, provider_id)
    await db.delete(provider)
    await db.commit()
