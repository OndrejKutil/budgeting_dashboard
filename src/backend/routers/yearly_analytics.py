# fastapi
import fastapi
from fastapi import APIRouter, Depends, Query, status

# auth dependencies
from auth.auth import api_key_auth, get_current_user

# Load environment variables
import helper.environment as env
from helper.calculations.yearly_page_calc import _yearly_analytics, _emergency_fund_analysis

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

#? prefix - /yearly


@router.get('/analytics')
async def get_yearly_analytics(
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    year: int = Query(datetime.now().year, description='Year for analytics')
):
    '''
    Get comprehensive yearly analytics including totals, monthly breakdown, and trends.
    '''
        
    try:
        data = _yearly_analytics(user['access_token'], year)

        if not data:
            logger.info(f'No data found for year: {year}')
            raise fastapi.HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail='No data found for the specified year'
            )

        return {
            'data': data,
            'count': len(data),
        }
        
    except Exception as e:
        logger.info(f'Database query failed for get_yearly_analytics: {str(e)}')
        logger.info(f'Query parameters - year: {year}')
        logger.error('Failed to fetch yearly analytics from database')
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail='Failed to generate yearly analytics'
        )


@router.get('/emergency-fund')
async def get_emergency_fund_analysis(
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    year: int = Query(datetime.now().year, description='Year for emergency fund calculation')
):
    
    try:
        data = _emergency_fund_analysis(user['access_token'], year)

        if not data:
            logger.info(f'No emergency fund data found for year: {year}')
            raise fastapi.HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail='No emergency fund data found for the specified year'
            )

        return {
            'data': data,
            'count': len(data)
        }
    
    except Exception as e:
        logger.info(f'Database query failed for get_emergency_fund_analysis: {str(e)}')
        logger.info(f'Query parameters - year: {year}')
        logger.error('Failed to fetch emergency fund analysis from database')
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail='Failed to generate emergency fund analysis'
        )