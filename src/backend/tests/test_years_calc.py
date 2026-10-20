"""
Unit tests for `years_with_data`, which feeds the frontend's year pickers.
"""

import os
import sys
from datetime import date

# Add 'src' to sys.path to allow importing 'backend' as a package.
current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.abspath(os.path.join(current_dir, "../../"))
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from backend.helper.calculations.years_calc import years_with_data  # noqa: E402

TODAY = date(2026, 10, 20)


def test_no_transactions_offers_only_current_year():
    assert years_with_data(None, None, TODAY) == [2026]


def test_spans_first_to_current_year_newest_first():
    assert years_with_data(date(2022, 3, 1), date(2026, 9, 30), TODAY) == [2026, 2025, 2024, 2023, 2022]


def test_old_data_still_includes_current_year():
    """Data that stopped in the past must not hide the current year."""
    assert years_with_data(date(2020, 1, 1), date(2021, 6, 1), TODAY) == [2026, 2025, 2024, 2023, 2022, 2021, 2020]


def test_future_dated_transactions_extend_forward():
    assert years_with_data(date(2025, 1, 1), date(2027, 2, 1), TODAY) == [2027, 2026, 2025]
