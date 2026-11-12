"""
Unit tests for the Overview additions to the summary calculation: the cumulative spending
series, the six-month average of it, the six-month average totals and the full expense
category list. Pure functions only; no database or API.
"""

import os
import sys
from datetime import date

import polars as pl
import pytest

# Add 'src' to sys.path to allow importing 'backend' as a package
current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.abspath(os.path.join(current_dir, "../../"))
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from backend.helper.calculations.summary_calc import (  # noqa: E402
    _apply_currency_conversion,
    _average_cumulative_expense,
    _average_window_months,
    _calculate_enriched_summary,
    _calculate_six_month_average,
    _calculate_summary_totals,
    _cumulative_expense_by_day,
    _elapsed_days,
    _get_expense_categories,
    _month_rows,
    _months_with_history,
)
from backend.helper.calculations.summary_calc import (  # noqa: E402
    _prepare_transactions_dataframe as prepare_df,
)


def tx(day: str, amount: float, ctype: str, name: str = "Cat", currency: str | None = None) -> dict:
    """A raw transaction shaped like the Supabase select used by the summary."""
    row: dict = {
        "amount": amount,
        "date": day,
        "dim_categories_users": {"type": ctype, "category_name": name, "spending_type": "Core"},
        "notes": "",
    }
    if currency is not None:
        row["dim_accounts"] = {"currency": currency}
    return row


def empty_df():
    return prepare_df([])


# ================================================================================================
#                                   Window and day helpers
# ================================================================================================

def test_average_window_is_six_whole_months_before_target():
    window = _average_window_months(date(2026, 3, 17))
    assert window == [
        date(2025, 9, 1), date(2025, 10, 1), date(2025, 11, 1),
        date(2025, 12, 1), date(2026, 1, 1), date(2026, 2, 1),
    ]


def test_months_with_history_skips_months_before_first_transaction():
    window = _average_window_months(date(2026, 3, 1))
    # First transaction on 12 Dec 2025: Dec, Jan and Feb count, the three before do not.
    counted = _months_with_history(window, date(2025, 12, 12))
    assert counted == [date(2025, 12, 1), date(2026, 1, 1), date(2026, 2, 1)]


def test_months_with_history_no_transactions_at_all():
    assert _months_with_history(_average_window_months(date(2026, 3, 1)), None) == []


def test_months_with_history_first_transaction_on_last_day_of_month_counts_that_month():
    counted = _months_with_history(_average_window_months(date(2026, 3, 1)), date(2026, 1, 31))
    assert counted == [date(2026, 1, 1), date(2026, 2, 1)]


def test_elapsed_days():
    assert _elapsed_days(date(2026, 1, 1), date(2026, 1, 11)) == 11   # current month: up to today
    assert _elapsed_days(date(2026, 1, 1), date(2026, 3, 5)) == 31    # past month: whole month
    assert _elapsed_days(date(2026, 2, 1), date(2026, 3, 5)) == 28
    assert _elapsed_days(date(2026, 6, 1), date(2026, 3, 5)) == 0     # future month: nothing


# ================================================================================================
#                                   Cumulative spending series
# ================================================================================================

def test_cumulative_expense_empty_history():
    series = _cumulative_expense_by_day(empty_df(), date(2026, 1, 1))
    assert series == [0.0] * 31


def test_cumulative_expense_counts_only_expenses_of_that_month():
    df = prepare_df([
        tx("2026-01-02", -100.0, "expense"),
        tx("2026-01-02", -50.0, "expense"),
        tx("2026-01-04", -25.5, "expense"),
        tx("2026-01-03", -999.0, "saving"),        # not an expense
        tx("2026-01-03", 5000.0, "income"),        # not an expense
        tx("2025-12-31", -777.0, "expense"),       # other month
        tx("2026-02-01", -888.0, "expense"),       # other month
    ])
    series = _cumulative_expense_by_day(df, date(2026, 1, 1), 5)
    assert series == [0.0, 150.0, 150.0, 175.5, 175.5]


def test_cumulative_expense_final_value_matches_expense_total():
    df = prepare_df([
        tx("2026-01-01", -10.0, "expense"),
        tx("2026-01-15", -20.25, "expense"),
        tx("2026-01-31", -30.0, "expense"),
        tx("2026-01-10", -500.0, "investment"),
    ])
    series = _cumulative_expense_by_day(df, date(2026, 1, 1))
    assert len(series) == 31
    assert series[-1] == _calculate_summary_totals(df).expense == 60.25


