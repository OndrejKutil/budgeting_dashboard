import os
import requests
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL")
BACKEND_API_KEY = os.getenv("BACKEND_API_KEY")


def get_transactions(access_token: str, offset: int = 0, limit: int = 100, transaction_id: str | None = None) -> dict:
    """Fetch transactions with optional pagination or by specific ID."""
    url = f"{BACKEND_URL}/transactions/"
    params = {
        "offset": offset,
        "limit": limit,
    }
    if transaction_id:
        params["transaction_id"] = transaction_id
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-API-KEY": BACKEND_API_KEY,
    }
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    return response.json()