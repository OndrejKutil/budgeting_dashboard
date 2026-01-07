"""
Quick API testing script for manual debugging.

For comprehensive automated tests, use pytest:
    pytest test_backend.py -v

This file is kept for quick manual API calls during development.
"""

import requests
import os
from dotenv import load_dotenv
import pprint

load_dotenv()

API_BASE_URL = os.getenv("TEST_API_BASE_URL", "http://localhost:8000")

API_KEY = os.getenv("TEST_API_KEY")
ADMIN_API_KEY = os.getenv("TEST_ADMIN_API_KEY")

EMAIL = os.getenv("TEST_EMAIL")
PASSWORD = os.getenv("TEST_PASSWORD")

def login_get_access_token():
    url = f"{API_BASE_URL}/auth/login"
    headers = {
        "X-API-KEY": API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "email": EMAIL,
        "password": PASSWORD
    }
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    data = response.json()
    return data["access_token"]

access_token = login_get_access_token()

def get_logs():
    url = f"{API_BASE_URL}/log"
    headers = {
        "X-API-KEY": API_KEY,
        "X-Admin-Key": ADMIN_API_KEY
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    data = response.json()
    pprint.pprint(data)


# ================================================================================================
#                                   Common Test Functions
# ================================================================================================

def get_profile():
    url = f"{API_BASE_URL}/profile/me"
    headers = {
        "X-API-KEY": API_KEY,
        "Authorization": f"Bearer {access_token}"
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    data = response.json()
    print(response.status_code)
    pprint.pprint(data)

def test_yearly_analytics():
    url = f"{API_BASE_URL}/yearly/analytics"
    headers = {
        "X-API-KEY": API_KEY,
        "Authorization": f"Bearer {access_token}"
    }
    params = {"year": 2026}
    response = requests.get(url, headers=headers, params=params)
    print(f"Status: {response.status_code}")
    pprint.pprint(response.json())

def test_emergency_fund():
    url = f"{API_BASE_URL}/yearly/emergency-fund"
    headers = {
        "X-API-KEY": API_KEY,
        "Authorization": f"Bearer {access_token}"
    }
    params = {"year": 2026}
    response = requests.get(url, headers=headers, params=params)
    print(f"Status: {response.status_code}")
    pprint.pprint(response.json())

try:
    # get_profile()
    test_yearly_analytics()
    print("\n" + "="*80 + "\n")
    test_emergency_fund()
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
# get_logs()