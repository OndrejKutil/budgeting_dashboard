
import os
import sys
import requests
import json
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path to import config if needed, but we'll just load .env directly
SCRIPT_DIR = Path(__file__).parent
ENV_FILE = SCRIPT_DIR / ".env"
load_dotenv(ENV_FILE)

API_BASE_URL = os.getenv("TEST_API_BASE_URL", "http://localhost:8000")
API_KEY = os.getenv("TEST_API_KEY")
EMAIL = os.getenv("TEST_EMAIL")
PASSWORD = os.getenv("TEST_PASSWORD")

def main():
    print(f"Connecting to {API_BASE_URL}...")
    
    # 1. Login
    login_url = f"{API_BASE_URL}/auth/login"
    try:
        response = requests.post(
            login_url,
            json={"email": EMAIL, "password": PASSWORD},
            headers={"X-API-KEY": API_KEY}
        )
        response.raise_for_status()
        tokens = response.json()
        access_token = tokens["access_token"]
        print("✅ Login successful")
    except Exception as e:
        print(f"❌ Login failed: {e}")
        if response:
            print(response.text)
        return

    auth_headers = {
        "X-API-KEY": API_KEY,
        "Authorization": f"Bearer {access_token}"
    }

    # 2. Fetch Funds
    print("\nfetching funds...")
    try:
        funds_resp = requests.get(f"{API_BASE_URL}/funds/", headers=auth_headers)
        funds_resp.raise_for_status()
        funds_data = funds_resp.json()
        
        print("\n--- RAW FUNDS DATA ---")
        print(json.dumps(funds_data, indent=2))
        
        if funds_data.get("success") and "data" in funds_data:
            total = sum(f.get("current_amount", 0) for f in funds_data["data"])
            print(f"\nCalculated Total current_amount: {total}")
        else:
            print("No data found or request failed")

    except Exception as e:
        print(f"❌ Failed to fetch funds: {e}")

    # 3. Check Emergency Fund Analysis specifically
    print("\nfetching emergency fund analysis...")
    try:
        yearly_resp = requests.get(
            f"{API_BASE_URL}/yearly/emergency-fund", 
            params={"year": 2026},
            headers=auth_headers
        )
        yearly_resp.raise_for_status()
        yearly_data = yearly_resp.json()
        
        print("\n--- EMERGENCY FUND ANALYSIS ---")
        print(json.dumps(yearly_data, indent=2))
        
        val = yearly_data.get("data", {}).get("current_savings_amount")
        print(f"\nValue returned by API for current_savings_amount: {val}")

    except Exception as e:
        print(f"❌ Failed to fetch analysis: {e}")

if __name__ == "__main__":
    main()
