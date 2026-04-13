# fastapi
import fastapi
from fastapi import APIRouter, Depends, status, Request

# auth
from ..auth.auth import api_key_auth, get_current_user

# rate limiting
from ..helper.rate_limiter import limiter, RATE_LIMITS

# database
from ..data.database import get_db_client

# helpers
from ..helper.columns import DIVIDEND_PORTFOLIO_COLUMNS

# schemas
from ..schemas.base import DividendStockRow, DividendYieldFrequency, DividendCalculationResult
from ..schemas.requests import DividendPortfolioRequest
from ..schemas.responses import DividendPortfolioResponse, DividendPortfolioSuccessResponse

# stdlib
import logging
import datetime
from decimal import Decimal
from typing import List

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

logger = logging.getLogger(__name__)

router = APIRouter()

#? prefix - /dividends

TABLE = "fct_dividend_portfolios"


# ================================================================================================
#                                   Calculation Helper
# ================================================================================================

def _annual_yield(row: DividendStockRow) -> Decimal:
    """Return the annual yield percentage for a stock row."""
    yld = Decimal(str(row.dividend_yield))
    if row.yield_frequency == DividendYieldFrequency.MONTHLY:
        return yld * Decimal("12")
    if row.yield_frequency == DividendYieldFrequency.QUARTERLY:
        return yld * Decimal("4")
    return yld


def _calculate(portfolio_value: Decimal, rows: List[DividendStockRow]) -> DividendCalculationResult:
    """Compute weighted average yield and income figures."""
    if not rows or portfolio_value <= 0:
        zero = Decimal("0")
        return DividendCalculationResult(
            weighted_avg_yield=zero,
            annual_income=zero,
            monthly_income=zero,
            portfolio_value=portfolio_value,
            rows=rows,
        )

    weighted_yield = sum(
        row.weight_pct * _annual_yield(row) for row in rows
    ) / Decimal("100")

    annual_income = portfolio_value * weighted_yield / Decimal("100")
    monthly_income = annual_income / Decimal("12")

    return DividendCalculationResult(
        weighted_avg_yield=weighted_yield.quantize(Decimal("0.0001")),
        annual_income=annual_income.quantize(Decimal("0.01")),
        monthly_income=monthly_income.quantize(Decimal("0.01")),
        portfolio_value=portfolio_value,
        rows=rows,
    )


def _parse_rows(raw_rows: list) -> List[DividendStockRow]:
    """Parse and validate a list of raw dicts into DividendStockRow objects."""
    return [DividendStockRow(**r) for r in raw_rows]


def _validate_weights(rows: List[DividendStockRow]) -> None:
    """Raise 422 if portfolio weights do not sum to 100."""
    if not rows:
        return
    total = sum(r.weight_pct for r in rows)
    if abs(total - Decimal("100")) > Decimal("0.01"):
        raise fastapi.HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Portfolio weights must sum to 100% (current sum: {float(total):.2f}%).",
        )


# ================================================================================================
#                                   Endpoints
# ================================================================================================

