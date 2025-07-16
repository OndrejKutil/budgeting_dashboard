from dotenv import load_dotenv
import os
import requests

# =================================================
# Load environment variables
# =================================================

load_dotenv()

BACKEND_API_KEY = os.getenv("BACKEND_API_KEY")
BACKEND_URL = os.getenv("BACKEND_URL")

# =================================================
# Helper functions
# =================================================

def request_profile_data(access_token: str) -> dict:


    url = f"{BACKEND_URL}/profile/me"

    headers = {
        "X-API-KEY": BACKEND_API_KEY,
        'Authorization': f"Bearer {access_token}"
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to fetch profile data: {response.status_code} - {response.text}")
    


    

