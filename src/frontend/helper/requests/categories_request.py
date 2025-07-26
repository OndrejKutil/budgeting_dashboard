import requests
import helper.environment as env

BACKEND_URL = env.BACKEND_URL
BACKEND_API_KEY = env.BACKEND_API_KEY


def get_categories(access_token: str, category_id: str | None = None) -> dict:
    """Fetch categories data with optional filtering by category ID."""
    url = f"{BACKEND_URL}/categories/"
    params = {}
    if category_id:
        params["category_id"] = category_id
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-API-KEY": BACKEND_API_KEY,
    }
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    return response.json()