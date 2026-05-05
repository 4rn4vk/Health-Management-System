from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import all models here so Alembic autogenerate can discover them
from app.db.models import claim, provider, user  # noqa: E402, F401
