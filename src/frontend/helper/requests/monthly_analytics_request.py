import requests
import datetime
import helper.environment as env

BACKEND_URL = env.BACKEND_URL
BACKEND_API_KEY = env.BACKEND_API_KEY

def get_monthly_analytics(access_token: str, year: int = None, month: int = None) -> dict:
    """Fetch monthly analytics data from the backend."""
    
    if year is None:
        year = datetime.datetime.now().year
    if month is None:
        month = datetime.datetime.now().month
    
    url = f"{BACKEND_URL}/monthly/analytics?year={year}&month={month}"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-API-KEY": BACKEND_API_KEY
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching monthly analytics data: {e}")
        raise RuntimeError(f"Failed to fetch monthly analytics data from the backend.")
