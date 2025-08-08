import datetime
from typing import Tuple, Dict, Any
from helper.api_client import api_request

def get_yearly_analytics(access_token: str, refresh_token: str, year: int = None) -> Tuple[Dict[str, Any], str, str]:
    """
    Fetch yearly analytics data from the backend with automatic token refresh.
    
    Args:
        access_token: Current access token
        refresh_token: Current refresh token
        year: Year for analytics (defaults to current year)
        
    Returns:
        Tuple of (response_data, new_access_token, new_refresh_token)
    """
    
    if year is None:
        year = datetime.datetime.now().year
    
    try:
        # Prepare query parameters
        params = {
            'year': year
        }

        # Make request using the new API client
        response_data, new_access_token, new_refresh_token = api_request(
            method='GET',
            endpoint='/yearly/analytics',
            access_token=access_token,
            refresh_token=refresh_token,
            params=params
        )
        
        return response_data, new_access_token, new_refresh_token
    
    except Exception as e:
        print(f"Error fetching yearly analytics data: {e}")
        raise RuntimeError(f"Failed to fetch yearly analytics data from the backend: {str(e)}")


def get_emergency_fund_analysis(access_token: str, refresh_token: str, year: int = None) -> Tuple[Dict[str, Any], str, str]:
    """
    Fetch emergency fund analysis from the backend with automatic token refresh.
    
    Args:
        access_token: Current access token
        refresh_token: Current refresh token
        year: Year for analysis (defaults to current year)
        
    Returns:
        Tuple of (response_data, new_access_token, new_refresh_token)
    """
    
    if year is None:
        year = datetime.datetime.now().year

    try:
        # Prepare query parameters
        params = {
            'year': year
        }

        # Make request using the new API client
        response_data, new_access_token, new_refresh_token = api_request(
            method='GET',
            endpoint='/yearly/emergency-fund',
            access_token=access_token,
            refresh_token=refresh_token,
            params=params
        )
        
        return response_data, new_access_token, new_refresh_token
    
    except Exception as e:
        print(f"Error fetching emergency fund analysis: {e}")
        raise RuntimeError(f"Failed to fetch emergency fund analysis from the backend: {str(e)}")