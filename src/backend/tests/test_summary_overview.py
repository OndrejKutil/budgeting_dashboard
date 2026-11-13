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
    _fetch_first_transaction_date,
    _fetch_summary_transactions,
    _get_expense_categories,
    _get_previous_period_dates,
    _is_whole_month,
    _month_rows,
    _months_with_history,
    _summary_calc,
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


def test_average_window_december_to_january_rollover():
    assert _average_window_months(date(2027, 1, 20)) == [
        date(2026, 7, 1), date(2026, 8, 1), date(2026, 9, 1),
        date(2026, 10, 1), date(2026, 11, 1), date(2026, 12, 1),
    ]
    assert _average_window_months(date(2026, 12, 1))[0] == date(2026, 6, 1)


def test_average_window_with_leap_february():
    # Target Aug 2028: window Feb-Jul 2028, February has 29 days.
    window = _average_window_months(date(2028, 8, 1))
    assert window[0] == date(2028, 2, 1)
    df = prepare_df([tx("2028-02-29", -90.0, "expense"), tx("2028-03-31", -10.0, "expense")])
    series = _cumulative_expense_by_day(df, date(2028, 2, 1))
    assert len(series) == 29 and series[-1] == 90.0
    assert _months_with_history(window, date(2028, 2, 29))[0] == date(2028, 2, 1)
    assert _months_with_history(window, date(2028, 3, 1))[0] == date(2028, 3, 1)


def test_is_whole_month():
    assert _is_whole_month(date(2026, 2, 1), date(2026, 2, 28))
    assert _is_whole_month(date(2028, 2, 1), date(2028, 2, 29))
    assert not _is_whole_month(date(2028, 2, 1), date(2028, 2, 28))
    assert not _is_whole_month(date(2026, 3, 5), date(2026, 3, 31))      # mid-month start
    assert not _is_whole_month(date(2026, 1, 1), date(2026, 2, 28))      # multi-month


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


def test_average_cumulative_short_months_are_padded_with_their_final_value():
    # Spending on the last day of each month: Jan 310 (31 days), Feb 280 (28), Apr 300 (30).
    df = prepare_df([
        tx("2026-01-31", -310.0, "expense"),
        tx("2026-02-28", -280.0, "expense"),
        tx("2026-04-30", -300.0, "expense"),
    ])
    months = [date(2026, 1, 1), date(2026, 2, 1), date(2026, 4, 1)]
    avg = _average_cumulative_expense(df, months, 31)
    assert len(avg) == 31
    assert avg[27] == round(280 / 3, 2)               # day 28: only February has spent yet
    assert avg[28] == round(280 / 3, 2)               # day 29: February is padded, others still 0
    assert avg[29] == round((280 + 300) / 3, 2)       # day 30: April spent
    assert avg[30] == round((310 + 280 + 300) / 3, 2)  # day 31: everyone done
    assert all(y >= x for x, y in zip(avg, avg[1:], strict=False))   # never decreases


def test_average_cumulative_last_value_equals_six_month_average_expense():
    # Target Dec 2026, window Jun-Nov, one 100 expense on each month's last day.
    rows = [tx(f"2026-{m:02d}-{d}", -100.0, "expense") for m, d in
            [(6, 30), (7, 31), (8, 31), (9, 30), (10, 31), (11, 30)]]
    df = prepare_df(rows)
    window = _average_window_months(date(2026, 12, 1))
    avg = _average_cumulative_expense(df, window, 31)
    average = _calculate_six_month_average(df, window)
    assert average is not None
    assert avg[-1] == average.expense == 100.0
    assert all(y >= x for x, y in zip(avg, avg[1:], strict=False))


def test_average_cumulative_target_month_shorter_than_history_months():
    # Target February (28 days): a 31-day month is cut at day 28.
    df = prepare_df([tx("2026-01-31", -310.0, "expense")])
    avg = _average_cumulative_expense(df, [date(2026, 1, 1)], 28)
    assert len(avg) == 28
    assert avg[-1] == 0.0


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


# ================================================================================================
#                                   Paging of the fetch
# ================================================================================================

class FakeQuery:
    """Query builder double with postgrest 0.10.8 range semantics: range(a, b) returns rows a..b-1."""

    def __init__(self, rows):
        self.rows = rows
        self.ranges = []
        self._range = None
        self._limit = None

    def select(self, *a, **k):
        return self

    def gte(self, *a, **k):
        return self

    def lte(self, *a, **k):
        return self

    def order(self, *a, **k):
        return self

    def limit(self, n):
        self._limit = n
        return self

    def range(self, start, end):
        self._range = (start, end)
        self.ranges.append((start, end))
        return self

    def execute(self):
        rows = self.rows
        if self._range is not None:
            start, end = self._range
            rows = rows[start:end]
        if self._limit is not None:
            rows = rows[: self._limit]

        class Response:
            data = rows

        return Response()


