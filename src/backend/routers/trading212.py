# fastapi
import datetime
import logging

import fastapi
from fastapi import APIRouter, Depends, Query, Request, status

# auth dependencies
from ..auth.auth import api_key_auth, get_current_user, job_secret_auth

# database
from ..data.database import get_db_client, get_service_db_client
from ..helper import trading212_client as t212

# helpers
from ..helper.columns import T212_CONNECTION_COLUMNS, T212_POSITIONS_COLUMNS, T212_VALUE_HISTORY_COLUMNS
from ..helper.exchange_rates import get_rate
from ..helper.features import is_feature_enabled
from ..helper.rate_limiter import RATE_LIMITS, limiter
from ..helper.trading212_crypto import encrypt_credentials
from ..helper.trading212_sync import sync_all_connections, sync_one_connection

# schemas
from ..schemas.base import (
    T212ConnectionData,
    T212HistoryData,
    T212PositionData,
    T212PositionsData,
    T212SyncStatus,
    T212ValueHistoryPoint,
)
from ..schemas.requests import T212ConnectionRequest
from ..schemas.responses import (
    T212ConnectionResponse,
    T212ConnectionSuccessResponse,
    T212HistoryResponse,
    T212PositionsResponse,
)

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

logger = logging.getLogger(__name__)

router = APIRouter()

#? prefix - /trading212

# Matches the feature_key registered in the migration. Not "trading212" -- that would
# silently desync from the row `is_feature_enabled` actually looks up, and the feature would
# read as permanently off for everyone.
FEATURE_KEY = "t212_integration"

CONNECTION_TABLE = "fct_t212_connection"
POSITIONS_TABLE = "fct_t212_positions"
VALUE_HISTORY_TABLE = "fct_t212_value_history"

SPAN_DAYS: dict[str, int | None] = {
    "7d": 7,
    "1m": 30,
    "3m": 90,
    "1y": 365,
    "all": None,
    # "ytd" handled separately -- start of the current calendar year, not a fixed day count.
}


def _require_feature(access_token: str) -> None:
    """
    404, not 403: a disabled feature must be indistinguishable from a route that doesn't exist
    at all, so the generic detail text below deliberately doesn't mention Trading212 or
    "feature" -- that alone would leak that the route exists.
    """
    if not is_feature_enabled(access_token, FEATURE_KEY):
        raise fastapi.HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")


def _connection_to_data(row: dict) -> T212ConnectionData:
    raw_status = row.get(T212_CONNECTION_COLUMNS.LAST_SYNC_STATUS.value)
    return T212ConnectionData(
        connected=True,
        last_synced_at=row.get(T212_CONNECTION_COLUMNS.LAST_SYNCED_AT.value),
        last_sync_status=T212SyncStatus(raw_status) if raw_status else None,
        account_currency=row.get(T212_CONNECTION_COLUMNS.ACCOUNT_CURRENCY.value),
    )


def _not_connected() -> T212ConnectionData:
    return T212ConnectionData(connected=False, last_synced_at=None, last_sync_status=None, account_currency=None)


def _get_connection_row(db_client, user_id: str) -> dict | None:
    response = (
        db_client.table(CONNECTION_TABLE)
        .select("*")
        .eq(T212_CONNECTION_COLUMNS.USER_ID_FK.value, user_id)
        .limit(1)
        .execute()
    )
    return response.data[0] if response.data else None


# ================================================================================================
#                                   Connection Endpoints
# ================================================================================================

