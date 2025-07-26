import requests
import datetime
import helper.environment as env

BACKEND_URL = env.BACKEND_URL
BACKEND_API_KEY = env.BACKEND_API_KEY

def get_overview(access_token: str) -> dict:
    """Fetch overview data from the backend."""

    url = f"{BACKEND_URL}/summary/"
    
    try:
        first_date_of_current_month = datetime.datetime.now().replace(day=1)
        next_month = first_date_of_current_month.replace(month=first_date_of_current_month.month % 12 + 1, year=first_date_of_current_month.year + (first_date_of_current_month.month // 12))
        last_date_of_current_month = next_month - datetime.timedelta(days=1)

        url += f"?start_date={first_date_of_current_month.strftime('%Y-%m-%d')}&end_date={last_date_of_current_month.strftime('%Y-%m-%d')}"

        headers = {
            "Authorization": f"Bearer {access_token}",
            "X-API-KEY": BACKEND_API_KEY
        }

        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    
    except Exception as e:
        print(f"Error fetching overview data: {e}")
        raise RuntimeError(f"Failed to fetch overview data from the backend.")