def test_cumulative_expense_limits_to_requested_days():
    df = prepare_df([tx("2026-01-20", -10.0, "expense")])
    assert _cumulative_expense_by_day(df, date(2026, 1, 1), 0) == []
    assert _cumulative_expense_by_day(df, date(2026, 1, 1), 10) == [0.0] * 10
    assert _cumulative_expense_by_day(df, date(2026, 1, 1), 99)[-1] == 10.0  # clamped to 31 days


def test_mixed_currencies_are_converted_before_summing(monkeypatch):
    rates = {("EUR", "CZK"): 25.0}
    monkeypatch.setattr(
        "backend.helper.exchange_rates.get_rate",
        lambda src, dst: 1.0 if src == dst else rates[(src, dst)],
    )
    df = prepare_df([
        tx("2026-01-01", -100.0, "expense", currency="CZK"),
        tx("2026-01-02", -2.0, "expense", currency="EUR"),
    ])
    df = _apply_currency_conversion(df, "CZK")
    assert _cumulative_expense_by_day(df, date(2026, 1, 1), 2) == [100.0, 150.0]
    assert _calculate_summary_totals(df).expense == 150.0


# ================================================================================================
#                                   Average cumulative series
# ================================================================================================

def test_average_cumulative_without_months_is_empty():
    assert _average_cumulative_expense(empty_df(), [], 31) == []


def test_average_cumulative_has_one_value_per_target_day_and_carries_totals_forward():
    # Two months of history: 100 spent on day 1 of December, 300 on day 3 of January.
    df = prepare_df([
        tx("2025-12-01", -100.0, "expense"),
        tx("2026-01-03", -300.0, "expense"),
    ])
    months = [date(2025, 12, 1), date(2026, 1, 1)]
    avg = _average_cumulative_expense(df, months, 31)
    assert len(avg) == 31
    assert avg[0] == 50.0      # (100 + 0) / 2
    assert avg[1] == 50.0
    assert avg[2] == 200.0     # (100 + 300) / 2, carried forward to month end
    assert avg[30] == 200.0


def test_average_cumulative_day_29_to_31_use_only_long_months():
    df = prepare_df([
        tx("2026-01-10", -300.0, "expense"),
        tx("2026-02-10", -100.0, "expense"),
    ])
    months = [date(2026, 1, 1), date(2026, 2, 1)]
    avg = _average_cumulative_expense(df, months, 31)
    assert avg[27] == 200.0    # day 28: (300 + 100) / 2
    assert avg[28] == 300.0    # day 29: only January
    assert avg[30] == 300.0    # day 31: only January


def test_average_cumulative_target_month_shorter_than_history_months():
    # Target February (28 days) averaged over a 31-day January: the series stops at day 28.
    df = prepare_df([tx("2026-01-31", -310.0, "expense")])
    avg = _average_cumulative_expense(df, [date(2026, 1, 1)], 28)
    assert len(avg) == 28
    assert avg[-1] == 0.0   # January's 310 only lands on day 31


def test_average_cumulative_31_day_month_against_shorter_months():
    # Spending on the last day of each month: 31 (Jan), 28 (Feb), 30 (Apr).
    df = prepare_df([
        tx("2026-01-31", -310.0, "expense"),
        tx("2026-02-28", -280.0, "expense"),
        tx("2026-04-30", -300.0, "expense"),
    ])
    months = [date(2026, 1, 1), date(2026, 2, 1), date(2026, 4, 1)]
    avg = _average_cumulative_expense(df, months, 31)
    assert len(avg) == 31
    assert avg[27] == round((0 + 280 + 0) / 3, 2)    # day 28: all three contribute
    assert avg[28] == 0.0                              # day 29: Jan and Apr (Feb is too short)
    assert avg[29] == 150.0                            # day 30: Jan (0) and Apr (300)
    assert avg[30] == 310.0                            # day 31: only January


def test_average_cumulative_month_without_transactions_counts_as_zero():
    # December had spending, January none but it is after the first transaction: counts as zero.
    df = prepare_df([tx("2025-12-05", -200.0, "expense")])
    months = [date(2025, 12, 1), date(2026, 1, 1)]
    avg = _average_cumulative_expense(df, months, 31)
    assert avg[4] == 100.0
    assert avg[30] == 100.0


# ================================================================================================
#                                   Six-month average totals
# ================================================================================================

def test_six_month_average_none_without_history():
    assert _calculate_six_month_average(empty_df(), []) is None