@router.get("/connection", response_model=T212ConnectionResponse)
@limiter.limit(RATE_LIMITS["read_only"])
async def get_connection(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> T212ConnectionResponse:
    """Connection status only -- never returns the stored key/secret, not even masked."""
    try:
        _require_feature(user["access_token"])
        db = get_db_client(user["access_token"])
        row = _get_connection_row(db, user["user_id"])

        return T212ConnectionResponse(
            data=_connection_to_data(row) if row else _not_connected(),
            success=True,
            message="Trading212 connection status retrieved successfully.",
        )

    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch Trading212 connection status")
        logger.info(f"Error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch Trading212 connection status.",
        )


@router.post("/connection", status_code=status.HTTP_201_CREATED, response_model=T212ConnectionSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def create_connection(
    request: Request,
    payload: T212ConnectionRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> T212ConnectionSuccessResponse:
    """
    Connect a Trading212 account. Validates the key/secret against T212 *before* writing
    anything -- a bad key should fail this request, not surface 30 minutes later in a cron
    log. 409 if a connection already exists; disconnect first to rotate a key.

    Read-only scope cannot be verified in code -- T212 exposes no scope introspection endpoint
    (QUESTIONS.md §2) -- so it is enforced only by this backend never calling a write
    endpoint, and documented as a manual step in the connect UI copy.
    """
    try:
        _require_feature(user["access_token"])
        db = get_db_client(user["access_token"])

        existing = _get_connection_row(db, user["user_id"])
        if existing is not None:
            raise fastapi.HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A Trading212 connection already exists. Disconnect it before reconnecting.",
            )

        try:
            summary = t212.validate_credentials(payload.api_key, payload.api_secret)
        except t212.T212AuthError:
            raise fastapi.HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trading212 rejected this API key/secret. Check the credentials and try again.",
            )
        except t212.T212RateLimitError:
            raise fastapi.HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Trading212 rate limit hit while validating the key. Try again shortly.",
            )
        except t212.T212ApiError:
            raise fastapi.HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not reach Trading212 to validate the key. Try again shortly.",
            )

        encrypted = encrypt_credentials(payload.api_key, payload.api_secret)

        data = {
            T212_CONNECTION_COLUMNS.USER_ID_FK.value: user["user_id"],
            T212_CONNECTION_COLUMNS.CREDENTIALS_CIPHERTEXT.value: encrypted,
            T212_CONNECTION_COLUMNS.ACCOUNT_CURRENCY.value: summary.get("currency"),
        }
        db.table(CONNECTION_TABLE).insert(data).execute()

        return T212ConnectionSuccessResponse(
            success=True,
            message="Trading212 connected successfully. The first sync will run within the next cron cycle, or trigger one manually.",
        )

    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to create Trading212 connection")
        logger.info(f"Error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to connect Trading212.",
        )


