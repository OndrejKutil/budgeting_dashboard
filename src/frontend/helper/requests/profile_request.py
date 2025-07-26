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

def request_profile_data(access_token: str) -> dict:


    url = f"{BACKEND_URL}/profile/me"

    headers = {
        "X-API-KEY": BACKEND_API_KEY,
        'Authorization': f"Bearer {access_token}"
    }

    try:
        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to fetch profile data: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"Error fetching profile data: {e}")
        raise Exception(f"Error fetching profile data: {str(e)}")