def test_six_month_average_uses_same_definitions_as_totals():
    df = prepare_df([
        # December: income 1000, expense 200, saving 100, investment 50
        tx("2025-12-01", 1000.0, "income", "Salary"),
        tx("2025-12-05", -200.0, "expense", "Food"),
        tx("2025-12-06", -100.0, "saving", "Fund"),
        tx("2025-12-07", -50.0, "investment", "Stocks"),
        # January: income 3000, expense 600, nothing else
        tx("2026-01-01", 3000.0, "income", "Salary"),
        tx("2026-01-05", -600.0, "expense", "Food"),
    ])
    months = [date(2025, 12, 1), date(2026, 1, 1)]
    avg = _calculate_six_month_average(df, months)
    assert avg is not None
    assert avg.months_counted == 2
    assert avg.income == 2000.0
    assert avg.expense == 400.0
    assert avg.saving == 50.0
    assert avg.investment == 25.0
    # profit = income - expense - investment, net cash flow = profit - saving, per month then averaged
    dec = _calculate_summary_totals(_month_rows(df, months[0]))
    jan = _calculate_summary_totals(_month_rows(df, months[1]))
    assert avg.profit == round((dec.profit + jan.profit) / 2, 2)
    assert avg.net_cash_flow == round((dec.net_cash_flow + jan.net_cash_flow) / 2, 2)


def test_six_month_average_fewer_than_six_months_of_history():
    df = prepare_df([
        tx("2026-01-10", 100.0, "income"),
        tx("2026-02-10", 300.0, "income"),
    ])
    window = _months_with_history(_average_window_months(date(2026, 3, 1)), date(2026, 1, 10))
    assert window == [date(2026, 1, 1), date(2026, 2, 1)]
    avg = _calculate_six_month_average(df, window)
    assert avg is not None
    assert avg.months_counted == 2
    assert avg.income == 200.0


def test_six_month_average_empty_month_inside_history_counts_as_zero():
    df = prepare_df([tx("2025-12-10", 600.0, "income")])
    avg = _calculate_six_month_average(df, [date(2025, 12, 1), date(2026, 1, 1), date(2026, 2, 1)])
    assert avg is not None
    assert avg.months_counted == 3
    assert avg.income == 200.0


# ================================================================================================
#                                   Expense categories
# ================================================================================================

def test_expense_categories_sorted_with_shares_and_no_limit():
    rows = [tx("2026-01-01", -10.0 * (i + 1), "expense", f"C{i}") for i in range(7)]
    rows.append(tx("2026-01-02", 999.0, "income", "Salary"))
    cats = _get_expense_categories(prepare_df(rows))
    assert len(cats) == 7
    assert [c.name for c in cats][:2] == ["C6", "C5"]
    assert cats[0].total == 70.0
    assert sum(c.share_of_total for c in cats) == pytest.approx(100.0, abs=0.5)


def test_expense_categories_empty():
    assert _get_expense_categories(empty_df()) == []
    assert _get_expense_categories(prepare_df([tx("2026-01-01", 5.0, "income")])) == []


# ================================================================================================
#                                   End to end (pure)
# ================================================================================================

def test_enriched_summary_current_month_series_stops_today():
    df = prepare_df([
        tx("2026-03-01", -100.0, "expense", "Food"),
        tx("2026-03-03", -50.0, "expense", "Food"),
        tx("2026-03-15", -999.0, "expense", "Future"),  # dated after "today"
        tx("2026-02-10", -280.0, "expense", "Food"),
        tx("2026-02-01", 1000.0, "income", "Salary"),
    ])
    current = df.filter(pl.col("date") >= "2026-03-01")
    previous = df.filter(pl.col("date") < "2026-03-01")
    summary = _calculate_enriched_summary(
        current, previous,
        history_df=df, target_month=date(2026, 3, 1),
        first_data_date=date(2026, 2, 1), today=date(2026, 3, 4),
    )
    assert summary.daily_cumulative_expense == [100.0, 100.0, 150.0, 150.0]
    assert len(summary.average_daily_cumulative_expense) == 31
    assert summary.average_daily_cumulative_expense[9] == 280.0   # only February counted
    assert summary.six_month_average is not None
    assert summary.six_month_average.months_counted == 1
    assert summary.six_month_average.income == 1000.0
    # The overview's headline must be the existing net cash flow figure.
    assert summary.net_cash_flow == _calculate_summary_totals(current).net_cash_flow


def test_enriched_summary_empty_history():
    summary = _calculate_enriched_summary(
        empty_df(), empty_df(),
        history_df=empty_df(), target_month=date(2026, 3, 1),
        first_data_date=None, today=date(2026, 3, 4),
    )
    assert summary.daily_cumulative_expense == [0.0] * 4
    assert summary.average_daily_cumulative_expense == []
    assert summary.six_month_average is None
    assert summary.expense_categories == []


def test_enriched_summary_without_history_argument_keeps_old_behaviour():
    summary = _calculate_enriched_summary(empty_df(), empty_df())
    assert summary.daily_cumulative_expense == []
    assert summary.six_month_average is None
