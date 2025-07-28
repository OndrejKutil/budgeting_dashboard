import requests
import datetime
import helper.environment as env

BACKEND_URL = env.BACKEND_URL
BACKEND_API_KEY = env.BACKEND_API_KEY

def get_yearly_analytics(access_token: str, year: int = None) -> dict:
    """Fetch yearly analytics data from the backend."""
    
    if year is None:
        year = datetime.datetime.now().year
    
    url = f"{BACKEND_URL}/yearly/analytics?year={year}"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-API-KEY": BACKEND_API_KEY
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching yearly analytics data: {e}")
        raise RuntimeError(f"Failed to fetch yearly analytics data from the backend.")


def get_emergency_fund_analysis(access_token: str, year: int = None) -> dict:
    """Fetch emergency fund analysis from the backend."""
    
    if year is None:
        year = datetime.datetime.now().year

    url = f"{BACKEND_URL}/yearly/emergency-fund?year={year}"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-API-KEY": BACKEND_API_KEY
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching emergency fund analysis: {e}")
        raise RuntimeError(f"Failed to fetch emergency fund analysis from the backend.")