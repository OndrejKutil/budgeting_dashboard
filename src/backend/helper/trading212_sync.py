"""
The Trading212 per-user sync, shared verbatim by the manual POST /sync endpoint and the
cron-triggered POST /sync-all endpoint (SPEC.md §5.2: "Manual refresh runs the identical code
path"). Only the Supabase client differs: manual sync gets a user-JWT client (RLS scopes it to
that user's own row automatically), the cron job gets the service-role client so it can write
rows for every connected user in one run.

Per-run sequence (SPEC.md §5.2), calls sequenced never parallel:
  1. decrypt stored credentials
  2. fetch account/cash summary
  3. fetch positions
  4. upsert fct_t212_positions, delete stale rows
  5. insert one fct_t212_value_history row
  6. update last_synced_at / last_sync_status

Partial success is fine -- write what succeeded -- but a failed positions fetch must never
result in a value-history row (SPEC.md §5.2: "or the chart gets a false dip").
"""

import datetime
import logging

from . import trading212_client as t212
from .columns import T212_CONNECTIONS_COLUMNS, T212_POSITIONS_COLUMNS, T212_VALUE_HISTORY_COLUMNS
from .trading212_crypto import T212CredentialsError, decrypt_credentials

logger = logging.getLogger(__name__)

CONNECTIONS_TABLE = "dim_t212_connections"
POSITIONS_TABLE = "fct_t212_positions"
VALUE_HISTORY_TABLE = "fct_t212_value_history"


def _now_iso() -> str:
    return datetime.datetime.now(datetime.UTC).isoformat()


def _update_connection_status(db_client, connection_id: str, status: str, currency: str | None = None) -> None:
    data: dict = {
        T212_CONNECTIONS_COLUMNS.LAST_SYNC_STATUS.value: status,
        T212_CONNECTIONS_COLUMNS.UPDATED_AT.value: _now_iso(),
    }
    if status == "ok":
        data[T212_CONNECTIONS_COLUMNS.LAST_SYNCED_AT.value] = _now_iso()
    if currency is not None:
        data[T212_CONNECTIONS_COLUMNS.ACCOUNT_CURRENCY.value] = currency

    db_client.table(CONNECTIONS_TABLE).update(data).eq(
        T212_CONNECTIONS_COLUMNS.ID_PK.value, connection_id
    ).execute()


def sync_one_connection(db_client, connection: dict) -> str:
    """
    Run the full sync for one already-loaded connection row.

    Returns the resulting status string ("ok" | "auth_failed" | "error"). Never raises --
    a broken single-user sync must not take down a cron run touching many users.
    """
    connection_id = connection[T212_CONNECTIONS_COLUMNS.ID_PK.value]
    user_id = connection[T212_CONNECTIONS_COLUMNS.USER_ID_FK.value]

    try:
        api_key, api_secret = decrypt_credentials(connection[T212_CONNECTIONS_COLUMNS.ENCRYPTED_CREDENTIALS.value])
    except T212CredentialsError:
        _update_connection_status(db_client, connection_id, "error")
        return "error"

    try:
        summary = t212.get_account_summary(api_key, api_secret)
    except t212.T212AuthError:
        logger.warning(f"T212 sync: auth failed for user {user_id}")
        _update_connection_status(db_client, connection_id, "auth_failed")
        return "auth_failed"
    except t212.T212ApiError as e:
        logger.warning(f"T212 sync: account summary fetch failed for user {user_id}: {e}")
        _update_connection_status(db_client, connection_id, "error")
        return "error"

    currency = summary.get("currency")
    total_value = summary.get("totalValue")

    try:
        positions = t212.get_positions(api_key, api_secret)
    except t212.T212ApiError as e:
        # Account summary succeeded but positions didn't -- update the currency we did learn,
        # but write no positions and no value-history row (SPEC.md §5.2: avoids a false dip).
        logger.warning(f"T212 sync: positions fetch failed for user {user_id}: {e}")
        status = "auth_failed" if isinstance(e, t212.T212AuthError) else "error"
        _update_connection_status(db_client, connection_id, status, currency=currency)
        return status

    synced_at = _now_iso()

    # Upsert current positions, then delete whatever ticker rows didn't come back this run.
    position_rows = [
        {
            T212_POSITIONS_COLUMNS.USER_ID_FK.value: user_id,
            T212_POSITIONS_COLUMNS.TICKER.value: p.get("ticker"),
            T212_POSITIONS_COLUMNS.QUANTITY.value: p.get("quantity"),
            T212_POSITIONS_COLUMNS.AVERAGE_PRICE.value: p.get("averagePrice"),
            T212_POSITIONS_COLUMNS.CURRENT_PRICE.value: p.get("currentPrice"),
            T212_POSITIONS_COLUMNS.MARKET_VALUE.value: (p.get("quantity") or 0) * (p.get("currentPrice") or 0),
            T212_POSITIONS_COLUMNS.PPL.value: p.get("ppl"),
            T212_POSITIONS_COLUMNS.SYNCED_AT.value: synced_at,
        }
        for p in positions
    ]

    if position_rows:
        db_client.table(POSITIONS_TABLE).upsert(
            position_rows,
            on_conflict=f"{T212_POSITIONS_COLUMNS.USER_ID_FK.value},{T212_POSITIONS_COLUMNS.TICKER.value}",
        ).execute()

    current_tickers = {p.get("ticker") for p in positions if p.get("ticker")}
    existing = (
        db_client.table(POSITIONS_TABLE)
        .select(f"{T212_POSITIONS_COLUMNS.ID_PK.value},{T212_POSITIONS_COLUMNS.TICKER.value}")
        .eq(T212_POSITIONS_COLUMNS.USER_ID_FK.value, user_id)
        .execute()
    )
    stale_ids = [
        row[T212_POSITIONS_COLUMNS.ID_PK.value]
        for row in (existing.data or [])
        if row[T212_POSITIONS_COLUMNS.TICKER.value] not in current_tickers
    ]
    if stale_ids:
        db_client.table(POSITIONS_TABLE).delete().in_(T212_POSITIONS_COLUMNS.ID_PK.value, stale_ids).execute()

    if total_value is not None:
        db_client.table(VALUE_HISTORY_TABLE).insert({
            T212_VALUE_HISTORY_COLUMNS.USER_ID_FK.value: user_id,
            T212_VALUE_HISTORY_COLUMNS.TOTAL_VALUE.value: total_value,
            T212_VALUE_HISTORY_COLUMNS.SNAPSHOT_AT.value: synced_at,
        }).execute()

    _update_connection_status(db_client, connection_id, "ok", currency=currency)
    return "ok"


def sync_all_connections(service_client) -> dict[str, int]:
    """
    Cron entry point: sync every connected user, sequenced (never parallel -- SPEC.md §5.2).

    Skips connections already marked auth_failed -- a dead key doesn't get retried every 30
    minutes until the user reconnects (which creates a fresh row via POST /connection). This
    skip is cron-only; the manual /sync endpoint always attempts, since a user clicking refresh
    is explicit evidence they may have just fixed something.
    """
    response = (
        service_client.table(CONNECTIONS_TABLE)
        .select("*")
        .neq(T212_CONNECTIONS_COLUMNS.LAST_SYNC_STATUS.value, "auth_failed")
        .execute()
    )

    results = {"ok": 0, "auth_failed": 0, "error": 0}
    for connection in response.data or []:
        status = sync_one_connection(service_client, connection)
        results[status] = results.get(status, 0) + 1

    logger.info(f"T212 cron sync complete: {results}")
    return results
