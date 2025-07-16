import requests
from dotenv import load_dotenv
import os

# =================================================
# Load environment variables
# =================================================

load_dotenv()

BACKEND_API_KEY = os.getenv("BACKEND_API_KEY")
BACKEND_URL = os.getenv("BACKEND_URL")


# =================================================
# Helper functions
# =================================================

def refresh_token(refresh_token: str) -> dict:
    """Refreshes the access token using the provided refresh token."""

    url = f"{BACKEND_URL}/refresh"

    headers = {
        "X-API-KEY": BACKEND_API_KEY,
        'X-Refresh-Token': refresh_token
    }
    response = requests.post(url, headers=headers)
    if response.status_code == 200:
        return {
            'access_token': response.json().get('session', {}).get('access_token'),
            'refresh_token': response.json().get('session', {}).get('refresh_token'),
            'user': response.json().get('user'),
            'session': response.json().get('session')
        }
    else:
        raise Exception(f"Failed to refresh token: {response.status_code} - {response.text}")