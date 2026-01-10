
import requests
import os
from dotenv import load_dotenv
import pprint

# Load environment variables from specific path if needed, or default
load_dotenv()

API_BASE_URL = os.getenv("TEST_API_BASE_URL", "http://localhost:8000")
API_KEY = os.getenv("TEST_API_KEY")
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
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return None
    data = response.json()
    return data["access_token"]

def verify_accounts(token):
    print("\n--- Verifying Accounts ---")
    url = f"{API_BASE_URL}/accounts"
    headers = {
        "X-API-KEY": API_KEY,
        "Authorization": f"Bearer {token}"
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        print(f"Success! Found {data.get('count', 0)} accounts.")
        for account in data.get('data', []):
            print(f"Account: {account.get('account_name', 'Unknown')}")
            print(f"  Balance: {account.get('current_balance')}")
            print(f"  30d Flow: {account.get('net_flow_30d')}")
    else:
        print(f"Failed to fetch accounts: {response.text}")

def verify_funds(token):
    print("\n--- Verifying Savings Funds ---")
    url = f"{API_BASE_URL}/funds"
    headers = {
        "X-API-KEY": API_KEY,
        "Authorization": f"Bearer {token}"
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        print(f"Success! Found {data.get('count', 0)} funds.")
        for fund in data.get('data', []):
            print(f"Fund: {fund.get('fund_name', 'Unknown')}")
            print(f"  Balance: {fund.get('current_amount')}")
            print(f"  30d Flow: {fund.get('net_flow_30d')}")
    else:
        print(f"Failed to fetch funds: {response.text}")

if __name__ == "__main__":
    print("Starting verification...")
    token = login_get_access_token()
    if token:
        verify_accounts(token)
        verify_funds(token)
    else:
        print("Skipping tests due to login failure (server might not be running or credentials missing).")
