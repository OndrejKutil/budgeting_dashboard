import os
import requests
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL")
BACKEND_API_KEY = os.getenv("BACKEND_API_KEY")


def get_accounts(access_token: str, account_id: str | None = None) -> dict:
    """Fetch accounts data with optional filtering by account ID."""
    url = f"{BACKEND_URL}/accounts/"
    params = {}
    if account_id:
        params["account_id"] = account_id
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-API-KEY": BACKEND_API_KEY,
    }
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    return response.json()