"""
The optional "Starting balance" transaction added at commit (spec section 6).

Balances are the sum of an account's transactions, and a bank export has no opening balance, so
after importing six months the account would show only those months' net movement. When the
user states the balance after the file's last row, one adjustment transaction makes up the
difference. It goes to an exclude-type category, so it counts toward the balance but stays out
of income and spending -- the same way in-app transfers are treated.
"""

from __future__ import annotations

import datetime
from decimal import Decimal

STARTING_BALANCE_NAME = "Starting Balance"
STARTING_BALANCE_NOTE = "Starting balance"
EXCLUDE_TYPE = "exclude"


def balance_adjustment(stated_balance: Decimal, balance_before: Decimal, imported_sum: Decimal) -> Decimal:
    """stated balance - (account balance before the import + sum of the imported rows)."""
    return stated_balance - (balance_before + imported_sum)


def fund_opening(stated_balance: Decimal, fund_before: Decimal) -> Decimal:
    """
    What a savings fund needs to reach its stated balance: stated balance - the fund's balance in
    the ledger up to the file's last day. (Imported rows never touch funds: transfers between the
    user's own accounts are not imported -- see spec section 13.)

    A fund's balance is minus the sum of its transactions, so the opening is booked as one
    transaction of -opening tagged with the fund, and the account gets +opening back in its
    "Starting balance" row: the fund grows, the account balance doesn't move.
    """
    return stated_balance - fund_before


def adjustment_date(first_imported: datetime.date) -> datetime.date:
    """The day before the first imported row, so the adjustment sorts before everything it explains."""
    return first_imported - datetime.timedelta(days=1)


def pick_starting_balance_category(categories: list[dict]) -> int | None:
    """
    Lookup order: an active category named "Starting Balance" of type exclude; then any active
    exclude-type category. None means one has to be created. `categories` are rows of
    dim_categories_users (categories_id_pk, category_name, type, is_active).
    """
    active_exclude = [
        c for c in categories
        if c.get("type") == EXCLUDE_TYPE and c.get("is_active") is not False
    ]
    for c in active_exclude:
        if str(c.get("category_name", "")).strip().casefold() == STARTING_BALANCE_NAME.casefold():
            return int(c["categories_id_pk"])
    if active_exclude:
        return int(active_exclude[0]["categories_id_pk"])
    return None
