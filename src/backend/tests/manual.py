import pathlib
import sys

import requests
import dotenv
import os

try:
    # Works when executed as a module: `python -m backend.tests.manual`
    from ..helper.environment import API_KEY
except ImportError:
    # Allows running directly: `python src/backend/tests/manual.py`
    backend_dir = pathlib.Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(backend_dir))
    from helper.environment import API_KEY

def login():
    # load password and email
    dotenv.load_dotenv()
    email = os.getenv("EMAIL")
    password = os.getenv("PASSWORD")

    headers = {
        "X-API-KEY": f"{API_KEY}"
    }

    response = requests.post(
        "http://localhost:8000/auth/login",
        json={"email": email, "password": password},
        headers=headers
    )
    return response.json()["access_token"]

ACCESS_TOKEN = login()
URL = "http://localhost:8000/budgets/"

def test_manual_api_call():
    headers = {
        "X-API-KEY": f"{API_KEY}",
        "Authorization": f"Bearer {ACCESS_TOKEN}"
    }
    response = requests.get(URL, headers=headers)

    print(response.json())


if __name__ == "__main__":
    test_manual_api_call()