@router.get("/", response_model=DividendPortfolioResponse)
@limiter.limit(RATE_LIMITS["read_only"])
async def get_dividend_portfolio(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> DividendPortfolioResponse:
    """Fetch the authenticated user's dividend portfolio and compute results."""
    try:
        supabase = get_db_client(user["access_token"])

        response = (
            supabase.table(TABLE)
            .select("*")
            .eq(DIVIDEND_PORTFOLIO_COLUMNS.USER_ID_FK.value, user["user_id"])
            .limit(1)
            .execute()
        )

        if not response.data:
            # No portfolio yet — return empty result
            result = _calculate(Decimal("0"), [])
            return DividendPortfolioResponse(
                data=result,
                success=True,
                message="No portfolio found. Add stocks to get started.",
            )

        record = response.data[0]
        portfolio_value = Decimal(str(record[DIVIDEND_PORTFOLIO_COLUMNS.PORTFOLIO_VALUE.value]))
        raw_rows: list = record[DIVIDEND_PORTFOLIO_COLUMNS.PORTFOLIO_JSON.value]

        rows = _parse_rows(raw_rows)
        result = _calculate(portfolio_value, rows)

        return DividendPortfolioResponse(
            data=result,
            success=True,
            message="Dividend portfolio retrieved successfully.",
        )

    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch dividend portfolio: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dividend portfolio.",
        )


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=DividendPortfolioSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def create_dividend_portfolio(
    request: Request,
    payload: DividendPortfolioRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> DividendPortfolioSuccessResponse:
    """Create a new dividend portfolio for the user (only allowed if none exists)."""
    try:
        supabase = get_db_client(user["access_token"])

        # Check uniqueness
        existing = (
            supabase.table(TABLE)
            .select(DIVIDEND_PORTFOLIO_COLUMNS.ID_PK.value)
            .eq(DIVIDEND_PORTFOLIO_COLUMNS.USER_ID_FK.value, user["user_id"])
            .limit(1)
            .execute()
        )
        if existing.data:
            raise fastapi.HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A dividend portfolio already exists. Use PUT to update it.",
            )

        # Validate rows
        rows = _parse_rows(payload.portfolio)
        _validate_weights(rows)

        data = {
            DIVIDEND_PORTFOLIO_COLUMNS.USER_ID_FK.value: user["user_id"],
            DIVIDEND_PORTFOLIO_COLUMNS.PORTFOLIO_VALUE.value: float(payload.portfolio_value),
            DIVIDEND_PORTFOLIO_COLUMNS.PORTFOLIO_JSON.value: [r.model_dump(mode="json") for r in rows],
        }

        supabase.table(TABLE).insert(data).execute()

        return DividendPortfolioSuccessResponse(
            success=True,
            message="Dividend portfolio created successfully.",
        )

    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create dividend portfolio: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create dividend portfolio.",
        )


@router.put("/", response_model=DividendPortfolioSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def update_dividend_portfolio(
    request: Request,
    payload: DividendPortfolioRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> DividendPortfolioSuccessResponse:
    """Update the user's existing dividend portfolio."""
    try:
        supabase = get_db_client(user["access_token"])

        existing = (
            supabase.table(TABLE)
            .select(DIVIDEND_PORTFOLIO_COLUMNS.ID_PK.value)
            .eq(DIVIDEND_PORTFOLIO_COLUMNS.USER_ID_FK.value, user["user_id"])
            .limit(1)
            .execute()
        )
        if not existing.data:
            raise fastapi.HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No dividend portfolio found. Use POST to create one first.",
            )

        record_id = existing.data[0][DIVIDEND_PORTFOLIO_COLUMNS.ID_PK.value]

        # Validate rows
        rows = _parse_rows(payload.portfolio)
        _validate_weights(rows)

        data = {
            DIVIDEND_PORTFOLIO_COLUMNS.PORTFOLIO_VALUE.value: float(payload.portfolio_value),
            DIVIDEND_PORTFOLIO_COLUMNS.PORTFOLIO_JSON.value: [r.model_dump(mode="json") for r in rows],
            DIVIDEND_PORTFOLIO_COLUMNS.UPDATED_AT.value: datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }

        (
            supabase.table(TABLE)
            .update(data)
            .eq(DIVIDEND_PORTFOLIO_COLUMNS.ID_PK.value, record_id)
            .execute()
        )

        return DividendPortfolioSuccessResponse(
            success=True,
            message="Dividend portfolio updated successfully.",
        )

    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update dividend portfolio: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update dividend portfolio.",
        )


@router.delete("/", response_model=DividendPortfolioSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def delete_dividend_portfolio(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> DividendPortfolioSuccessResponse:
    """Delete the user's dividend portfolio."""
    try:
        supabase = get_db_client(user["access_token"])

        response = (
            supabase.table(TABLE)
            .delete()
            .eq(DIVIDEND_PORTFOLIO_COLUMNS.USER_ID_FK.value, user["user_id"])
            .execute()
        )

        if not response.data:
            raise fastapi.HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No dividend portfolio found to delete.",
            )

        return DividendPortfolioSuccessResponse(
            success=True,
            message="Dividend portfolio deleted successfully.",
        )

    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete dividend portfolio: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete dividend portfolio.",
        )
