import logging
from datetime import date, timedelta
from typing import Optional

import polars as pl

from ..columns import TRANSACTIONS_COLUMNS, ACCOUNTS_COLUMNS

logger = logging.getLogger(__name__)


def calculate_net_worth_timeline(
    db_client,
    end_date: date,
    base_currency: str,
    start_date: Optional[date] = None,
) -> dict:
    """
    Reconstruct daily net-worth from fct_transactions, converted to base_currency.

    When start_date is None, the range begins at the date of the earliest transaction
    (i.e. full history mode).  All transactions up to end_date are always fetched so
    the cumulative balance is accurate regardless of the display window.
    """
    tx_resp = db_client.table("fct_transactions").select(
        f"{TRANSACTIONS_COLUMNS.ACCOUNT_ID.value},"
        f"{TRANSACTIONS_COLUMNS.AMOUNT.value},"
        f"{TRANSACTIONS_COLUMNS.DATE.value},"
        f"{TRANSACTIONS_COLUMNS.SAVINGS_FUND_ID.value}"
    ).lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat()).execute()

    acct_resp = db_client.table("dim_accounts").select(
        f"{ACCOUNTS_COLUMNS.ID.value},{ACCOUNTS_COLUMNS.CURRENCY.value}"
    ).execute()

    resolved_start = start_date  # may still be None; resolved below after we have data

    if not tx_resp.data:
        effective_start = resolved_start or end_date
        days = (end_date - effective_start).days + 1
        dates = [(effective_start + timedelta(days=i)).isoformat() for i in range(days)]
        return {"dates": dates, "net_worth": [0.0] * days, "base_currency": base_currency}

    account_currency: dict[str, str] = {
        row[ACCOUNTS_COLUMNS.ID.value]: row[ACCOUNTS_COLUMNS.CURRENCY.value] or base_currency
        for row in (acct_resp.data or [])
    }

    from ..exchange_rates import get_rate

    df = pl.from_dicts(tx_resp.data).with_columns(
        pl.col(TRANSACTIONS_COLUMNS.DATE.value).str.to_date().alias(TRANSACTIONS_COLUMNS.DATE.value)
    )

    # Savings-fund transactions are internal transfers (account outflow ↔ fund balance).
    # Including them double-subtracts their value: account balance is already reduced by
    # the contribution, so summing them again deflates net worth by the full fund total.
    df = df.filter(pl.col(TRANSACTIONS_COLUMNS.SAVINGS_FUND_ID.value).is_null())

    # Auto-detect start from earliest transaction when no explicit start given
    if resolved_start is None:
        min_val = df[TRANSACTIONS_COLUMNS.DATE.value].min()
        resolved_start = min_val if isinstance(min_val, date) else end_date

    def convert_row(amount: float, account_id: str) -> float:
        currency = account_currency.get(account_id, base_currency)
        if currency == base_currency:
            return amount
        try:
            return amount * get_rate(currency, base_currency)
        except Exception:
            return amount

    converted_amounts = [
        convert_row(row[TRANSACTIONS_COLUMNS.AMOUNT.value], row[TRANSACTIONS_COLUMNS.ACCOUNT_ID.value])
        for row in df.iter_rows(named=True)
    ]
    df = df.with_columns(pl.Series("converted_amount", converted_amounts))

    daily = (
        df.group_by(TRANSACTIONS_COLUMNS.DATE.value)
        .agg(pl.col("converted_amount").sum().alias("delta"))
        .sort(TRANSACTIONS_COLUMNS.DATE.value)
    )
    daily = daily.with_columns(pl.col("delta").cum_sum().alias("cumulative"))

    all_dates = pl.DataFrame({
        TRANSACTIONS_COLUMNS.DATE.value: pl.date_range(resolved_start, end_date, interval="1d", eager=True)
    })

    merged = all_dates.join(daily, on=TRANSACTIONS_COLUMNS.DATE.value, how="left")

    # Baseline = cumulative balance strictly before resolved_start
    pre_start = daily.filter(pl.col(TRANSACTIONS_COLUMNS.DATE.value) < resolved_start)
    last_val = pre_start["cumulative"].last() if not pre_start.is_empty() else None
    baseline = float(last_val) if last_val is not None else 0.0

    result_net_worth: list[float] = []
    running = baseline
    for row in merged.iter_rows(named=True):
        delta = row["delta"]
        if delta is not None:
            running += delta
        result_net_worth.append(round(running, 2))

    days = (end_date - resolved_start).days + 1
    result_dates = [(resolved_start + timedelta(days=i)).isoformat() for i in range(days)]

    return {
        "dates": result_dates,
        "net_worth": result_net_worth,
        "base_currency": base_currency,
    }
