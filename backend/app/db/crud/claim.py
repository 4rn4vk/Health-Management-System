from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import case, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.claim import Claim, ClaimBatch, ClaimStatus
from app.db.models.provider import Provider
from app.db.schemas.claim import ClaimFilter, ClaimMetrics


async def get_claims(
    db: AsyncSession, filters: ClaimFilter
) -> tuple[list[Claim], int]:
    query = select(Claim)

    if filters.provider_id:
        query = query.where(Claim.provider_id == filters.provider_id)
    if filters.status:
        query = query.where(Claim.status == filters.status)
    if filters.claim_type:
        query = query.where(Claim.claim_type == filters.claim_type)
    if filters.service_date_from:
        query = query.where(Claim.service_date >= filters.service_date_from)
    if filters.service_date_to:
        query = query.where(Claim.service_date <= filters.service_date_to)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    query = query.order_by(Claim.service_date.desc()).offset(
        (filters.page - 1) * filters.page_size
    ).limit(filters.page_size)

    rows = list((await db.execute(query)).scalars().all())
    return rows, total


async def get_claim_metrics(db: AsyncSession) -> ClaimMetrics:
    # Status breakdown
    status_rows = (
        await db.execute(
            select(Claim.status, func.count(Claim.id).label("cnt")).group_by(Claim.status)
        )
    ).all()
    status_breakdown = {row.status.value: row.cnt for row in status_rows}

    # Monthly billed / approved (last 12 months, most recent first → reverse for display)
    twelve_months_ago = date.today() - timedelta(days=365)
    monthly_rows = (
        await db.execute(
            select(
                extract("year", Claim.service_date).label("year"),
                extract("month", Claim.service_date).label("month"),
                func.sum(Claim.billed_amount).label("total_billed"),
                func.sum(
                    case((Claim.approved_amount.isnot(None), Claim.approved_amount), else_=0)
                ).label("total_approved"),
            )
            .where(Claim.service_date >= twelve_months_ago)
            .group_by("year", "month")
            .order_by("year", "month")
        )
    ).all()
    monthly_billed = [
        {
            "month": f"{int(r.year)}-{int(r.month):02d}",
            "total_billed": float(r.total_billed or 0),
            "total_approved": float(r.total_approved or 0),
        }
        for r in monthly_rows
    ]

    # Provider volume (top 10)
    vol_rows = (
        await db.execute(
            select(
                Provider.id.label("provider_id"),
                Provider.full_name.label("provider_name"),
                func.count(Claim.id).label("claim_count"),
            )
            .join(Claim, Claim.provider_id == Provider.id)
            .group_by(Provider.id, Provider.full_name)
            .order_by(func.count(Claim.id).desc())
            .limit(10)
        )
    ).all()
    provider_volume = [
        {"provider_id": r.provider_id, "provider_name": r.provider_name, "claim_count": r.claim_count}
        for r in vol_rows
    ]

    # Average processing time (days between created_at → processed_at)
    avg_row = (
        await db.execute(
            select(
                func.avg(
                    func.extract("epoch", Claim.processed_at - Claim.created_at) / 86400
                ).label("avg_days")
            ).where(Claim.processed_at.isnot(None))
        )
    ).scalar_one_or_none()

    return ClaimMetrics(
        status_breakdown=status_breakdown,
        monthly_billed=monthly_billed,
        provider_volume=provider_volume,
        avg_processing_days=float(avg_row) if avg_row is not None else None,
    )
