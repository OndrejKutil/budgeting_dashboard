import requests
import helper.environment as env

BACKEND_URL = env.BACKEND_URL
BACKEND_API_KEY = env.BACKEND_API_KEY

def login_request(email: str, password: str) -> dict:

    if not email or not password:
        raise ValueError("Email and password must be provided")

    url = f"{BACKEND_URL}/auth/login"

    headers = {
        "X-API-KEY": BACKEND_API_KEY,
        "X-Login": f"{email}&&&{password}&&&None",
    }
    try:
        response = requests.post(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json().get("data")

            
            returns = {
                "email": email,
                "access_token": data.get("session").get("access_token"),
                "refresh_token": data.get("session").get("refresh_token"),
                "user": data.get("user"),
                "session": data.get("session"),
            }

            return returns
        
        else:
            return {
                "error": f"Login failed with status code {response.status_code}",
                "message": response.text
            }
        
    except Exception as e:
        print(f"Error during login request: {e}")
        raise ConnectionError(f"Failed to connect to the backend: {str(e)}")



