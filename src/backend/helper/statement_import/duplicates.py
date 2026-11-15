"""
Which file rows are already in the ledger.

Compared as a multiset on (date, amount): two identical rows in the file against one in the
ledger marks exactly one of them as a duplicate. This catches a second import of an overlapping
period and rows typed by hand. A hand-typed row dated on the booking day instead of the payment
day is missed; accepted (spec 5.5).
"""

from __future__ import annotations

import datetime
from collections import Counter
from collections.abc import Iterable
from decimal import Decimal

from ..columns import TRANSACTIONS_COLUMNS
from .normalize import NormalizedRow

_FETCH_PAGE_SIZE = 1000
_CENT = Decimal("0.01")

Key = tuple[datetime.date, Decimal]


def _key(date: datetime.date | str, amount: object) -> Key:
    day = date if isinstance(date, datetime.date) else datetime.date.fromisoformat(str(date)[:10])
    return day, Decimal(str(amount)).quantize(_CENT)


def mark_duplicates(rows: list[NormalizedRow], existing: Iterable[tuple[object, object]]) -> set[int]:
    """
    Indexes (into `rows`) of the rows already present in `existing` ((date, amount) pairs).
    Rows with an error never count. Earlier rows in the file are matched first.
    """
    remaining: Counter[Key] = Counter(_key(d, a) for d, a in existing)  # type: ignore[arg-type]
    duplicates: set[int] = set()
    for i, row in enumerate(rows):
        if row.error is not None or row.date is None or row.amount is None:
            continue
        key = _key(row.date, row.amount)
        if remaining[key] > 0:
            remaining[key] -= 1
            duplicates.add(i)
    return duplicates


def fetch_existing(client, account_id: str, date_from: datetime.date, date_to: datetime.date) -> list[tuple[str, object]]:
    """(date, amount) of the account's transactions in [date_from, date_to], all pages."""
    query = (
        client.table("fct_transactions")
        .select(f"{TRANSACTIONS_COLUMNS.ID.value},{TRANSACTIONS_COLUMNS.DATE.value},{TRANSACTIONS_COLUMNS.AMOUNT.value}")
        .eq(TRANSACTIONS_COLUMNS.ACCOUNT_ID.value, account_id)
        .gte(TRANSACTIONS_COLUMNS.DATE.value, date_from.isoformat())
        .lte(TRANSACTIONS_COLUMNS.DATE.value, date_to.isoformat())
        .order(TRANSACTIONS_COLUMNS.DATE.value)
        .order(TRANSACTIONS_COLUMNS.ID.value)
    )
    result: list[tuple[str, object]] = []
    offset = 0
    while True:
        # postgrest 0.10.8 treats the end of range() as exclusive (see summary_calc.py).
        batch = query.range(offset, offset + _FETCH_PAGE_SIZE).execute().data or []
        result.extend((r[TRANSACTIONS_COLUMNS.DATE.value], r[TRANSACTIONS_COLUMNS.AMOUNT.value]) for r in batch)
        if len(batch) < _FETCH_PAGE_SIZE:
            break
        offset += _FETCH_PAGE_SIZE
    return result
