# fastapi
import fastapi
from fastapi import APIRouter, Depends, Query, status

# auth dependencies
from ..auth.auth import api_key_auth, get_current_user

# Load environment variables
from ..helper import environment as env

# logging
import logging


# helper
from ..schemas.endpoint_schemas import SummaryResponse
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
async def get_financial_summary(
    api_key: str = Depends(api_key_auth), 
    user: dict[str, str] = Depends(get_current_user),
    start_date: Optional[date] = Query(None, description="Start date for filtering transactions"),
    end_date: Optional[date] = Query(None, description="End date for filtering transactions")
) -> SummaryResponse:
    """
    Get financial summary including totals by category type and account.
    """
    
    try:
        summary = _summary_calc(user['access_token'], start_date, end_date)

        return {'data': summary}

    except Exception as e:
        logger.info(f"Database query failed for get_financial_summary: {str(e)}")
        logger.info(f"Query parameters - start_date: {start_date}, end_date: {end_date}")
        logger.error("Failed to fetch financial summary from database")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to generate financial summary"
        )