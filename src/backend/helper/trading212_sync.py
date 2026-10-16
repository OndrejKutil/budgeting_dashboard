"""
The Trading212 per-user sync, shared verbatim by the manual POST /sync endpoint and the
cron-triggered POST /sync-all endpoint -- manual refresh runs the identical code path. Only
the Supabase client differs: manual sync gets a user-JWT client (RLS scopes it to that user's
own row automatically), the cron job gets the service-role client so it can write rows for
every connected user in one run.

Per-run sequence, calls sequenced never parallel:
  1. decrypt stored credentials
  2. fetch account/cash summary
  3. fetch positions
  4. resolve each held ticker's quote currency (cached; catalogue fetched only on a miss)
  5. upsert fct_t212_positions, delete stale rows
  6. insert one fct_t212_value_history row
  7. update last_synced_at / last_sync_status

Partial success is fine -- write what succeeded -- but a failed positions fetch must never
result in a value-history row, or the chart gets a false dip.
"""

import datetime
import logging
import time

from . import trading212_client as t212
from .columns import T212_CONNECTION_COLUMNS, T212_POSITIONS_COLUMNS, T212_VALUE_HISTORY_COLUMNS
from .trading212_crypto import T212CredentialsError, decrypt_credentials

logger = logging.getLogger(__name__)

CONNECTION_TABLE = "fct_t212_connection"
POSITIONS_TABLE = "fct_t212_positions"
VALUE_HISTORY_TABLE = "fct_t212_value_history"


def _now_iso() -> str:
    return datetime.datetime.now(datetime.UTC).isoformat()


def _update_connection_status(
    db_client, connection_id: str, status: str, error: str | None = None, currency: str | None = None
) -> None:
    data: dict = {
        T212_CONNECTION_COLUMNS.LAST_SYNC_STATUS.value: status,
        T212_CONNECTION_COLUMNS.LAST_SYNC_ERROR.value: error,
        T212_CONNECTION_COLUMNS.UPDATED_AT.value: _now_iso(),
    }
    if status == "ok":
        data[T212_CONNECTION_COLUMNS.LAST_SYNCED_AT.value] = _now_iso()
    if currency is not None:
        data[T212_CONNECTION_COLUMNS.ACCOUNT_CURRENCY.value] = currency

    db_client.table(CONNECTION_TABLE).update(data).eq(
        T212_CONNECTION_COLUMNS.ID_PK.value, connection_id
    ).execute()


# Ticker -> quote currency. Process-wide rather than per-user on purpose: this is public market
# data, identical for everyone, so one user's sync warms it for the next -- which matters on the
# cron path, where a single run walks every connected user.
_instrument_currency_cache: dict[str, str] = {}

# None, not 0.0, for "never fetched": time.monotonic()'s zero point is the *boot* of the machine
# (or container host), not process start, so a sentinel of 0.0 makes the throttle below read
# "fetched monotonic() seconds ago". On a freshly booted host that is single-digit seconds, and
# the very first catalogue fetch -- the one that matters -- gets skipped for the first hour of
# uptime.
_catalogue_fetched_at: float | None = None

# The catalogue endpoint is rate limited far harder than the portfolio one and returns several
# MB. Even when a held ticker stays unresolved (delisted, renamed, genuinely absent), don't
# re-pull it more often than this -- otherwise one odd ticker means a full catalogue fetch on
# every single sync, forever.
_CATALOGUE_MIN_INTERVAL_SECONDS = 3600.0