class FakeClient:
    def __init__(self, rows):
        self.query = FakeQuery(rows)

    def table(self, name):
        return self.query


@pytest.mark.parametrize("count", [0, 1, 999, 1000, 1001, 2000, 2345])
def test_fetch_summary_transactions_pages_through_all_rows(monkeypatch, count):
    rows = [{"id_pk": i} for i in range(count)]
    client = FakeClient(rows)
    monkeypatch.setattr("backend.data.database.get_db_client", lambda token: client)
    fetched = _fetch_summary_transactions("token", date(2026, 1, 1), date(2026, 3, 31))
    assert fetched == rows                      # every row once, in order
    assert len(client.query.ranges) == count // 1000 + 1   # terminates after the short/empty page


def test_fetch_first_transaction_date(monkeypatch):
    monkeypatch.setattr("backend.data.database.get_db_client", lambda token: FakeClient([]))
    assert _fetch_first_transaction_date("token") is None
    monkeypatch.setattr(
        "backend.data.database.get_db_client", lambda token: FakeClient([{"date": "2025-03-14"}])
    )
    assert _fetch_first_transaction_date("token") == date(2025, 3, 14)


# ================================================================================================
#                                   _summary_calc end to end (mocked fetch)
# ================================================================================================

def _patch_fetch(monkeypatch, rows, first_date):
    calls: dict = {}

    def fake_fetch(token, start, end):
        calls["range"] = (start, end)
        return [r for r in rows if start.isoformat() <= r["date"] <= end.isoformat()]

    def fake_first(token):
        calls["first"] = True
        return first_date

    monkeypatch.setattr("backend.helper.calculations.summary_calc._fetch_summary_transactions", fake_fetch)
    monkeypatch.setattr("backend.helper.calculations.summary_calc._fetch_first_transaction_date", fake_first)
    return calls


def test_summary_calc_existing_fields_ignore_the_wider_fetch(monkeypatch):
    rows = [
        tx("2026-03-10", 1000.0, "income", "Salary"),
        tx("2026-03-11", -200.0, "expense", "Food"),
        tx("2026-02-10", 500.0, "income", "Salary"),         # previous period
        tx("2026-02-12", -100.0, "expense", "Food"),
        tx("2025-12-10", 99999.0, "income", "Salary"),       # in the six-month window only
        tx("2025-12-11", -77777.0, "expense", "Rent"),
        tx("2026-04-02", -5555.0, "expense", "Later"),        # after the period
    ]
    calls = _patch_fetch(monkeypatch, rows, date(2025, 12, 10))
    result = _summary_calc("token", date(2026, 3, 1), date(2026, 3, 31), "CZK")
    assert calls["range"] == (date(2025, 9, 1), date(2026, 3, 31))
    assert result.total_income == 1000.0
    assert result.total_expense == 200.0
    assert result.comparison.income_delta == 500.0       # vs February only
    assert result.comparison.expense_delta == 100.0
    assert [c.name for c in result.expense_categories] == ["Food"]
    assert result.expense_categories[0].total == 200.0
    assert result.six_month_average is not None
    assert result.six_month_average.months_counted == 3   # Dec, Jan, Feb (history starts Dec 10)
    assert len(result.average_daily_cumulative_expense) == 31


@pytest.mark.parametrize("start,end", [
    (date(2026, 3, 5), date(2026, 3, 31)),     # mid-month start
    (date(2026, 1, 1), date(2026, 3, 31)),     # multi-month range
])
def test_summary_calc_non_whole_month_has_no_pace_or_average(monkeypatch, start, end):
    rows = [tx("2026-03-10", -50.0, "expense"), tx("2025-10-10", -70.0, "expense")]
    calls = _patch_fetch(monkeypatch, rows, date(2025, 10, 10))
    result = _summary_calc("token", start, end, "CZK")
    assert result.daily_cumulative_expense == []
    assert result.average_daily_cumulative_expense == []
    assert result.six_month_average is None
    assert "first" not in calls                              # no extra query
    assert calls["range"][0] == _get_previous_period_dates(start, end)[0]   # no six-month fetch
    assert result.total_expense == 50.0
