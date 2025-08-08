import datetime
from typing import Tuple, Dict, Any
from helper.api_client import api_request

def get_overview(access_token: str, refresh_token: str) -> Tuple[Dict[str, Any], str, str]:
    """
    Fetch overview data from the backend with automatic token refresh.
    
    Args:
        access_token: Current access token
        refresh_token: Current refresh token
        
    Returns:
        Tuple of (response_data, new_access_token, new_refresh_token)
    """
    
    try:
        # Calculate current month date range
        first_date_of_current_month = datetime.datetime.now().replace(day=1)
        next_month = first_date_of_current_month.replace(
            month=first_date_of_current_month.month % 12 + 1, 
            year=first_date_of_current_month.year + (first_date_of_current_month.month // 12)
        )
        last_date_of_current_month = next_month - datetime.timedelta(days=1)

        # Prepare query parameters
        params = {
            'start_date': first_date_of_current_month.strftime('%Y-%m-%d'),
            'end_date': last_date_of_current_month.strftime('%Y-%m-%d')
        }

        # Make request using the API client
        response_data, new_access_token, new_refresh_token = api_request(
            method='GET',
            endpoint='/summary/',
            access_token=access_token,
            refresh_token=refresh_token,
            params=params
        )
        
        return response_data, new_access_token, new_refresh_token
    
    except Exception as e:
        print(f"Error fetching overview data: {e}")
        raise RuntimeError(f"Failed to fetch overview data from the backend: {str(e)}")