def _resolve_instrument_currencies(
    api_key: str, api_secret: str, tickers: set[str], existing_rows: list[dict]
) -> dict[str, str]:
    """
    Quote currency per held ticker -- the field T212's portfolio payload leaves out.

    Three sources, cheapest first: the process cache, the currencies already stored on this
    user's existing position rows (so a restarted container doesn't re-pull the catalogue for
    holdings it already knew), and only then the catalogue itself -- and only if some held
    ticker is still unresolved.

    A ticker that remains unresolved is simply absent from the returned dict, which the caller
    stores as a null instrument_currency: the read path renders that as "unknown" instead of
    assuming a currency, since assuming one is exactly what produced EUR prices labelled CZK.
    A failed catalogue fetch (including a 429) is logged and otherwise ignored -- positions are
    worth writing without it, and they keep whatever currency was resolved on an earlier run.
    """
    global _catalogue_fetched_at

    for row in existing_rows:
        ticker = row.get(T212_POSITIONS_COLUMNS.TICKER.value)
        code = row.get(T212_POSITIONS_COLUMNS.INSTRUMENT_CURRENCY.value)
        if ticker and code:
            _instrument_currency_cache.setdefault(ticker, code)

    unresolved = {ticker for ticker in tickers if ticker not in _instrument_currency_cache}
    throttled = (
        _catalogue_fetched_at is not None
        and (time.monotonic() - _catalogue_fetched_at) < _CATALOGUE_MIN_INTERVAL_SECONDS
    )
    if unresolved and not throttled:
        logger.info(f"T212 sync: resolving {len(unresolved)} unknown ticker currency/currencies from the catalogue")
        try:
            _instrument_currency_cache.update(t212.get_instrument_currencies(api_key, api_secret))
        except t212.T212ApiError as e:
            logger.warning(f"T212 sync: instrument catalogue fetch failed: {e}")
        # Stamped even on failure: a broken or rate-limited catalogue shouldn't be retried on
        # every sync either.
        _catalogue_fetched_at = time.monotonic()

    return {
        ticker: _instrument_currency_cache[ticker]
        for ticker in tickers
        if ticker in _instrument_currency_cache
    }


def _classify(e: Exception) -> tuple[str, str]:
    """(status, short-classified-reason). Never the raw upstream response or the key."""
    if isinstance(e, t212.T212AuthError):
        return "auth_failed", "auth_failed"
    if isinstance(e, t212.T212RateLimitError):
        return "rate_limited", "rate_limited"
    return "error", "http_error"


