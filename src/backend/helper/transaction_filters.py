"""
Turn the transactions page's filter params into PostgREST conditions.

This lives here rather than in the router because it is the single place both
`GET /transactions/` and `GET /transactions/summary` decide *which rows count* — if the
two ever drift, the list and the total shown above it silently disagree. Keeping it pure
(a query builder in, the same builder out) also keeps it testable without a database.
"""

import calendar
from datetime import date

import fastapi
from fastapi import status

from .columns import TRANSACTIONS_COLUMNS


def split_csv(value: str | None) -> list[str]:
    """
    Split a multi-value filter param.

    The picker filters (category, account, fund, type, tag, month) each send their
    selection as one comma-separated param rather than a repeated one, because the
    frontend mirrors every filter into the URL and session storage as a single string. A
    lone value parses to a one-element list, so single selections need no special case.
    """
    if not value:
        return []
    return [part for part in (piece.strip() for piece in value.split(",")) if part]


def add_or_group(query, clause: str):
    """
    Attach a PostgREST `or=(...)` group to a query.

    supabase 1.0.4 pins a postgrest-py that predates `.or_()`, so the param is set by
    hand. httpx's QueryParams.add appends rather than replaces, which matters: the month
    and savings-fund filters can both need an or-group on the same request, and PostgREST
    ANDs separate groups together — exactly the semantics we want between two filters.
    """
    query.params = query.params.add("or", f"({clause})")
    return query


def month_or_clause(months: list[str]) -> str:
    """
    Build the or-group matching any of `months`, each given as `YYYY-MM`.

    A set of months is not a date range — Jan + Mar is two disjoint spans — so this
    expands to one `and(date.gte.first,date.lte.last)` per month. Each month carries its
    own year, so the clause never has to be read together with the start/end date bounds.
    """
    parts = []
    for token in months:
        try:
            year_text, month_text = token.split("-")
            year, month = int(year_text), int(month_text)
            last_day = calendar.monthrange(year, month)[1]
        except (ValueError, calendar.IllegalMonthError) as exc:
            raise fastapi.HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid month filter '{token}', expected YYYY-MM",
            ) from exc
        column = TRANSACTIONS_COLUMNS.DATE.value
        parts.append(
            f"and({column}.gte.{year:04d}-{month:02d}-01,"
            f"{column}.lte.{year:04d}-{month:02d}-{last_day:02d})"
        )
    return ",".join(parts)


def apply_common_filters(
    query,
    start_date: date | None = None,
    end_date: date | None = None,
    category_id: str | None = None,
    account_id: str | None = None,
    savings_fund_id: str | None = None,
    category_type: str | None = None,
    min_amount: float | None = None,
    max_amount: float | None = None,
    search: str | None = None,
    tag_id: str | None = None,
    months: str | None = None,
):
    """Apply all shared filter conditions to a query builder."""
    if start_date:
        query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
    if end_date:
        query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
    if month_list := split_csv(months):
        query = add_or_group(query, month_or_clause(month_list))
    if category_ids := split_csv(category_id):
        query = query.in_(TRANSACTIONS_COLUMNS.CATEGORY_ID.value, category_ids)
    if account_ids := split_csv(account_id):
        query = query.in_(TRANSACTIONS_COLUMNS.ACCOUNT_ID.value, account_ids)
    if fund_ids := split_csv(savings_fund_id):
        # "none" is the sentinel for unassigned. IN never matches NULL, so combining it
        # with real fund ids needs an or-group rather than a single condition.
        column = TRANSACTIONS_COLUMNS.SAVINGS_FUND_ID.value
        unassigned = any(fund.lower() == "none" for fund in fund_ids)
        assigned = [fund for fund in fund_ids if fund.lower() != "none"]
        if unassigned and assigned:
            query = add_or_group(query, f"{column}.is.null,{column}.in.({','.join(assigned)})")
        elif unassigned:
            query = query.is_(column, "null")
        else:
            query = query.in_(column, assigned)
    if category_types := split_csv(category_type):
        query = query.in_("dim_categories_users.type", category_types)
    if min_amount is not None:
        query = query.gte(TRANSACTIONS_COLUMNS.AMOUNT.value, min_amount)
    if max_amount is not None:
        query = query.lte(TRANSACTIONS_COLUMNS.AMOUNT.value, max_amount)
    if search:
        query = query.ilike(TRANSACTIONS_COLUMNS.NOTES.value, f"%{search}%")
    if tag_ids := split_csv(tag_id):
        query = query.in_("fct_transaction_tags.tag_id_fk", tag_ids)
    return query
