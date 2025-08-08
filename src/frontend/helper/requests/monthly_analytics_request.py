import datetime
from typing import Tuple, Dict, Any
from helper.api_client import api_request

def get_monthly_analytics(access_token: str, refresh_token: str, year: int = None, month: int = None) -> Tuple[Dict[str, Any], str, str]:
    """
    Fetch monthly analytics data from the backend with automatic token refresh.
    
    Args:
        access_token: Current access token
        refresh_token: Current refresh token
        year: Year for analytics (defaults to current year)
        month: Month for analytics (defaults to current month)
        
    Returns:
        Tuple of (response_data, new_access_token, new_refresh_token)
    """
    
    if year is None:
        year = datetime.datetime.now().year
    if month is None:
        month = datetime.datetime.now().month
    
    try:
        # Prepare query parameters
        params = {
            'year': year,
            'month': month
        }

        # Make request using the API client
        response_data, new_access_token, new_refresh_token = api_request(
            method='GET',
            endpoint='/monthly/analytics',
            access_token=access_token,
            refresh_token=refresh_token,
            params=params
        )
        
        return response_data, new_access_token, new_refresh_token
    
    except Exception as e:
        print(f"Error fetching monthly analytics data: {e}")
        raise RuntimeError(f"Failed to fetch monthly analytics data from the backend: {str(e)}")
