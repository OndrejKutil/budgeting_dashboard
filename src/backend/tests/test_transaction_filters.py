"""
Unit tests for the transaction filter builder.

`apply_common_filters` is the single place where the UI's filter pickers turn into
PostgREST conditions, and it is shared by both the list and the summary endpoint — a
mistake here silently returns the wrong rows rather than failing. Multi-value support
made it intricate enough (comma splitting, IN vs or-groups, NULL handling, month
expansion) to be worth pinning down without a live database.

The fake below records the calls a real postgrest query builder would receive.
"""

import os
import sys
from datetime import date

import pytest
from fastapi import HTTPException

# Add 'src' to sys.path so 'backend' imports as a package — the helper uses relative
# imports, same reason test_features.py does this.
current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.abspath(os.path.join(current_dir, "../../"))
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from backend.helper.transaction_filters import apply_common_filters, split_csv  # noqa: E402


class FakeParams:
    """Stands in for httpx.QueryParams — only `add`, and only ever for `or`."""

    def __init__(self, pairs: tuple[tuple[str, str], ...] = ()) -> None:
        self.pairs = pairs

    def add(self, key: str, value: str) -> "FakeParams":
        return FakeParams(self.pairs + ((key, value),))


class FakeQuery:
    """Records filter calls instead of issuing them."""

    def __init__(self) -> None:
        self.calls: list[tuple] = []
        self.params = FakeParams()

    def _record(self, name):
        def call(*args):
            self.calls.append((name, *args))
            return self

        return call

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self._record(name)

    @property
    def or_groups(self) -> list[str]:
        return [value for key, value in self.params.pairs if key == "or"]


def apply(**overrides):
    """Run the builder with everything off except what the test sets."""
    defaults = dict(
        start_date=None, end_date=None, category_id=None, account_id=None,
        savings_fund_id=None, category_type=None, min_amount=None, max_amount=None,
        search=None, tag_id=None, months=None,
    )
    query = FakeQuery()
    apply_common_filters(query, **{**defaults, **overrides})
    return query


# ================================================================================================
#                                   split_csv
# ================================================================================================

@pytest.mark.parametrize("value,expected", [
    (None, []),
    ("", []),
    ("a", ["a"]),
    ("a,b", ["a", "b"]),
    (" a , b ", ["a", "b"]),
    ("a,,b", ["a", "b"]),
    (",", []),
])
def test_split_csv(value, expected):
    assert split_csv(value) == expected


# ================================================================================================
#                                   Plain multi-value filters
# ================================================================================================

def test_single_value_still_uses_in():
    """One selection is just a one-element IN — no separate code path to drift."""
    assert ("in_", "account_id_fk", ["abc"]) in apply(account_id="abc").calls


def test_multiple_accounts():
    assert ("in_", "account_id_fk", ["a", "b"]) in apply(account_id="a,b").calls


def test_multiple_categories_and_types_and_tags():
    calls = apply(category_id="1,2", category_type="income,expense", tag_id="7,8").calls
    assert ("in_", "category_id_fk", ["1", "2"]) in calls
    assert ("in_", "dim_categories_users.type", ["income", "expense"]) in calls
    assert ("in_", "fct_transaction_tags.tag_id_fk", ["7", "8"]) in calls


def test_empty_filters_add_nothing():
    assert apply().calls == []
    assert apply().or_groups == []


# ================================================================================================
#                                   Savings fund / NULL handling
# ================================================================================================

def test_fund_none_alone_is_null_check():
    assert ("is_", "savings_fund_id_fk", "null") in apply(savings_fund_id="none").calls


def test_fund_ids_only_use_in():
    assert ("in_", "savings_fund_id_fk", ["f1", "f2"]) in apply(savings_fund_id="f1,f2").calls


def test_fund_none_mixed_with_ids_uses_or_group():
    """IN never matches NULL, so 'unassigned + these funds' has to become an or-group."""
    query = apply(savings_fund_id="none,f1")
    assert query.or_groups == ["(savings_fund_id_fk.is.null,savings_fund_id_fk.in.(f1))"]
    assert query.calls == []


# ================================================================================================
#                                   Months
# ================================================================================================

def test_single_month_expands_to_full_span():
    assert apply(months="2026-02").or_groups == [
        "(and(date.gte.2026-02-01,date.lte.2026-02-28))"
    ]


def test_leap_february():
    assert "date.lte.2024-02-29" in apply(months="2024-02").or_groups[0]


def test_disjoint_months_are_separate_ranges():
    """Jan + Mar is two spans, not Jan-through-Mar — the point of the whole clause."""
    group = apply(months="2026-01,2026-03").or_groups[0]
    assert group == (
        "(and(date.gte.2026-01-01,date.lte.2026-01-31),"
        "and(date.gte.2026-03-01,date.lte.2026-03-31))"
    )


def test_months_can_cross_a_year():
    """What the "last 3 months" preset produces in January — each month carries its year."""
    assert apply(months="2025-11,2025-12,2026-01").or_groups[0] == (
        "(and(date.gte.2025-11-01,date.lte.2025-11-30),"
        "and(date.gte.2025-12-01,date.lte.2025-12-31),"
        "and(date.gte.2026-01-01,date.lte.2026-01-31))"
    )


@pytest.mark.parametrize("bad", ["2026", "2026-13", "not-a-month", "2026-1-1"])
def test_malformed_month_is_rejected(bad):
    with pytest.raises(HTTPException) as excinfo:
        apply(months=bad)
    assert excinfo.value.status_code == 422


# ================================================================================================
#                                   Combinations
# ================================================================================================

def test_month_and_fund_or_groups_coexist():
    """
    Two or-groups on one request is the case that forced the manual params.add — PostgREST
    ANDs separate groups, so this must stay two entries rather than one merged clause.
    """
    query = apply(months="2026-01", savings_fund_id="none,f1")
    assert len(query.or_groups) == 2


def test_date_bounds_still_applied_alongside_months():
    query = apply(start_date=date(2026, 1, 1), end_date=date(2026, 12, 31), months="2026-05")
    assert ("gte", "date", "2026-01-01") in query.calls
    assert ("lte", "date", "2026-12-31") in query.calls
    assert len(query.or_groups) == 1


def test_scalar_filters_are_untouched_by_multi_support():
    query = apply(min_amount=10.0, max_amount=20.0, search="coffee")
    assert ("gte", "amount", 10.0) in query.calls
    assert ("lte", "amount", 20.0) in query.calls
    assert ("ilike", "notes", "%coffee%") in query.calls
