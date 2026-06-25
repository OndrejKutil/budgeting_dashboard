import calendar
import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

import fastapi
from fastapi import APIRouter, Depends, Query, Request, status

from ..auth.auth import api_key_auth, get_current_user
from ..data.database import get_db_client
from ..helper.columns import RECURRING_COLUMNS, TRANSACTIONS_COLUMNS, ACCOUNTS_COLUMNS
from ..helper.rate_limiter import RATE_LIMITS, limiter
from ..schemas.base import RecurringData, RecurringSummary
from ..schemas.requests import RecurringRequest
from ..schemas.responses import RecurringResponse, RecurringSuccessResponse

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
    RECURRING_COLUMNS.CREATED_AT.value,
    RECURRING_COLUMNS.UPDATED_AT.value,
])


@router.get("/", response_model=RecurringResponse)
@limiter.limit(RATE_LIMITS["read_only"])
async def get_all_recurring(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    base_currency: Optional[str] = Query("CZK", description="Base currency for totals"),
    include_inactive: Optional[bool] = Query(False, description="Include inactive templates"),
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
        from datetime import datetime as dt
        data[RECURRING_COLUMNS.UPDATED_AT.value] = dt.utcnow().isoformat()
        resp = db.table("dim_recurring").update(data).eq(RECURRING_COLUMNS.ID.value, recurring_id).execute()
        return RecurringSuccessResponse(
            success=True,
            message=f"Recurring template {recurring_id} updated",
            data=[RecurringData(**r) for r in resp.data] if resp.data else None,
        )
    except Exception as e:
        logger.error(f"update_recurring failed: {e}")
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
        from datetime import datetime as dt
        current_next = date.fromisoformat(tpl[RECURRING_COLUMNS.NEXT_DATE.value])
        new_next = _advance_date(current_next, tpl[RECURRING_COLUMNS.CADENCE.value])
        db.table("dim_recurring").update({
            RECURRING_COLUMNS.NEXT_DATE.value: new_next.isoformat(),
            RECURRING_COLUMNS.UPDATED_AT.value: dt.utcnow().isoformat(),
        }).eq(RECURRING_COLUMNS.ID.value, recurring_id).execute()

        return RecurringSuccessResponse(success=True, message="Transaction posted and next_date advanced")

    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error(f"post_recurring failed: {e}")
        raise fastapi.HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to post transaction")
