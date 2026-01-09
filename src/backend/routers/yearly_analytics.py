# fastapi
import fastapi
from fastapi import APIRouter, Depends, Query, status, Request

# auth dependencies
from ..auth.auth import api_key_auth, get_current_user

# rate limiting
from ..helper.rate_limiter import limiter, RATE_LIMITS

# Load environment variables
from ..helper import environment as env
from ..helper.calculations.yearly_page_calc import _yearly_analytics, _emergency_fund_analysis

# schemas
from ..schemas.endpoint_schemas import (
    YearlyAnalyticsResponse,
    YearlyAnalyticsData,
    EmergencyFundResponse,
    EmergencyFundData
)

# logging
import logging

# other
from datetime import datetime


# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# Load environment variables

# Create logger for this module
logger = logging.getLogger(__name__)

# ================================================================================================
#                                   Router Configuration
# ================================================================================================

router = APIRouter()

#? prefix - /yearly


@router.get('/analytics', response_model=YearlyAnalyticsResponse)
@limiter.limit(RATE_LIMITS["heavy"])
async def get_yearly_analytics(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    year: int = Query(datetime.now().year, description='Year for analytics')
) -> YearlyAnalyticsResponse:
    '''
    Get comprehensive yearly analytics including totals, monthly breakdown, and trends.
    '''
        
    try:
        analytics_data: YearlyAnalyticsData = _yearly_analytics(user['access_token'], year)

        return YearlyAnalyticsResponse(
            data=analytics_data,
            success=True,
            message=f'Yearly analytics for {year} retrieved successfully'
        )
        
    except ValueError as e:
        logger.warning(f'Invalid parameters for get_yearly_analytics: {str(e)}')
        logger.info(f'Query parameters - year: {year}')
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail='Invalid year parameter'
        )
    
    except ConnectionError as e:
        logger.error(f'Database connection failed: {str(e)}')
        logger.info(f'Query parameters - year: {year}')
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Database connection failed. Please try again later.'
        )
        
    except Exception as e:
        logger.error(f'Database query failed for get_yearly_analytics: {str(e)}')
        logger.info(f'Query parameters - year: {year}')
        logger.error('Failed to fetch yearly analytics from database')
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail='Failed to generate yearly analytics'
        )


@router.get('/emergency-fund', response_model=EmergencyFundResponse)
@limiter.limit(RATE_LIMITS["heavy"])
async def get_emergency_fund_analysis(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    year: int = Query(datetime.now().year, description='Year for emergency fund calculation')
) -> EmergencyFundResponse:
    '''
    Get emergency fund analysis based on core expenses for the specified year.
    
    Calculates 3-month and 6-month emergency fund targets based on average monthly core expenses.
    '''
       
    try:
        emergency_fund_data: EmergencyFundData = _emergency_fund_analysis(user['access_token'], year)

        return EmergencyFundResponse(
            data=emergency_fund_data,
            success=True,
            message=f"Emergency fund analysis for {year} retrieved successfully"
        )
        
    except ValueError as e:
        logger.warning(f'Invalid parameters for get_emergency_fund_analysis: {str(e)}')
        logger.info(f'Query parameters - year: {year}')
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail='Invalid year parameter'
        )
    
    except ConnectionError as e:
        logger.error(f'Database connection failed: {str(e)}')
        logger.info(f'Query parameters - year: {year}')
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Database connection failed. Please try again later.'
        )
    
    except Exception as e:
        logger.error(f'Database query failed for get_emergency_fund_analysis: {str(e)}')
        logger.info(f'Query parameters - year: {year}')
        logger.error('Failed to fetch emergency fund analysis from database')
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail='Failed to generate emergency fund analysis'
        )