"""
Unit tests for the Monthly analytics six-month average. Pure functions, with the database
fetches replaced by in-memory rows; the window and first-transaction rules are the Overview's
(tests/test_summary_overview.py), so only their use here is checked.
"""

import os
import sys
from datetime import date

import pytest

# Add 'src' to sys.path to allow importing 'backend' as a package
current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.abspath(os.path.join(current_dir, "../../"))
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from backend.helper.calculations import monthly_page_calc as calc  # noqa: E402
from backend.helper.calculations.monthly_page_calc import (  # noqa: E402
    _calculate_monthly_totals,
    _calculate_six_month_average,
    _monthly_analytics,
    _prepare_transactions_dataframe,
)
from backend.helper.calculations.summary_calc import (  # noqa: E402
    _average_window_months,
)
from backend.helper.calculations.summary_calc import (  # noqa: E402
    _calculate_six_month_average as overview_six_month_average,
)
from backend.helper.calculations.summary_calc import (  # noqa: E402
    _prepare_transactions_dataframe as summary_prepare_df,
)


def tx(day: str, amount: float, ctype: str, name: str = "Cat", spending_type: str = "Core") -> dict:
    """A raw transaction shaped like the Supabase select used by the monthly page."""
    return {
        "amount": amount,
        "date": day,
        "dim_categories_users": {"type": ctype, "category_name": name, "spending_type": spending_type},
        "notes": "",
    }


def month_rows(prefix: str, income: float, expense: float, saving: float = 0.0) -> list[dict]:
    rows = []
    if income:
        rows.append(tx(f"{prefix}-05", income, "income", "Salary"))
    if expense:
        rows.append(tx(f"{prefix}-10", -expense, "expense", "Food"))
    if saving:
        rows.append(tx(f"{prefix}-15", -saving, "saving", "Fund"))
    return rows


def test_no_months_means_no_average():
    assert _calculate_six_month_average(_prepare_transactions_dataframe([]), []) is None


def test_average_of_monthly_totals_and_rates():
    window = _average_window_months(date(2026, 3, 1))[-2:]  # Jan and Feb 2026
    rows = month_rows("2026-01", 1000, 400, 100) + month_rows("2026-02", 2000, 600, 600)
    avg = _calculate_six_month_average(_prepare_transactions_dataframe(rows), window)
    assert avg is not None
    assert avg.months_counted == 2
    assert avg.income == 1500.0
    assert avg.expenses == 500.0
    assert avg.savings == 350.0
    assert avg.cashflow == (1000 - 400 - 100 + 2000 - 600 - 600) / 2
    # Mean of the monthly rates (10 % and 30 %), not total savings over total income (23.3 %).
    assert avg.savings_rate == 20.0


def test_month_without_income_does_not_count_as_zero_rate():
    window = _average_window_months(date(2026, 3, 1))[-2:]
    rows = month_rows("2026-01", 1000, 400, 200) + month_rows("2026-02", 0, 300)
    avg = _calculate_six_month_average(_prepare_transactions_dataframe(rows), window)
    assert avg is not None
    assert avg.months_counted == 2           # the empty-income month still counts for amounts
    assert avg.income == 500.0
    assert avg.expenses == 350.0
    assert avg.savings_rate == 20.0          # only January had income


def test_savings_rate_is_none_when_no_counted_month_has_income():
    window = _average_window_months(date(2026, 3, 1))[-1:]
    avg = _calculate_six_month_average(_prepare_transactions_dataframe(month_rows("2026-02", 0, 300)), window)
    assert avg is not None and avg.savings_rate is None


def test_amounts_match_the_overview_average():
    window = _average_window_months(date(2026, 3, 1))[-3:]
    rows = (
        month_rows("2025-12", 900, 300, 50)
        + month_rows("2026-01", 1100, 500, 150)
        + month_rows("2026-02", 1000, 200)
        + [tx("2026-01-20", 40.0, "income", "Savings Funds Withdrawal")]
    )
    monthly = _calculate_six_month_average(_prepare_transactions_dataframe(rows), window)
    overview = overview_six_month_average(summary_prepare_df(rows), window)
    assert monthly is not None and overview is not None
    assert monthly.months_counted == overview.months_counted
    assert monthly.income == overview.income
    assert monthly.expenses == overview.expense
    assert monthly.savings == overview.saving
    assert monthly.profit == overview.profit
    assert monthly.cashflow == overview.net_cash_flow


def test_monthly_totals_ignore_other_months_in_the_frame():
    rows = month_rows("2026-01", 1000, 400) + month_rows("2026-02", 2000, 600)
    df = _prepare_transactions_dataframe(rows)
    assert _calculate_monthly_totals(calc._month_rows(df, date(2026, 2, 1))).income == 2000.0


@pytest.fixture
def fetch(monkeypatch):
    """Replace both database reads of _monthly_analytics and record how they were called."""
    calls: dict = {}

    def install(rows: list[dict], first: date | None):
        def fake_fetch(token, start, end):
            calls["range"] = (start, end)
            return [r for r in rows if start.isoformat() <= r["date"] <= end.isoformat()]

        monkeypatch.setattr(calc, "_fetch_summary_transactions", fake_fetch)
        monkeypatch.setattr(calc, "_fetch_first_transaction_date", lambda token: first)
        return calls

    return install


def test_monthly_analytics_reads_seven_months_in_one_range(fetch):
    calls = fetch(month_rows("2026-03", 1000, 400), date(2026, 3, 5))
    data = _monthly_analytics("token", 2026, 3)
    assert calls["range"] == (date(2025, 9, 1), date(2026, 3, 31))
    assert data.income == 1000.0 and data.expenses == 400.0
    # First transaction is in the requested month, so there is no history to average.
    assert data.six_month_average is None
    assert not hasattr(data, "yoy_comparison")


def test_monthly_analytics_average_skips_months_before_first_transaction(fetch):
    rows = (
        month_rows("2025-12", 1000, 500, 100)
        + month_rows("2026-01", 3000, 1500, 300)
        + month_rows("2026-03", 2000, 700, 100)
    )
    fetch(rows, date(2025, 12, 12))
    data = _monthly_analytics("token", 2026, 3)
    avg = data.six_month_average
    assert avg is not None
    # December, January and February count (February has no rows: zero).
    assert avg.months_counted == 3
    assert avg.income == round((1000 + 3000 + 0) / 3, 2)
    assert avg.expenses == round((500 + 1500 + 0) / 3, 2)
    assert avg.savings_rate == 10.0
    # The previous-month comparison is still against February, an empty month.
    assert data.comparison.income_delta == 2000.0
