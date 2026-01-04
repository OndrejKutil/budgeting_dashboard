# fastapi
import fastapi
from fastapi import APIRouter, Depends, Query, status, Request

# auth dependencies
from ..auth.auth import api_key_auth, get_current_user

# rate limiting
from ..helper.rate_limiter import limiter, RATE_LIMITS

# Load environment variables
from ..helper import environment as env

# logging
import logging

# schemas
from ..schemas.endpoint_schemas import SummaryResponse, SummaryData

# helper
from ..helper.calculations.summary_calc import _summary_calc

# other
from datetime import date
from typing import Optional

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# Load environment variables
PROJECT_URL: str = env.PROJECT_URL
ANON_KEY: str = env.ANON_KEY

# Create logger for this module
logger = logging.getLogger(__name__)

# ================================================================================================
#                                   Router Configuration
# ================================================================================================

router = APIRouter()

#? prefix - /summary

@router.get("/", response_model=SummaryResponse)
@limiter.limit(RATE_LIMITS["heavy"])
async def get_financial_summary(
    request: Request,
    api_key: str = Depends(api_key_auth), 
    user: dict[str, str] = Depends(get_current_user),
    start_date: Optional[date] = Query(None, description="Start date for filtering transactions"),
    end_date: Optional[date] = Query(None, description="End date for filtering transactions")
) -> SummaryResponse:
    """
    Get financial summary including totals by category type.
    
    Returns income, expenses, savings, investments, profit, and net cash flow
    along with a breakdown by category.
    """
       
    try:
        summary_data: SummaryData = _summary_calc(user['access_token'], start_date, end_date)

        # Build response message
        date_range_msg = ""
        if start_date and end_date:
            date_range_msg = f" from {start_date} to {end_date}"
        elif start_date:
            date_range_msg = f" from {start_date}"
        elif end_date:
            date_range_msg = f" until {end_date}"

        return SummaryResponse(
            data=summary_data,
            success=True,
            message=f'Financial summary{date_range_msg} retrieved successfully'
        )

    except ValueError as e:
        logger.warning(f'Invalid parameters for get_financial_summary: {str(e)}')
        logger.info(f'Query parameters - start_date: {start_date}, end_date: {end_date}')
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Invalid date parameters'
        )
    
    except ConnectionError as e:
        logger.error(f'Database connection failed: {str(e)}')
        logger.info(f'Query parameters - start_date: {start_date}, end_date: {end_date}')
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Database connection failed. Please try again later.'
        )

    except Exception as e:
        logger.error(f"Database query failed for get_financial_summary: {str(e)}")
        logger.info(f"Query parameters - start_date: {start_date}, end_date: {end_date}")
        logger.error("Failed to fetch financial summary from database")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to generate financial summary"
        )