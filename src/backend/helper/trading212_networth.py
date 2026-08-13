"""
The one cross-cutting piece of the Trading212 integration (SPEC.md §7): folding the latest
synced portfolio value into the net-worth headline without touching the transaction-derived
timeline itself.

Kept out of routers/net_worth.py for the same reason helper/features.py is separate from
routers/features.py -- a pure(ish) function that's easy to unit test, and easy to reason about
as "never raises" without wading through the endpoint's own error handling.
"""

import datetime
import logging

from .columns import T212_VALUE_HISTORY_COLUMNS
from .features import is_feature_enabled

logger = logging.getLogger(__name__)

VALUE_HISTORY_TABLE = "fct_t212_value_history"

FEATURE_KEY = "t212_integration"

# SPEC.md §7 "Staleness": stale once older than ~2x the 30-minute cron cadence.
STALE_AFTER_MINUTES = 60


def _parse_timestamp(value: str) -> datetime.datetime:
    # Postgres timestamptz comes back as an ISO string; Python's fromisoformat wants "+00:00"
    # rather than a trailing "Z".
    return datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))


def get_t212_net_worth_contribution(db_client, access_token: str, base_currency: str):
    """
    The latest synced portfolio value, converted to base_currency, or None.

    None covers every case where there's nothing meaningful to add: the feature flag is off, no
    connection exists, or nothing has synced yet. Never raises -- a broken integration must not
    500 the net-worth endpoint (SPEC.md §7), same principle as is_feature_enabled.
    """
    from ..schemas.base import InvestmentContribution  # local import: schemas -> nothing back-imports helper

    try:
        if not is_feature_enabled(access_token, FEATURE_KEY):
            return None

        history_response = (
            db_client.table(VALUE_HISTORY_TABLE)
            .select(
                f"{T212_VALUE_HISTORY_COLUMNS.TOTAL_VALUE.value},"
                f"{T212_VALUE_HISTORY_COLUMNS.CURRENCY.value},"
                f"{T212_VALUE_HISTORY_COLUMNS.SNAPSHOT_AT.value}"
            )
            .order(T212_VALUE_HISTORY_COLUMNS.SNAPSHOT_AT.value, desc=True)
            .limit(1)
            .execute()
        )
        if not history_response.data:
            return None

        latest = history_response.data[0]
        total_value = float(latest[T212_VALUE_HISTORY_COLUMNS.TOTAL_VALUE.value])
        # Stored in the account's own currency at snapshot time, converted at read time
        # (SPEC.md §3) -- using this row's own currency rather than today's connection
        # currency, in case the two ever diverge.
        row_currency = latest.get(T212_VALUE_HISTORY_COLUMNS.CURRENCY.value)
        snapshot_at_raw = latest[T212_VALUE_HISTORY_COLUMNS.SNAPSHOT_AT.value]

        if row_currency and row_currency != base_currency:
            from .exchange_rates import get_rate
            total_value *= get_rate(row_currency, base_currency)

        snapshot_at = _parse_timestamp(snapshot_at_raw)
        age = datetime.datetime.now(datetime.UTC) - snapshot_at
        is_stale = age > datetime.timedelta(minutes=STALE_AFTER_MINUTES)

        return InvestmentContribution(
            total_value=round(total_value, 2),
            synced_at=snapshot_at_raw,
            is_stale=is_stale,
        )

    except Exception as e:
        logger.error("Failed to compute Trading212 net-worth contribution; treating as unavailable")
        logger.info(f"Error: {str(e)}")
        return None