def sync_one_connection(db_client, connection: dict) -> str:
    """
    Run the full sync for one already-loaded connection row.

    Returns the resulting status string ("ok" | "auth_failed" | "rate_limited" | "error").
    Never raises -- a broken single-user sync must not take down a cron run touching many users.
    """
    connection_id = connection[T212_CONNECTION_COLUMNS.ID_PK.value]
    user_id = connection[T212_CONNECTION_COLUMNS.USER_ID_FK.value]

    try:
        api_key, api_secret = decrypt_credentials(connection[T212_CONNECTION_COLUMNS.CREDENTIALS_CIPHERTEXT.value])
    except T212CredentialsError:
        _update_connection_status(db_client, connection_id, "error", error="decrypt_failed")
        return "error"

    try:
        summary = t212.get_account_summary(api_key, api_secret)
    except t212.T212ApiError as e:
        status, reason = _classify(e)
        logger.warning(f"T212 sync: account summary fetch failed for user {user_id}: {e}")
        _update_connection_status(db_client, connection_id, status, error=reason)
        return status

    currency = summary.get("currency")
    cash = summary.get("cash") or {}
    cash_value = (cash.get("availableToTrade") or 0) + (cash.get("inPies") or 0) + (cash.get("reservedForOrders") or 0)
    invested_value = (summary.get("investments") or {}).get("currentValue") or 0
    total_value = summary.get("totalValue")
    if total_value is None:
        total_value = cash_value + invested_value

    try:
        positions = t212.get_positions(api_key, api_secret)
    except t212.T212ApiError as e:
        # Account summary succeeded but positions didn't -- update the currency we did learn,
        # but write no positions and no value-history row (avoids a false dip).
        status, reason = _classify(e)
        logger.warning(f"T212 sync: positions fetch failed for user {user_id}: {e}")
        _update_connection_status(db_client, connection_id, status, error=reason, currency=currency)
        return status

    synced_at = _now_iso()
    current_tickers = {p.get("ticker") for p in positions if p.get("ticker")}

    # The existing snapshot is read *before* the upsert because it does double duty here:
    # diffing tickers to find closed positions (as it always did) and seeding the
    # instrument-currency cache with currencies resolved on an earlier run. The seed has to
    # happen while the old rows are still there -- after the upsert they hold this run's values.
    existing = (
        db_client.table(POSITIONS_TABLE)
        .select(
            f"{T212_POSITIONS_COLUMNS.ID_PK.value},"
            f"{T212_POSITIONS_COLUMNS.TICKER.value},"
            f"{T212_POSITIONS_COLUMNS.INSTRUMENT_CURRENCY.value}"
        )
        .eq(T212_POSITIONS_COLUMNS.USER_ID_FK.value, user_id)
        .execute()
    )
    existing_rows = existing.data or []

    instrument_currencies = _resolve_instrument_currencies(
        api_key, api_secret, {t for t in current_tickers if t}, existing_rows
    )

    # Upsert current positions, then delete whatever ticker rows didn't come back this run.
    #
    # Prices -- and the market value derived from them -- are stored raw, in the instrument's
    # own quote currency, and converted at read time, for the same reason value history is
    # stored in the account currency: a stored figure then never has to be rewritten when FX
    # rates refresh. unrealised_pnl (T212's `ppl`) is the one field already denominated in the
    # account currency, so it is the one field `currency` applies to.
    position_rows = [
        {
            T212_POSITIONS_COLUMNS.USER_ID_FK.value: user_id,
            T212_POSITIONS_COLUMNS.TICKER.value: p.get("ticker"),
            T212_POSITIONS_COLUMNS.QUANTITY.value: p.get("quantity"),
            T212_POSITIONS_COLUMNS.AVERAGE_PRICE.value: p.get("averagePrice"),
            T212_POSITIONS_COLUMNS.CURRENT_PRICE.value: p.get("currentPrice"),
            T212_POSITIONS_COLUMNS.MARKET_VALUE.value: (p.get("quantity") or 0) * (p.get("currentPrice") or 0),
            T212_POSITIONS_COLUMNS.UNREALISED_PNL.value: p.get("ppl"),
            T212_POSITIONS_COLUMNS.CURRENCY.value: currency,
            T212_POSITIONS_COLUMNS.INSTRUMENT_CURRENCY.value: instrument_currencies.get(p.get("ticker") or ""),
            T212_POSITIONS_COLUMNS.SYNCED_AT.value: synced_at,
        }
        for p in positions
    ]

    if position_rows:
        db_client.table(POSITIONS_TABLE).upsert(
            position_rows,
            on_conflict=f"{T212_POSITIONS_COLUMNS.USER_ID_FK.value},{T212_POSITIONS_COLUMNS.TICKER.value}",
        ).execute()

    stale_ids = [
        row[T212_POSITIONS_COLUMNS.ID_PK.value]
        for row in existing_rows
        if row[T212_POSITIONS_COLUMNS.TICKER.value] not in current_tickers
    ]
    if stale_ids:
        db_client.table(POSITIONS_TABLE).delete().in_(T212_POSITIONS_COLUMNS.ID_PK.value, stale_ids).execute()

    db_client.table(VALUE_HISTORY_TABLE).insert({
        T212_VALUE_HISTORY_COLUMNS.USER_ID_FK.value: user_id,
        T212_VALUE_HISTORY_COLUMNS.TOTAL_VALUE.value: total_value,
        T212_VALUE_HISTORY_COLUMNS.CASH_VALUE.value: cash_value,
        T212_VALUE_HISTORY_COLUMNS.INVESTED_VALUE.value: invested_value,
        T212_VALUE_HISTORY_COLUMNS.CURRENCY.value: currency,
        T212_VALUE_HISTORY_COLUMNS.SNAPSHOT_AT.value: synced_at,
    }).execute()

    _update_connection_status(db_client, connection_id, "ok", error=None, currency=currency)
    return "ok"


def sync_all_connections(service_client) -> dict[str, int]:
    """
    Cron entry point: sync every connected user, sequenced (never parallel).

    Skips connections already marked auth_failed -- a dead key doesn't get retried every 30
    minutes until the user reconnects (which creates a fresh row via POST /connection). This
    skip is cron-only; the manual /sync endpoint always attempts, since a user clicking refresh
    is explicit evidence they may have just fixed something.

    Filtered in Python rather than at the query level: this table is one row per user, so
    fetching it unfiltered is cheap, and it sidesteps postgrest-py 0.10.8 (pinned via
    supabase==1.0.4) not exposing an .or_() query method -- a plain "!= auth_failed" filter at
    the query level would also silently exclude never-synced (NULL last_sync_status) rows under
    SQL's three-valued logic, which is the opposite of what a brand-new connection needs.
    """
    response = service_client.table(CONNECTION_TABLE).select("*").execute()
    connections = [
        row for row in (response.data or [])
        if row.get(T212_CONNECTION_COLUMNS.LAST_SYNC_STATUS.value) != "auth_failed"
    ]

    results = {"ok": 0, "auth_failed": 0, "rate_limited": 0, "error": 0}
    for connection in connections:
        status = sync_one_connection(service_client, connection)
        results[status] = results.get(status, 0) + 1

    logger.info(f"T212 cron sync complete: {results}")
    return results
