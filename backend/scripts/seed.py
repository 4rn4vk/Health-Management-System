"""Seed script: creates demo users, specialties, providers, and claims.

Usage (from backend/):
    python scripts/seed.py
"""
from __future__ import annotations

import asyncio
import random
from datetime import date, timedelta

from sqlalchemy import select

from app.core.security import hash_password
from app.db.base import Base  # noqa: F401 — registers models
from app.db.models.claim import Claim, ClaimBatch, BatchStatus, ClaimStatus, ClaimType
from app.db.models.provider import Provider, Specialty
from app.db.models.user import User, UserRole
from app.db.session import AsyncSessionLocal, engine

SPECIALTIES = [
    "Family Medicine", "Internal Medicine", "Cardiology", "Orthopedics",
    "Neurology", "Pediatrics", "Oncology", "Psychiatry", "Radiology", "Surgery",
]

FIRST_NAMES = ["James", "Maria", "John", "Patricia", "Robert", "Linda", "Michael", "Barbara"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Martinez", "Davis"]
STATES = ["VA", "MD", "DC", "NY", "CA", "TX", "FL", "WA"]
CITIES = ["Arlington", "Baltimore", "Washington", "New York", "Los Angeles", "Austin", "Miami", "Seattle"]

random.seed(42)


def random_npi(used: set) -> str:
    while True:
        npi = "".join([str(random.randint(0, 9)) for _ in range(10)])
        if npi not in used:
            used.add(npi)
            return npi


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # ── Users ──────────────────────────────────────────────────────────────
        existing = (await db.execute(select(User).where(User.email == "admin@hcms.local"))).scalar_one_or_none()
        if not existing:
            db.add(User(
                email="admin@hcms.local",
                hashed_password=hash_password("admin_password"),
                full_name="System Admin",
                role=UserRole.admin,
            ))
            db.add(User(
                email="viewer@hcms.local",
                hashed_password=hash_password("viewer_password"),
                full_name="Claims Viewer",
                role=UserRole.viewer,
            ))
            await db.commit()
            print("✓ Users created")

        # ── Specialties ────────────────────────────────────────────────────────
        sp_objects = []
        for name in SPECIALTIES:
            existing = (await db.execute(select(Specialty).where(Specialty.name == name))).scalar_one_or_none()
            if not existing:
                sp = Specialty(name=name)
                db.add(sp)
                sp_objects.append(sp)
        await db.commit()
        all_specialties = list((await db.execute(select(Specialty))).scalars().all())
        print(f"✓ {len(all_specialties)} specialties ready")

        # ── Providers ──────────────────────────────────────────────────────────
        used_npis: set = set()
        providers_added = 0
        for i in range(20):
            npi = random_npi(used_npis)
            existing = (await db.execute(select(Provider).where(Provider.npi == npi))).scalar_one_or_none()
            if existing:
                continue
            state = STATES[i % len(STATES)]
            provider = Provider(
                npi=npi,
                full_name=f"Dr. {random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
                organization=f"{random.choice(LAST_NAMES)} Medical Group",
                state=state,
                city=CITIES[i % len(CITIES)],
                zip_code=f"{random.randint(10000, 99999)}",
                phone=f"555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
                specialties=random.sample(all_specialties, k=random.randint(1, 3)),
            )
            db.add(provider)
            providers_added += 1
        await db.commit()
        all_providers = list((await db.execute(select(Provider))).scalars().all())
        print(f"✓ {len(all_providers)} providers ready")

        # ── Batch + Claims ─────────────────────────────────────────────────────
        admin = (await db.execute(select(User).where(User.role == UserRole.admin))).scalar_one()
        existing_claims = (await db.execute(select(Claim).limit(1))).scalar_one_or_none()
        if not existing_claims:
            batch = ClaimBatch(
                filename="seed_claims.csv",
                s3_key="uploads/claims/seed/seed_claims.csv",
                status=BatchStatus.completed,
                uploaded_by_id=admin.id,
                total_rows=200,
            )
            db.add(batch)
            await db.flush()

            today = date.today()
            statuses = list(ClaimStatus)
            claim_types = list(ClaimType)
            for i in range(200):
                provider = random.choice(all_providers)
                svc_date = today - timedelta(days=random.randint(0, 365))
                status = random.choice(statuses)
                billed = round(random.uniform(50, 5000), 2)
                approved = round(billed * random.uniform(0.6, 1.0), 2) if status in (ClaimStatus.approved, ClaimStatus.paid) else None
                db.add(Claim(
                    claim_number=f"CLM{i+1:06d}",
                    provider_id=provider.id,
                    batch_id=batch.id,
                    claim_type=random.choice(claim_types),
                    status=status,
                    service_date=svc_date,
                    billed_amount=billed,
                    approved_amount=approved,
                    patient_id=f"PAT{random.randint(10000, 99999)}",
                    diagnosis_code=f"Z{random.randint(10, 99)}.{random.randint(0, 9)}",
                    procedure_code=f"{random.randint(10000, 99999)}",
                ))
            batch.imported_rows = 200
            await db.commit()
            print("✓ 200 seed claims created")
        else:
            print("✓ Claims already present, skipping")

    print("\n✅ Seed complete.")
    print("   Admin:  admin@hcms.local  / admin_password")
    print("   Viewer: viewer@hcms.local / viewer_password")


if __name__ == "__main__":
    asyncio.run(seed())
