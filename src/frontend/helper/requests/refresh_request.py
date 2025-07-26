import requests

# =================================================
# Load environment variables
# =================================================

import helper.environment as env

BACKEND_URL = env.BACKEND_URL
BACKEND_API_KEY = env.BACKEND_API_KEY


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

    try:
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
        
    except Exception as e:
        print(f"Error refreshing token: {e}")
        raise Exception(f"Error refreshing token: {str(e)}")