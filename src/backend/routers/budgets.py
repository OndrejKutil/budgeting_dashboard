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

from ..schemas.responses import BudgetResponse, BudgetSuccessResponse
from ..schemas.base import BudgetPlan

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
    month: int = Query(datetime.date.today().month, ge=1, le=12, description="Month for which to retrieve budgets"),
    year: int = Query(datetime.date.today().year, ge=2000, le=2100, description="Year for which to retrieve budgets")
) -> BudgetResponse:
    return get_month_budget_view(month, year, user["access_token"])

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=BudgetSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def create_budget(
    request: Request,
    budget_plan: BudgetPlan,
    month: int = Query(..., ge=1, le=12, description="Month for which to create budget"),
    year: int = Query(..., ge=2000, le=2100, description="Year for which to create budget"),
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> BudgetSuccessResponse:
    """
    Create a new budget for the specified month and year.
    """
    supabase = get_db_client(user["access_token"])
    
    # Check if budget already exists
    # We use limit(1) instead of maybe_single() to avoid 204 errors on empty results
    existing = (
        supabase.table("fct_budgets")
        .select(BUDGET_COLUMNS.ID_PK.value)
        .eq(BUDGET_COLUMNS.MONTH.value, month)
        .eq(BUDGET_COLUMNS.YEAR.value, year)
        .limit(1)
        .execute()
    )
    
    if existing.data:
        raise fastapi.HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Budget for {month}/{year} already exists."
        )

    # Prepare data for insertion
    data = {
        BUDGET_COLUMNS.USER_ID_FK.value: user["user_id"],
        BUDGET_COLUMNS.MONTH.value: month,
        BUDGET_COLUMNS.YEAR.value: year,
        BUDGET_COLUMNS.PLAN_JSON.value: budget_plan.model_dump(mode='json'),
        # created_at and updated_at handled by DB defaults if not specified, 
        # but let's be explicit if needed. DB usually has default now().
    }
    
    try:
        supabase.table("fct_budgets").insert(data).execute()
    except Exception as e:
        # Catch unique violation if race condition occurred or other DB errors
        raise fastapi.HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
        
    return BudgetSuccessResponse(success=True, message="Budget created successfully")


@router.put("/", status_code=status.HTTP_200_OK, response_model=BudgetSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def update_budget(
    request: Request,
    budget_plan: BudgetPlan,
    month: int = Query(..., ge=1, le=12, description="Month of the budget to update"),
    year: int = Query(..., ge=2000, le=2100, description="Year of the budget to update"),
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> BudgetSuccessResponse:
    """
    Update an existing budget for the specified month and year.
    """
    supabase = get_db_client(user["access_token"])
    
    # Check if budget exists
    existing = (
        supabase.table("fct_budgets")
        .select(BUDGET_COLUMNS.ID_PK.value)
        .eq(BUDGET_COLUMNS.MONTH.value, month)
        .eq(BUDGET_COLUMNS.YEAR.value, year)
        .limit(1)
        .execute()
    )
    
    if not existing.data:
        raise fastapi.HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Budget for {month}/{year} does not exist."
        )
        
    budget_id = existing.data[0].get(BUDGET_COLUMNS.ID_PK.value)

    # Prepare data for update
    data = {
        BUDGET_COLUMNS.PLAN_JSON.value: budget_plan.model_dump(mode='json'),
        BUDGET_COLUMNS.UPDATED_AT.value: datetime.datetime.now().isoformat()
    }
    
    try:
        (
            supabase.table("fct_budgets")
            .update(data)
            .eq(BUDGET_COLUMNS.ID_PK.value, budget_id)
            .execute()
        )
    except Exception as e:
        raise fastapi.HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
        
    return BudgetSuccessResponse(success=True, message="Budget updated successfully")


@router.delete("/", status_code=status.HTTP_200_OK, response_model=BudgetSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def delete_budget(
    request: Request,
    month: int = Query(..., ge=1, le=12, description="Month of the budget to delete"),
    year: int = Query(..., ge=2000, le=2100, description="Year of the budget to delete"),
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> BudgetSuccessResponse:

    """
    Delete the budget for the specified month and year.
    """
    supabase = get_db_client(user["access_token"])
    
    # Check if budget exists first to return 404 if not found?
    # Or just delete and check count. Supabase delete returns data.
    
    response = (
        supabase.table("fct_budgets")
        .delete()
        .eq(BUDGET_COLUMNS.MONTH.value, month)
        .eq(BUDGET_COLUMNS.YEAR.value, year)
        .execute()
    )
    
    # response.data will contain the deleted rows
    if not response.data:
        raise fastapi.HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Budget for {month}/{year} not found."
        )
        
    return BudgetSuccessResponse(success=True, message="Budget deleted successfully")

