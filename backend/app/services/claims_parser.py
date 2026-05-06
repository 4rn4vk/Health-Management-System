from __future__ import annotations

import csv
import io
from datetime import UTC, datetime

import structlog
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.claim import BatchStatus, Claim, ClaimBatch, ClaimStatus, ClaimType
from app.db.models.provider import Provider
from app.db.session import AsyncSessionLocal

logger = structlog.get_logger()

REQUIRED_COLUMNS = {
    "claim_number",
    "provider_npi",
    "claim_type",
    "service_date",
    "billed_amount",
}


async def parse_and_import(batch_id: int, csv_content: bytes) -> None:
    """Background task: parse CSV bytes and bulk-import claims."""
    async with AsyncSessionLocal() as db:
        batch = await _get_batch(db, batch_id)
        if batch is None:
            logger.error("batch_not_found", batch_id=batch_id)
            return

        try:
            rows = _read_csv(csv_content)
        except Exception as exc:
            await _fail_batch(db, batch, str(exc))
            return

        missing = REQUIRED_COLUMNS - set(rows[0].keys()) if rows else set()
        if missing:
            await _fail_batch(db, batch, f"Missing columns: {missing}")
            return

        batch.total_rows = len(rows)
        await db.commit()

        imported = 0
        errors = 0
        error_msgs: list[str] = []

        for i, row in enumerate(rows, start=1):
            try:
                claim_data = await _parse_row(db, row)
                stmt = pg_insert(Claim).values(**claim_data, batch_id=batch_id)
                stmt = stmt.on_conflict_do_nothing(index_elements=["claim_number"])
                await db.execute(stmt)
                imported += 1
            except Exception as exc:  # noqa: BLE001
                errors += 1
                if len(error_msgs) < 10:
                    error_msgs.append(f"Row {i}: {exc}")

        batch.imported_rows = imported
        batch.error_count = errors
        batch.status = BatchStatus.completed if errors == 0 else BatchStatus.failed
        batch.error_detail = "\n".join(error_msgs) if error_msgs else None
        batch.completed_at = datetime.now(UTC)
        await db.commit()
        logger.info("batch_completed", batch_id=batch_id, imported=imported, errors=errors)


def _read_csv(content: bytes) -> list[dict]:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    return [dict(row) for row in reader]


async def _get_batch(db: AsyncSession, batch_id: int) -> ClaimBatch | None:
    result = await db.execute(select(ClaimBatch).where(ClaimBatch.id == batch_id))
    return result.scalar_one_or_none()


async def _fail_batch(db: AsyncSession, batch: ClaimBatch, reason: str) -> None:
    batch.status = BatchStatus.failed
    batch.error_detail = reason
    batch.completed_at = datetime.now(UTC)
    await db.commit()
    logger.error("batch_failed", batch_id=batch.id, reason=reason)


async def _parse_row(db: AsyncSession, row: dict) -> dict:
    npi = row["provider_npi"].strip()
    result = await db.execute(select(Provider).where(Provider.npi == npi))
    provider = result.scalar_one_or_none()
    if provider is None:
        raise ValueError(f"Provider NPI '{npi}' not found")

    from datetime import date as _date  # local import to avoid name clash with datetime module

    return {
        "claim_number": row["claim_number"].strip(),
        "provider_id": provider.id,
        "claim_type": ClaimType(row["claim_type"].strip().lower()),
        "status": ClaimStatus(row.get("status", "pending").strip().lower()),
        "service_date": _date.fromisoformat(row["service_date"].strip()),
        "billed_amount": float(row["billed_amount"].strip()),
        "approved_amount": float(row["approved_amount"].strip()) if row.get("approved_amount") else None,  # noqa: E501
        "patient_id": row.get("patient_id", "").strip() or None,
        "diagnosis_code": row.get("diagnosis_code", "").strip() or None,
        "procedure_code": row.get("procedure_code", "").strip() or None,
        "notes": row.get("notes", "").strip() or None,
    }
