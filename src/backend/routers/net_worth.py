import logging
from datetime import date

import fastapi
from fastapi import APIRouter, Depends, Query, Request, status

from ..auth.auth import api_key_auth, get_current_user
from ..data.database import get_db_client
from ..helper.calculations import net_worth_calc
from ..helper.rate_limiter import RATE_LIMITS, limiter
from ..helper.trading212_networth import get_t212_net_worth_contribution
from ..schemas.base import NetWorthTimelineData
from ..schemas.responses import NetWorthResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=NetWorthResponse)
@limiter.limit(RATE_LIMITS["read_only"])
async def get_net_worth(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    start_date: date | None = Query(None, description="Start date (default: 30 days ago)"),
    end_date: date | None = Query(None, description="End date (default: today)"),
    base_currency: str | None = Query("CZK", description="Currency for aggregation"),
) -> NetWorthResponse:
    try:
        today = date.today()
        resolved_end = end_date or today
        resolved_start = start_date  # None → auto-detect first transaction date in calc

        resolved_currency = base_currency or "CZK"
        db = get_db_client(user["access_token"])
        result = net_worth_calc.calculate_net_worth_timeline(
            db_client=db,
            end_date=resolved_end,
            start_date=resolved_start,   # None → auto-detect from first transaction
            base_currency=resolved_currency,
        )

        # The only place T212 touches net worth -- the timeline itself stays purely
        # transaction-derived; this just adds a nullable "what's invested" figure on top.
        # investments is None when the feature is off, unconnected, or nothing has synced yet.
        investments = get_t212_net_worth_contribution(db, user["access_token"], resolved_currency)

        return NetWorthResponse(
            data=NetWorthTimelineData(**result, investments=investments),
            success=True,
            message="Net-worth timeline retrieved successfully",
        )

    except Exception as e:
        logger.error(f"get_net_worth failed: {e}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compute net-worth timeline",
        )
