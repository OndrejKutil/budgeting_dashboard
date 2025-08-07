# fastapi
import fastapi
from fastapi import APIRouter, Depends, Query, status

# auth dependencies
from auth.auth import api_key_auth, get_current_user

# Load environment variables
import helper.environment as env
from helper.calculations.monthly_page_calc import _monthly_analytics

# schemas
from schemas.endpoint_schemas import MonthlyAnalyticsResponse

# logging
import logging

# other
from datetime import datetime


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

#? prefix - /monthly


@router.get('/analytics', response_model=MonthlyAnalyticsResponse)
async def get_monthly_analytics(
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    year: int = Query(datetime.now().year, description='Year for analytics'),
    month: int = Query(datetime.now().month, description='Month for analytics (1-12)')
) -> MonthlyAnalyticsResponse:
    '''
    Get comprehensive monthly analytics including totals, daily spending heatmap, 
    category breakdown, and spending type analysis.
    
    Returns structured data ready for frontend dashboard consumption.
    '''
    
    # Validate month parameter
    if month < 1 or month > 12:
        logger.warning(f'Invalid month parameter: {month}')
        raise fastapi.HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Month must be between 1 and 12'
        )
        
    try:
        data = _monthly_analytics(user['access_token'], year, month)

        if not data:
            logger.info(f'No data found for year: {year}, month: {month}')
            raise fastapi.HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail='No data found for the specified month'
            )

        return {
            'data': data,
            'success': True,
            'message': f'Monthly analytics for {data.get("month_name", "")} {year} retrieved successfully'
        }
        
    except ValueError as e:
        logger.warning(f'Invalid parameters for get_monthly_analytics: {str(e)}')
        logger.info(f'Query parameters - year: {year}, month: {month}')
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail='Invalid year or month parameters'
        )
        
    except Exception as e:
        logger.error(f'Database query failed for get_monthly_analytics: {str(e)}')
        logger.info(f'Query parameters - year: {year}, month: {month}')
        logger.error('Failed to fetch monthly analytics from database')
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail='Failed to generate monthly analytics'
        )
