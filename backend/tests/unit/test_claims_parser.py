"""Unit tests for the CSV claims parser."""
from __future__ import annotations

import pytest

from app.services.claims_parser import REQUIRED_COLUMNS, _read_csv


VALID_CSV = b"""claim_number,provider_npi,claim_type,service_date,billed_amount,status
CLM001,1234567890,professional,2025-01-15,250.00,pending
CLM002,1234567890,dental,2025-01-16,80.50,approved
"""

MISSING_COLUMN_CSV = b"""claim_number,provider_npi,service_date,billed_amount
CLM003,1234567890,2025-01-17,100.00
"""

EMPTY_CSV = b"""claim_number,provider_npi,claim_type,service_date,billed_amount
"""


def test_read_valid_csv_returns_rows():
    rows = _read_csv(VALID_CSV)
    assert len(rows) == 2
    assert rows[0]["claim_number"] == "CLM001"
    assert rows[1]["claim_type"] == "dental"


def test_read_csv_empty_body_returns_empty_list():
    rows = _read_csv(EMPTY_CSV)
    assert rows == []


def test_missing_required_columns_detected():
    rows = _read_csv(MISSING_COLUMN_CSV)
    missing = REQUIRED_COLUMNS - set(rows[0].keys())
    assert "claim_type" in missing


def test_utf8_bom_handled():
    bom_csv = b"\xef\xbb\xbf" + VALID_CSV
    rows = _read_csv(bom_csv)
    assert rows[0]["claim_number"] == "CLM001"