@router.delete("/connection", response_model=T212ConnectionSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def delete_connection(
    request: Request,
    delete_history: bool = Query(False, description="Also permanently delete recorded portfolio value history"),
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> T212ConnectionSuccessResponse:
    """
    Always deletes the connection row (and the key with it) and fct_t212_positions, a disposable
    snapshot. fct_t212_value_history is deleted only when delete_history=true -- there is no
    backfill path for it, so this is the one irreversible option here.
    """
    try:
        _require_feature(user["access_token"])
        db = get_db_client(user["access_token"])

        existing = _get_connection_row(db, user["user_id"])
        if existing is None:
            raise fastapi.HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No Trading212 connection found to disconnect.",
            )

        db.table(POSITIONS_TABLE).delete().eq(T212_POSITIONS_COLUMNS.USER_ID_FK.value, user["user_id"]).execute()

        if delete_history:
            db.table(VALUE_HISTORY_TABLE).delete().eq(
                T212_VALUE_HISTORY_COLUMNS.USER_ID_FK.value, user["user_id"]
            ).execute()

        db.table(CONNECTION_TABLE).delete().eq(
            T212_CONNECTION_COLUMNS.ID_PK.value, existing[T212_CONNECTION_COLUMNS.ID_PK.value]
        ).execute()

        return T212ConnectionSuccessResponse(
            success=True,
            message="Trading212 disconnected successfully."
            + (" Portfolio history was also deleted." if delete_history else ""),
        )

    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete Trading212 connection")
        logger.info(f"Error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disconnect Trading212.",
        )


# ================================================================================================
#                                   Read Endpoints
# ================================================================================================

@router.get("/positions", response_model=T212PositionsResponse)
@limiter.limit(RATE_LIMITS["read_only"])
async def get_positions(
    request: Request,
    base_currency: str = Query("CZK", description="Currency to convert position values into"),
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> T212PositionsResponse:
    """
    Latest synced positions snapshot, converted to base_currency. Stored values are in the
    T212 account's own currency; converting at read time means a stored figure never has to
    be rewritten when FX rates refresh.
    """
    try:
        _require_feature(user["access_token"])
        db = get_db_client(user["access_token"])

        connection = _get_connection_row(db, user["user_id"])
        if connection is None:
            return T212PositionsResponse(
                data=T212PositionsData(positions=[], synced_at=None, currency=None),
                success=True,
                message="No Trading212 connection found.",
            )

        response = (
            db.table(POSITIONS_TABLE)
            .select("*")
            .eq(T212_POSITIONS_COLUMNS.USER_ID_FK.value, user["user_id"])
            .order(T212_POSITIONS_COLUMNS.MARKET_VALUE.value, desc=True)
            .execute()
        )

        rows = response.data or []
        total_market_value = sum(float(row[T212_POSITIONS_COLUMNS.MARKET_VALUE.value]) for row in rows)

        positions = []
        for row in rows:
            row_currency = row.get(T212_POSITIONS_COLUMNS.CURRENCY.value)
            rate = get_rate(row_currency, base_currency)
            market_value = float(row[T212_POSITIONS_COLUMNS.MARKET_VALUE.value])
            weight_pct = (market_value / total_market_value * 100) if total_market_value else 0.0

            positions.append(T212PositionData(
                ticker=row[T212_POSITIONS_COLUMNS.TICKER.value],
                quantity=float(row[T212_POSITIONS_COLUMNS.QUANTITY.value]),
                average_price=float(row[T212_POSITIONS_COLUMNS.AVERAGE_PRICE.value]) * rate,
                current_price=float(row[T212_POSITIONS_COLUMNS.CURRENT_PRICE.value]) * rate,
                market_value=market_value * rate,
                unrealised_pnl=float(row[T212_POSITIONS_COLUMNS.UNREALISED_PNL.value]) * rate,
                weight_pct=weight_pct,
            ))

        synced_at = rows[0][T212_POSITIONS_COLUMNS.SYNCED_AT.value] if rows else None

        return T212PositionsResponse(
            data=T212PositionsData(
                positions=positions,
                synced_at=synced_at,
                currency=base_currency,
            ),
            success=True,
            message="Trading212 positions retrieved successfully.",
        )

    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch Trading212 positions")
        logger.info(f"Error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch Trading212 positions.",
        )


@router.get("/history", response_model=T212HistoryResponse)
@limiter.limit(RATE_LIMITS["read_only"])
async def get_history(
    request: Request,
    span: str = Query("3m", description="7d | 1m | 3m | ytd | 1y | all"),
    base_currency: str = Query("CZK", description="Currency to convert value-history figures into"),
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> T212HistoryResponse:
    """
    Portfolio value-history series for the requested span, converted to base_currency at read
    time rather than at sync time, so a historical point doesn't drift when FX rates are
    refreshed later.
    """
    try:
        _require_feature(user["access_token"])
        if span not in SPAN_DAYS and span != "ytd":
            raise fastapi.HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid span. Use one of: 7d, 1m, 3m, ytd, 1y, all.",
            )

        db = get_db_client(user["access_token"])

        query = (
            db.table(VALUE_HISTORY_TABLE)
            .select(
                f"{T212_VALUE_HISTORY_COLUMNS.SNAPSHOT_AT.value},"
                f"{T212_VALUE_HISTORY_COLUMNS.TOTAL_VALUE.value},"
                f"{T212_VALUE_HISTORY_COLUMNS.CURRENCY.value}"
            )
            .eq(T212_VALUE_HISTORY_COLUMNS.USER_ID_FK.value, user["user_id"])
        )

        if span == "ytd":
            start = datetime.datetime(datetime.date.today().year, 1, 1, tzinfo=datetime.UTC)
            query = query.gte(T212_VALUE_HISTORY_COLUMNS.SNAPSHOT_AT.value, start.isoformat())
        else:
            span_days = SPAN_DAYS.get(span)
            if span_days is not None:
                start = datetime.datetime.now(datetime.UTC) - datetime.timedelta(days=span_days)
                query = query.gte(T212_VALUE_HISTORY_COLUMNS.SNAPSHOT_AT.value, start.isoformat())

        response = query.order(T212_VALUE_HISTORY_COLUMNS.SNAPSHOT_AT.value).execute()

        points = [
            T212ValueHistoryPoint(
                snapshot_at=row[T212_VALUE_HISTORY_COLUMNS.SNAPSHOT_AT.value],
                total_value=float(row[T212_VALUE_HISTORY_COLUMNS.TOTAL_VALUE.value])
                * get_rate(row.get(T212_VALUE_HISTORY_COLUMNS.CURRENCY.value), base_currency),
            )
            for row in (response.data or [])
        ]

        return T212HistoryResponse(
            data=T212HistoryData(points=points, currency=base_currency),
            success=True,
            message="Trading212 value history retrieved successfully.",
        )

    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch Trading212 value history")
        logger.info(f"Error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch Trading212 value history.",
        )


# ================================================================================================
#                                   Sync Endpoints
# ================================================================================================

@router.post("/sync", response_model=T212ConnectionSuccessResponse)
@limiter.limit(RATE_LIMITS["t212_sync"])
async def manual_sync(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> T212ConnectionSuccessResponse:
    """
    Manual refresh. Runs the identical sync code path the cron job uses, just scoped to this
    user's own JWT-authenticated client instead of the service-role client. Tightly rate
    limited so this can't be used to burn the cron job's T212 rate-limit budget.
    """
    try:
        _require_feature(user["access_token"])
        db = get_db_client(user["access_token"])

        connection = _get_connection_row(db, user["user_id"])
        if connection is None:
            raise fastapi.HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No Trading212 connection found. Connect an account first.",
            )

        result_status = sync_one_connection(db, connection)
        refreshed = _get_connection_row(db, user["user_id"])

        messages = {
            "ok": "Trading212 synced successfully.",
            "auth_failed": "Trading212 rejected the stored credentials. Reconnect with a fresh key.",
            "rate_limited": "Trading212 rate limit hit. Try again later.",
            "error": "Trading212 sync failed. It will retry on the next scheduled run.",
        }

        return T212ConnectionSuccessResponse(
            success=result_status == "ok",
            message=messages.get(result_status, "Trading212 sync finished with an unknown status."),
            data=_connection_to_data(refreshed) if refreshed else None,
        )

    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error("Manual Trading212 sync failed unexpectedly")
        logger.info(f"Error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Trading212 sync failed unexpectedly.",
        )


@router.post("/sync-all", include_in_schema=False)
@limiter.limit(RATE_LIMITS["health"])
async def cron_sync_all(
    request: Request,
    job_secret: str = Depends(job_secret_auth),
) -> dict[str, int]:
    """
    Cron entry point for the Pi script. Gated on the job secret specifically -- not
    api_key_auth + get_current_user -- so a logged-in user cannot drive this path themselves; see QUESTIONS.md §5 for why this is a dedicated secret rather than
    ADMIN_KEY. Uses the service-role client since this iterates every connected user's row, not
    just one caller's own (mirrors the account-deletion and exchange-rate-cache use of the
    service client). Excluded from the OpenAPI schema -- this isn't a user-facing endpoint.
    """
    service_client = get_service_db_client()
    return dict(sync_all_connections(service_client))
