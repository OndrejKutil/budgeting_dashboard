import calendar
import logging
from datetime import UTC, date, datetime, timedelta

import fastapi
from fastapi import APIRouter, Depends, Query, Request, status

from ..auth.auth import api_key_auth, get_current_user, job_secret_auth
from ..data.database import get_db_client, get_service_db_client
from ..helper.columns import (
    ACCOUNTS_COLUMNS,
    RECURRING_COLUMNS,
    RECURRING_POSTINGS_COLUMNS,
    TRANSACTIONS_COLUMNS,
)
from ..helper.rate_limiter import RATE_LIMITS, limiter
from ..schemas.base import RecurringData, RecurringNotification, RecurringSummary
from ..schemas.requests import RecurringRequest, RecurringToggleRequest
from ..schemas.responses import RecurringNotificationsResponse, RecurringResponse, RecurringSuccessResponse
from .transactions import _build_transaction_data

logger = logging.getLogger(__name__)

router = APIRouter()

CADENCE_MONTHLY_FACTOR: dict[str, float] = {
    "weekly": 52 / 12,
    "biweekly": 26 / 12,
    "monthly": 1.0,
    "quarterly": 1 / 3,
    "yearly": 1 / 12,
}


def _advance_date(d: date, cadence: str) -> date:
    """Return the next recurrence date, clamping month-end overflow."""
    if cadence == "weekly":
        return d + timedelta(weeks=1)
    if cadence == "biweekly":
        return d + timedelta(weeks=2)
    if cadence == "monthly":
        month = d.month % 12 + 1
        year = d.year + (1 if d.month == 12 else 0)
        day = min(d.day, calendar.monthrange(year, month)[1])
        return d.replace(year=year, month=month, day=day)
    if cadence == "quarterly":
        month = (d.month - 1 + 3) % 12 + 1
        year = d.year + ((d.month - 1 + 3) // 12)
        day = min(d.day, calendar.monthrange(year, month)[1])
        return d.replace(year=year, month=month, day=day)
    if cadence == "yearly":
        year = d.year + 1
        day = min(d.day, calendar.monthrange(year, d.month)[1])
        return d.replace(year=year, day=day)
    raise ValueError(f"Unknown cadence: {cadence}")


def _compute_summary(templates: list[dict], account_currencies: dict[str, str], base_currency: str) -> RecurringSummary:
    from ..helper.exchange_rates import get_rate

    monthly_total = 0.0
    for t in templates:
        if not t.get(RECURRING_COLUMNS.IS_ACTIVE.value, True):
            continue
        amount = float(t[RECURRING_COLUMNS.AMOUNT.value])
        cadence = t[RECURRING_COLUMNS.CADENCE.value]
        acct_id = t[RECURRING_COLUMNS.ACCOUNT_ID.value]
        currency = account_currencies.get(acct_id, base_currency)
        try:
            rate = get_rate(currency, base_currency) if currency != base_currency else 1.0
        except Exception:
            rate = 1.0
        monthly_total += amount * CADENCE_MONTHLY_FACTOR.get(cadence, 1.0) * rate

    return RecurringSummary(
        monthly_total=round(monthly_total, 2),
        annual_total=round(monthly_total * 12, 2),
        base_currency=base_currency,
    )


RECURRING_FIELDS = ",".join([
    RECURRING_COLUMNS.ID.value,
    RECURRING_COLUMNS.USER_ID.value,
    RECURRING_COLUMNS.ACCOUNT_ID.value,
    RECURRING_COLUMNS.CATEGORY_ID.value,
    RECURRING_COLUMNS.SAVINGS_FUND_ID.value,
    RECURRING_COLUMNS.AMOUNT.value,
    RECURRING_COLUMNS.CADENCE.value,
    RECURRING_COLUMNS.NEXT_DATE.value,
    RECURRING_COLUMNS.NOTES.value,
    RECURRING_COLUMNS.IS_ACTIVE.value,
    RECURRING_COLUMNS.AUTO_POST.value,
    RECURRING_COLUMNS.CREATED_AT.value,
    RECURRING_COLUMNS.UPDATED_AT.value,
])


@router.get("/", response_model=RecurringResponse)
@limiter.limit(RATE_LIMITS["read_only"])
async def get_all_recurring(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    base_currency: str | None = Query("CZK", description="Base currency for totals"),
    include_inactive: bool | None = Query(False, description="Include inactive templates"),
) -> RecurringResponse:
    try:
        db = get_db_client(user["access_token"])

        query = db.table("dim_recurring").select(RECURRING_FIELDS)
        if not include_inactive:
            query = query.eq(RECURRING_COLUMNS.IS_ACTIVE.value, True)
        query = query.order(RECURRING_COLUMNS.NEXT_DATE.value, desc=False)
        response = query.execute()
        templates = response.data or []

        # Fetch account currencies for FX conversion
        acct_resp = db.table("dim_accounts").select(
            f"{ACCOUNTS_COLUMNS.ID.value},{ACCOUNTS_COLUMNS.CURRENCY.value}"
        ).execute()
        account_currencies = {
            row[ACCOUNTS_COLUMNS.ID.value]: row[ACCOUNTS_COLUMNS.CURRENCY.value]
            for row in (acct_resp.data or [])
        }

        summary = _compute_summary(templates, account_currencies, base_currency or "CZK")
        data = [RecurringData(**t) for t in templates]

        return RecurringResponse(
            data=data,
            count=len(data),
            summary=summary,
            success=True,
            message="Recurring templates retrieved successfully",
        )

    except Exception as e:
        logger.error(f"get_all_recurring failed: {e}")
        raise fastapi.HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database query failed")


# ================================================================================================
#   Auto-post notifications
#
#   The daily job (scripts/post_recurring.py -> POST /recurring/post-due -> the SQL function
#   post_due_recurring() in supabase/migrations/20261114000000_add_recurring_auto_post.sql) posts due occurrences of auto_post templates and records each one in
#   fct_recurring_postings. These endpoints only read and dismiss those records; "Delete" on a
#   notification is a plain DELETE /transactions/{id}, which cascades the posting row away.
#   Declared before the /{recurring_id} routes so "notifications" is never read as an ID.
# ================================================================================================

def _to_notification(row: dict) -> RecurringNotification | None:
    """
    Flatten one posting row with its embedded transaction (tags included, same shape as
    GET /transactions/ rows, so the frontend can open its normal edit dialog on it).
    None if the transaction is gone.
    """
    tx = row.get("fct_transactions")
    if not tx:
        return None
    return RecurringNotification(
        posting_id=row[RECURRING_POSTINGS_COLUMNS.ID.value],
        recurring_id=row[RECURRING_POSTINGS_COLUMNS.RECURRING_ID.value],
        transaction_id=row[RECURRING_POSTINGS_COLUMNS.TRANSACTION_ID.value],
        occurrence_date=row[RECURRING_POSTINGS_COLUMNS.OCCURRENCE_DATE.value],
        posted_at=row[RECURRING_POSTINGS_COLUMNS.POSTED_AT.value],
        transaction=_build_transaction_data(dict(tx)),
    )


@router.get("/notifications", response_model=RecurringNotificationsResponse)
@limiter.limit(RATE_LIMITS["read_only"])
async def get_notifications(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    days: int = Query(7, ge=1, le=60, description="Only postings from the last N days; older ones expire silently"),
) -> RecurringNotificationsResponse:
    """Automatically posted occurrences the user has not dismissed yet, newest first."""
    try:
        db = get_db_client(user["access_token"])
        since = (datetime.now(UTC) - timedelta(days=days)).isoformat()
        tx_fields = ",".join([
            TRANSACTIONS_COLUMNS.ID.value,
            TRANSACTIONS_COLUMNS.USER_ID.value,
            TRANSACTIONS_COLUMNS.ACCOUNT_ID.value,
            TRANSACTIONS_COLUMNS.CATEGORY_ID.value,
            TRANSACTIONS_COLUMNS.AMOUNT.value,
            TRANSACTIONS_COLUMNS.DATE.value,
            TRANSACTIONS_COLUMNS.NOTES.value,
            TRANSACTIONS_COLUMNS.CREATED_AT.value,
            TRANSACTIONS_COLUMNS.SAVINGS_FUND_ID.value,
            "fct_transaction_tags(tag_id_fk,dim_tags(tags_id_pk,tag_name))",
        ])
        resp = (
            db.table("fct_recurring_postings")
            .select(f"*,fct_transactions({tx_fields})")
            .is_(RECURRING_POSTINGS_COLUMNS.ACKNOWLEDGED_AT.value, "null")
            .gte(RECURRING_POSTINGS_COLUMNS.POSTED_AT.value, since)
            .order(RECURRING_POSTINGS_COLUMNS.POSTED_AT.value, desc=True)
            .order(RECURRING_POSTINGS_COLUMNS.OCCURRENCE_DATE.value, desc=True)
            .execute()
        )
        items = [n for n in (_to_notification(r) for r in (resp.data or [])) if n is not None]
        return RecurringNotificationsResponse(
            data=items, count=len(items), success=True, message="Notifications retrieved successfully"
        )
    except Exception as e:
        logger.error(f"get_notifications failed: {e}")
        raise fastapi.HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database query failed")


@router.post("/notifications/ack-all", response_model=RecurringSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def acknowledge_all_notifications(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> RecurringSuccessResponse:
    """Dismiss every open notification (RLS scopes the update to the caller's rows)."""
    try:
        db = get_db_client(user["access_token"])
        db.table("fct_recurring_postings").update(
            {RECURRING_POSTINGS_COLUMNS.ACKNOWLEDGED_AT.value: datetime.now(UTC).isoformat()}
        ).is_(RECURRING_POSTINGS_COLUMNS.ACKNOWLEDGED_AT.value, "null").execute()
        return RecurringSuccessResponse(success=True, message="All notifications dismissed")
    except Exception as e:
        logger.error(f"acknowledge_all_notifications failed: {e}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to dismiss notifications"
        )


@router.post("/notifications/{posting_id}/ack", response_model=RecurringSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def acknowledge_notification(
    request: Request,
    posting_id: str,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> RecurringSuccessResponse:
    """Dismiss one notification. The transaction itself is kept as posted."""
    try:
        db = get_db_client(user["access_token"])
        resp = db.table("fct_recurring_postings").update(
            {RECURRING_POSTINGS_COLUMNS.ACKNOWLEDGED_AT.value: datetime.now(UTC).isoformat()}
        ).eq(RECURRING_POSTINGS_COLUMNS.ID.value, posting_id).execute()
        if not resp.data:
            raise fastapi.HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        return RecurringSuccessResponse(success=True, message="Notification dismissed")
    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error(f"acknowledge_notification failed: {e}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to dismiss notification"
        )


@router.post("/post-due", include_in_schema=False)
@limiter.limit(RATE_LIMITS["health"])
async def cron_post_due(
    request: Request,
    job_secret: str = Depends(job_secret_auth),
) -> dict[str, int]:
    """
    Daily entry point for the Pi script (scripts/post_recurring.py). Same gate as
    /trading212/sync-all: the job secret, not a user token, because this posts for every user.
    The work itself is the post_due_recurring() SQL function (it runs as one transaction per
    template, so a concurrent manual Post can't double-post); this only triggers it with the
    service-role client, the only role allowed to execute it.
    """
    try:
        service_client = get_service_db_client()
        # supabase-py 1.x requires the params argument even for a no-arg function.
        resp = service_client.rpc("post_due_recurring", {}).execute()
        posted = int(resp.data or 0)
        logger.info(f"cron_post_due: posted {posted} occurrence(s)")
        return {"posted": posted}
    except Exception as e:
        logger.error(f"cron_post_due failed: {e}")
        raise fastapi.HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to post due templates")


@router.post("/", response_model=RecurringSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def create_recurring(
    request: Request,
    body: RecurringRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> RecurringSuccessResponse:
    try:
        db = get_db_client(user["access_token"])
        data = body.model_dump(exclude_none=False)
        data[RECURRING_COLUMNS.USER_ID.value] = user["user_id"]
        data[RECURRING_COLUMNS.AMOUNT.value] = float(data[RECURRING_COLUMNS.AMOUNT.value])
        data[RECURRING_COLUMNS.NEXT_DATE.value] = data[RECURRING_COLUMNS.NEXT_DATE.value].isoformat()
        resp = db.table("dim_recurring").insert(data).execute()
        return RecurringSuccessResponse(
            success=True,
            message="Recurring template created",
            data=[RecurringData(**r) for r in resp.data] if resp.data else None,
        )
    except Exception as e:
        logger.error(f"create_recurring failed: {e}")
        raise fastapi.HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create template")


@router.put("/{recurring_id}", response_model=RecurringSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def update_recurring(
    request: Request,
    recurring_id: str,
    body: RecurringRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> RecurringSuccessResponse:
    try:
        db = get_db_client(user["access_token"])
        data = body.model_dump(exclude_none=False)
        data[RECURRING_COLUMNS.USER_ID.value] = user["user_id"]
        data[RECURRING_COLUMNS.AMOUNT.value] = float(data[RECURRING_COLUMNS.AMOUNT.value])
        data[RECURRING_COLUMNS.NEXT_DATE.value] = data[RECURRING_COLUMNS.NEXT_DATE.value].isoformat()
        data[RECURRING_COLUMNS.UPDATED_AT.value] = datetime.now(UTC).isoformat()
        resp = db.table("dim_recurring").update(data).eq(RECURRING_COLUMNS.ID.value, recurring_id).execute()
        return RecurringSuccessResponse(
            success=True,
            message=f"Recurring template {recurring_id} updated",
            data=[RecurringData(**r) for r in resp.data] if resp.data else None,
        )
    except Exception as e:
        logger.error(f"update_recurring failed: {e}")
        raise fastapi.HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update template")


@router.patch("/{recurring_id}", response_model=RecurringSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def toggle_recurring(
    request: Request,
    recurring_id: str,
    body: RecurringToggleRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> RecurringSuccessResponse:
    """Flip is_active and/or auto_post from the list without resending the whole template."""
    data: dict[str, object] = dict(body.model_dump(exclude_none=True))
    if not data:
        raise fastapi.HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Nothing to update")
    try:
        db = get_db_client(user["access_token"])
        data[RECURRING_COLUMNS.UPDATED_AT.value] = datetime.now(UTC).isoformat()
        resp = db.table("dim_recurring").update(data).eq(RECURRING_COLUMNS.ID.value, recurring_id).execute()
        if not resp.data:
            raise fastapi.HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        return RecurringSuccessResponse(
            success=True,
            message=f"Recurring template {recurring_id} updated",
            data=[RecurringData(**r) for r in resp.data],
        )
    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error(f"toggle_recurring failed: {e}")
        raise fastapi.HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update template")


@router.delete("/{recurring_id}", response_model=RecurringSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def delete_recurring(
    request: Request,
    recurring_id: str,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> RecurringSuccessResponse:
    try:
        db = get_db_client(user["access_token"])
        db.table("dim_recurring").delete().eq(RECURRING_COLUMNS.ID.value, recurring_id).execute()
        return RecurringSuccessResponse(success=True, message=f"Recurring template {recurring_id} deleted")
    except Exception as e:
        logger.error(f"delete_recurring failed: {e}")
        raise fastapi.HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete template")


@router.post("/{recurring_id}/post", response_model=RecurringSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def post_recurring(
    request: Request,
    recurring_id: str,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> RecurringSuccessResponse:
    """One-tap confirm: create a real transaction from the template and advance next_date."""
    try:
        db = get_db_client(user["access_token"])

        # Fetch the template
        resp = db.table("dim_recurring").select(RECURRING_FIELDS).eq(
            RECURRING_COLUMNS.ID.value, recurring_id
        ).execute()
        if not resp.data:
            raise fastapi.HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

        tpl = resp.data[0]

        # Insert transaction
        tx = {
            TRANSACTIONS_COLUMNS.USER_ID.value: user["user_id"],
            TRANSACTIONS_COLUMNS.ACCOUNT_ID.value: tpl[RECURRING_COLUMNS.ACCOUNT_ID.value],
            TRANSACTIONS_COLUMNS.CATEGORY_ID.value: tpl[RECURRING_COLUMNS.CATEGORY_ID.value],
            TRANSACTIONS_COLUMNS.AMOUNT.value: float(tpl[RECURRING_COLUMNS.AMOUNT.value]),
            TRANSACTIONS_COLUMNS.DATE.value: tpl[RECURRING_COLUMNS.NEXT_DATE.value],
            TRANSACTIONS_COLUMNS.NOTES.value: tpl.get(RECURRING_COLUMNS.NOTES.value),
            TRANSACTIONS_COLUMNS.SAVINGS_FUND_ID.value: tpl.get(RECURRING_COLUMNS.SAVINGS_FUND_ID.value),
        }
        # Remove None values
        tx = {k: v for k, v in tx.items() if v is not None}
        db.table("fct_transactions").insert(tx).execute()

        # Advance next_date
        current_next = date.fromisoformat(tpl[RECURRING_COLUMNS.NEXT_DATE.value])
        new_next = _advance_date(current_next, tpl[RECURRING_COLUMNS.CADENCE.value])
        db.table("dim_recurring").update({
            RECURRING_COLUMNS.NEXT_DATE.value: new_next.isoformat(),
            RECURRING_COLUMNS.UPDATED_AT.value: datetime.now(UTC).isoformat(),
        }).eq(RECURRING_COLUMNS.ID.value, recurring_id).execute()

        return RecurringSuccessResponse(success=True, message="Transaction posted and next_date advanced")

    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error(f"post_recurring failed: {e}")
        raise fastapi.HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to post transaction")
