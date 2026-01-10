
import os
import sys
import requests
from pathlib import Path
from dotenv import load_dotenv

# Setup path to import backend modules
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent # c:\Programming\Python projekty\data_analytics\budgeting_dashboard
sys.path.append(str(PROJECT_ROOT / "src"))

from backend.helper.calculations.yearly_page_calc import _fetch_savings_funds_balance, _emergency_fund_analysis

ENV_FILE = SCRIPT_DIR / ".env"
load_dotenv(ENV_FILE)

API_BASE_URL = os.getenv("TEST_API_BASE_URL", "http://localhost:8000")
API_KEY = os.getenv("TEST_API_KEY")
EMAIL = os.getenv("TEST_EMAIL")
PASSWORD = os.getenv("TEST_PASSWORD")

def main():
    print(f"Authenticating...")
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
        print("✅ Got access token")
    except Exception as e:
        print(f"❌ Login failed: {e}")
        return

    print("\nRunning _fetch_savings_funds_balance directly...")
    try:
        balance = _fetch_savings_funds_balance(access_token)
        print(f"Result: {balance}")
    except Exception as e:
        print(f"❌ _fetch_savings_funds_balance failed: {e}")

    print("\nRunning _emergency_fund_analysis directly...")
    try:
        data = _emergency_fund_analysis(access_token, 2026)
        print(f"emergency fund data: {data}")
    except Exception as e:
        print(f"❌ _emergency_fund_analysis failed: {e}")

if __name__ == "__main__":
    main()
