import requests
from dotenv import load_dotenv
import os
import datetime

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL")
BACKEND_API_KEY = os.getenv("BACKEND_API_KEY")
if not BACKEND_URL:
    raise ValueError("BACKEND_URL environment variable is not set.")

def get_overview(access_token: str) -> dict:
    """Fetch overview data from the backend."""

    url = f"{BACKEND_URL}/summary/"
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