# fastapi
import fastapi
from fastapi import APIRouter, Depends, Query, status, Request

# auth dependencies
from ..auth.auth import api_key_auth, get_current_user

# rate limiting
from ..helper.rate_limiter import limiter, RATE_LIMITS

# supabase client
from ..data.database import get_db_client

# helper
from ..helper.columns import BUDGET_COLUMNS
from ..helper.calculations.budgets_calc import get_month_budget_view

from ..schemas.responses import BudgetResponse

from typing import Optional
import datetime
# =============================================================
# Router for budget-related endpoints
# =============================================================


router = APIRouter()

#? prefix - /budgets



@router.get("/", response_model=BudgetResponse)
@limiter.limit(RATE_LIMITS["read_only"])
async def get_budget(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    month: int = Query(datetime.date.today().month, description="Month for which to retrieve budgets"),
    year: int = Query(datetime.date.today().year, description="Year for which to retrieve budgets")
) -> BudgetResponse:
    return get_month_budget_view(month, year, user["access_token"])

    

    