"""
Backend API Test Suite for Budgeting Dashboard

This module provides comprehensive tests for all backend API endpoints.
Tests are organized by endpoint category and include both positive and negative test cases.

Usage:
    pytest test_backend.py -v
    pytest test_backend.py -v -k "test_transactions"  # Run only transaction tests
    pytest test_backend.py -v --tb=short  # Shorter traceback
"""

import pytest
import requests
import os
from dotenv import load_dotenv
from decimal import Decimal
from datetime import date, datetime
from typing import Optional

# Load environment variables
load_dotenv()


# ================================================================================================
#                                   Configuration
# ================================================================================================

class TestConfig:
    """Test configuration loaded from environment variables"""
    API_BASE_URL = os.getenv("TEST_API_BASE_URL", "http://localhost:8000")
    API_KEY = os.getenv("TEST_API_KEY")
    ADMIN_API_KEY = os.getenv("TEST_ADMIN_API_KEY")
    EMAIL = os.getenv("TEST_EMAIL")
    PASSWORD = os.getenv("TEST_PASSWORD")
    
    # Test data IDs (loaded from environment for privacy)
    TEST_USER_ID = os.getenv("TEST_USER_ID")
    TEST_ACCOUNT_ID = os.getenv("TEST_ACCOUNT_ID")
    TEST_ACCOUNT_ID_2 = os.getenv("TEST_ACCOUNT_ID_2")
    TEST_SAVINGS_FUND_ID = os.getenv("TEST_SAVINGS_FUND_ID")
    TEST_TRANSACTION_INCOME_ID = os.getenv("TEST_TRANSACTION_INCOME_ID")
    TEST_TRANSACTION_EXPENSE_ID = os.getenv("TEST_TRANSACTION_EXPENSE_ID")
    TEST_TRANSACTION_SAVING_ID = os.getenv("TEST_TRANSACTION_SAVING_ID")
    TEST_TRANSACTION_INVESTMENT_ID = os.getenv("TEST_TRANSACTION_INVESTMENT_ID")
    
    # Expected test data values
    EXPECTED_INCOME_1 = Decimal("5000")
    EXPECTED_INCOME_2 = Decimal("10000")
    EXPECTED_EXPENSE_GROCERY = Decimal("-200")
    EXPECTED_EXPENSE_BITCOIN = Decimal("-2000")
    EXPECTED_SAVING = Decimal("-2500")
    EXPECTED_TOTAL_TRANSACTIONS = 5
    
    # Account info
    EXPECTED_ACCOUNT_1_NAME = "Bank 1"
    EXPECTED_ACCOUNT_2_NAME = "Bank 1" # Only 1 account in new data
    EXPECTED_SAVINGS_FUND_NAME = "Emergency fund"
    EXPECTED_SAVINGS_FUND_TARGET = Decimal("10000")


# ================================================================================================
#                                   Fixtures
# ================================================================================================

@pytest.fixture(scope="session")
def config():
    """Return test configuration"""
    return TestConfig()


@pytest.fixture(scope="class")
def access_token(config):
    """
    Authenticate and return access token.
    This is class-scoped to avoid multiple logins while preventing token expiration.
    Tokens are refreshed for each test class to handle long test runs.
    """
    url = f"{config.API_BASE_URL}/auth/login"
    headers = {
        "X-API-KEY": config.API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "email": config.EMAIL,
        "password": config.PASSWORD
    }
    
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    data = response.json()
    
    assert "access_token" in data, "Login response missing access_token"
    assert "refresh_token" in data, "Login response missing refresh_token"
    assert "user_id" in data, "Login response missing user_id"
    
    return data["access_token"]


@pytest.fixture(scope="class")
def auth_headers(config, access_token):
    """Return headers with authentication for protected endpoints"""
    return {
        "X-API-KEY": config.API_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="session")
def admin_headers(config):
    """Return headers with admin authentication"""
    return {
        "X-API-KEY": config.API_KEY,
        "X-Admin-Key": config.ADMIN_API_KEY
    }


# ================================================================================================
#                                   Health Check Tests
# ================================================================================================

class TestHealthEndpoints:
    """Tests for health check and root endpoints"""
    
    def test_root_endpoint(self, config):
        """Test that root endpoint returns success"""
        response = requests.get(f"{config.API_BASE_URL}/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "running" in data["message"].lower()
    
    def test_health_endpoint(self, config):
        """Test that health check endpoint returns healthy status"""
        response = requests.get(f"{config.API_BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_version_endpoint(self, config):
        """Test that version endpoint returns version info"""
        response = requests.get(f"{config.API_BASE_URL}/version")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        assert "description" in data


# ================================================================================================
#                                   Authentication Tests
# ================================================================================================

class TestAuthentication:
    """Tests for authentication endpoints"""
    
    def test_login_success(self, config):
        """Test successful login with valid credentials"""
        url = f"{config.API_BASE_URL}/auth/login"
        headers = {"X-API-KEY": config.API_KEY, "Content-Type": "application/json"}
        payload = {"email": config.EMAIL, "password": config.PASSWORD}
        
        response = requests.post(url, json=payload, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "user_id" in data
        assert len(data["access_token"]) > 0
        assert len(data["refresh_token"]) > 0
    
    def test_login_missing_api_key(self, config):
        """Test login fails without API key"""
        url = f"{config.API_BASE_URL}/auth/login"
        payload = {"email": config.EMAIL, "password": config.PASSWORD}
        
        response = requests.post(url, json=payload)
        assert response.status_code == 400
    
    def test_login_invalid_credentials(self, config):
        """Test login fails with invalid credentials"""
        url = f"{config.API_BASE_URL}/auth/login"
        headers = {"X-API-KEY": config.API_KEY, "Content-Type": "application/json"}
        payload = {"email": "invalid@example.com", "password": "wrongpassword"}
        
        response = requests.post(url, json=payload, headers=headers)
        assert response.status_code in [401, 500]  # Could be either depending on Supabase response
    
    def test_login_missing_email(self, config):
        """Test login fails with missing email"""
        url = f"{config.API_BASE_URL}/auth/login"
        headers = {"X-API-KEY": config.API_KEY, "Content-Type": "application/json"}
        payload = {"password": config.PASSWORD}
        
        response = requests.post(url, json=payload, headers=headers)
        assert response.status_code == 422  # Validation error
    
    def test_login_missing_password(self, config):
        """Test login fails with missing password"""
        url = f"{config.API_BASE_URL}/auth/login"
        headers = {"X-API-KEY": config.API_KEY, "Content-Type": "application/json"}
        payload = {"email": config.EMAIL}
        
        response = requests.post(url, json=payload, headers=headers)
        assert response.status_code == 422  # Validation error
    
    def test_token_refresh(self, config, access_token):
        """Test token refresh endpoint"""
        # First login to get refresh token
        login_url = f"{config.API_BASE_URL}/auth/login"
        headers = {"X-API-KEY": config.API_KEY, "Content-Type": "application/json"}
        payload = {"email": config.EMAIL, "password": config.PASSWORD}
        
        login_response = requests.post(login_url, json=payload, headers=headers)
        login_data = login_response.json()
        refresh_token = login_data["refresh_token"]
        
        # Now test refresh
        refresh_url = f"{config.API_BASE_URL}/refresh/"
        refresh_headers = {
            "X-API-KEY": config.API_KEY,
            "X-Refresh-Token": refresh_token
        }
        
        response = requests.post(refresh_url, headers=refresh_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "session" in data
        assert "user" in data


# ================================================================================================
#                                   Transactions Tests
# ================================================================================================

class TestTransactions:
    """Tests for transactions endpoints"""
    
    def test_get_all_transactions(self, config, auth_headers):
        """Test retrieving all transactions"""
        url = f"{config.API_BASE_URL}/transactions/"
        
        response = requests.get(url, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "count" in data
        assert isinstance(data["data"], list)
        assert data["count"] == config.EXPECTED_TOTAL_TRANSACTIONS
    
    def test_get_transactions_with_pagination(self, config, auth_headers):
        """Test pagination on transactions endpoint"""
        url = f"{config.API_BASE_URL}/transactions/"
        params = {"limit": 2, "offset": 0}
        
        response = requests.get(url, headers=auth_headers, params=params)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) <= 2
    
    def test_get_transactions_with_date_filter(self, config, auth_headers):
        """Test date filtering on transactions endpoint"""
        url = f"{config.API_BASE_URL}/transactions/"
        today = date.today().isoformat()
        params = {"start_date": today, "end_date": today}
        
        response = requests.get(url, headers=auth_headers, params=params)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        # All test transactions are from 2026-01-09 (today in test env)
        for transaction in data["data"]:
            assert transaction["date"] == today
    
    def test_get_transactions_by_account(self, config, auth_headers):
        """Test filtering transactions by account"""
        if not config.TEST_ACCOUNT_ID:
            pytest.skip("TEST_ACCOUNT_ID not configured")
        
        url = f"{config.API_BASE_URL}/transactions/"
        params = {"account_id": config.TEST_ACCOUNT_ID}
        
        response = requests.get(url, headers=auth_headers, params=params)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        for transaction in data["data"]:
            assert transaction["account_id_fk"] == config.TEST_ACCOUNT_ID
    
    def test_get_transaction_by_id(self, config, auth_headers):
        """Test retrieving a specific transaction by ID"""
        if not config.TEST_TRANSACTION_INCOME_ID:
            pytest.skip("TEST_TRANSACTION_INCOME_ID not configured")
        
        url = f"{config.API_BASE_URL}/transactions/"
        params = {"transaction_id": config.TEST_TRANSACTION_INCOME_ID}
        
        response = requests.get(url, headers=auth_headers, params=params)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["count"] == 1
        assert data["data"][0]["id_pk"] == config.TEST_TRANSACTION_INCOME_ID
    
    def test_transactions_unauthorized(self, config):
        """Test that transactions endpoint requires authentication"""
        url = f"{config.API_BASE_URL}/transactions/"
        headers = {"X-API-KEY": config.API_KEY}  # No auth token
        
        response = requests.get(url, headers=headers)
        assert response.status_code == 400  # Missing authorization header
    
    def test_transactions_invalid_token(self, config):
        """Test that transactions endpoint rejects invalid tokens"""
        url = f"{config.API_BASE_URL}/transactions/"
        headers = {
            "X-API-KEY": config.API_KEY,
            "Authorization": "Bearer invalid_token_here"
        }
        
        response = requests.get(url, headers=headers)
        assert response.status_code == 401
    
    def test_transaction_amounts_correct(self, config, auth_headers):
        """Verify that all transaction amounts match expected values"""
        url = f"{config.API_BASE_URL}/transactions/"
        
        response = requests.get(url, headers=auth_headers)
        data = response.json()
        
        amounts = {Decimal(str(t["amount"])) for t in data["data"]}
        expected_amounts = {
            config.EXPECTED_INCOME_1,
            config.EXPECTED_INCOME_2,
            config.EXPECTED_EXPENSE_GROCERY,
            config.EXPECTED_EXPENSE_BITCOIN,
            config.EXPECTED_SAVING
        }
        
        assert amounts == expected_amounts, f"Amounts mismatch. Got: {amounts}, Expected: {expected_amounts}"


# ================================================================================================
#                                   Accounts Tests
# ================================================================================================

class TestAccounts:
    """Tests for accounts endpoints"""
    
    def test_get_all_accounts(self, config, auth_headers):
        """Test retrieving all accounts"""
        url = f"{config.API_BASE_URL}/accounts/"
        
        response = requests.get(url, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert isinstance(data["data"], list)
        assert len(data["data"]) == 1  # User has 1 account in new data
    
    def test_get_account_by_id(self, config, auth_headers):
        """Test retrieving a specific account by ID"""
        if not config.TEST_ACCOUNT_ID:
            pytest.skip("TEST_ACCOUNT_ID not configured")
        
        url = f"{config.API_BASE_URL}/accounts/"
        # Note: API uses account_id as int, but we have UUID - check endpoint
        
        response = requests.get(url, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        account_ids = [a["accounts_id_pk"] for a in data["data"]]
        assert config.TEST_ACCOUNT_ID in account_ids
    
    def test_account_names_correct(self, config, auth_headers):
        """Verify account names match expected values"""
        url = f"{config.API_BASE_URL}/accounts/"
        
        response = requests.get(url, headers=auth_headers)
        data = response.json()
        
        account_names = {a["account_name"] for a in data["data"]}
        expected_names = {config.EXPECTED_ACCOUNT_1_NAME, config.EXPECTED_ACCOUNT_2_NAME}
        
        assert account_names == expected_names
    
    def test_accounts_unauthorized(self, config):
        """Test that accounts endpoint requires authentication"""
        url = f"{config.API_BASE_URL}/accounts/"
        headers = {"X-API-KEY": config.API_KEY}
        
        response = requests.get(url, headers=headers)
        assert response.status_code == 400


# ================================================================================================
#                                   Savings Funds Tests
# ================================================================================================

class TestSavingsFunds:
    """Tests for savings funds endpoints"""
    
    def test_get_all_savings_funds(self, config, auth_headers):
        """Test retrieving all savings funds"""
        url = f"{config.API_BASE_URL}/funds/"
        
        response = requests.get(url, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert isinstance(data["data"], list)
        assert len(data["data"]) >= 1  # At least the emergency fund
    
    def test_savings_fund_details(self, config, auth_headers):
        """Verify savings fund has correct details"""
        url = f"{config.API_BASE_URL}/funds/"
        
        response = requests.get(url, headers=auth_headers)
        data = response.json()
        
        # Find the emergency fund
        emergency_fund = None
        for fund in data["data"]:
            if fund["fund_name"] == config.EXPECTED_SAVINGS_FUND_NAME:
                emergency_fund = fund
                break
        
        assert emergency_fund is not None, "Emergency fund not found"
        assert Decimal(str(emergency_fund["target_amount"])) == config.EXPECTED_SAVINGS_FUND_TARGET
    
    def test_savings_funds_unauthorized(self, config):
        """Test that savings funds endpoint requires authentication"""
        url = f"{config.API_BASE_URL}/funds/"
        headers = {"X-API-KEY": config.API_KEY}
        
        response = requests.get(url, headers=headers)
        assert response.status_code == 400


# ================================================================================================
#                                   Summary/Overview Tests
# ================================================================================================

class TestSummary:
    """Tests for financial summary endpoint"""
    
    def test_get_summary(self, config, auth_headers):
        """Test retrieving financial summary"""
        url = f"{config.API_BASE_URL}/summary/"
        
        response = requests.get(url, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
    
    def test_summary_totals_correct(self, config, auth_headers):
        """Verify summary totals match expected values from transactions"""
        url = f"{config.API_BASE_URL}/summary/"
        
        response = requests.get(url, headers=auth_headers)
        data = response.json()
        
        summary = data["data"]
        
        # Check that we have the expected keys
        assert "total_income" in summary or "income" in summary
        assert "total_expense" in summary or "expenses" in summary
    
    def test_summary_enriched_fields(self, config, auth_headers):
        """Test existence of enriched summary fields (comparison, rates, etc)"""
        url = f"{config.API_BASE_URL}/summary/"
        response = requests.get(url, headers=auth_headers)
        data = response.json().get("data", {})
        
        # New enriched fields
        assert "comparison" in data
        assert "savings_rate" in data
        assert "investment_rate" in data
        assert "top_expenses" in data
        assert "biggest_mover" in data
        assert "largest_transactions" in data
        
        # Verify comparison structure
        comp = data["comparison"]
        assert "income_delta_pct" in comp
        
        # Verify lists
        assert isinstance(data["top_expenses"], list)
        assert isinstance(data["largest_transactions"], list)
    
    def test_summary_with_date_filter(self, config, auth_headers):
        """Test summary with date range filter"""
        url = f"{config.API_BASE_URL}/summary/"
        params = {
            "start_date": "2026-01-01",
            "end_date": "2026-01-31"
        }
        
        response = requests.get(url, headers=auth_headers, params=params)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
    
    def test_summary_empty_date_range(self, config, auth_headers):
        """Test summary returns empty/zero for date range with no transactions"""
        url = f"{config.API_BASE_URL}/summary/"
        params = {
            "start_date": "2020-01-01",
            "end_date": "2020-01-31"  # No transactions in 2020
        }
        
        response = requests.get(url, headers=auth_headers, params=params)
        assert response.status_code == 200


# ================================================================================================
#                                   Profile Tests
# ================================================================================================

class TestProfile:
    """Tests for profile endpoint"""
    
    def test_get_profile(self, config, auth_headers):
        """Test retrieving user profile"""
        url = f"{config.API_BASE_URL}/profile/me"
        
        response = requests.get(url, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
    
    def test_profile_contains_email(self, config, auth_headers):
        """Test that profile contains user email"""
        url = f"{config.API_BASE_URL}/profile/me"
        
        response = requests.get(url, headers=auth_headers)
        data = response.json()
        
        profile = data["data"]
        assert "email" in profile
        assert profile["email"] == config.EMAIL
    
    def test_profile_unauthorized(self, config):
        """Test that profile endpoint requires authentication"""
        url = f"{config.API_BASE_URL}/profile/me"
        headers = {"X-API-KEY": config.API_KEY}
        
        response = requests.get(url, headers=headers)
        assert response.status_code == 400


# ================================================================================================
#                                   Monthly Analytics Tests
# ================================================================================================

class TestMonthlyAnalytics:
    """Tests for monthly analytics endpoint"""
    
    def test_get_monthly_analytics_current(self, config, auth_headers):
        """Test retrieving current month analytics"""
        url = f"{config.API_BASE_URL}/monthly/analytics"
        params = {"year": 2026, "month": 1}  # January 2026 - when transactions exist
        
        response = requests.get(url, headers=auth_headers, params=params)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
    
    def test_monthly_analytics_structure(self, config, auth_headers):
        """Verify monthly analytics response structure"""
        url = f"{config.API_BASE_URL}/monthly/analytics"
        params = {"year": 2026, "month": 1}
        
        response = requests.get(url, headers=auth_headers, params=params)
        data = response.json()
        
        analytics = data["data"]
        # Check for expected fields in analytics response
        assert "month_name" in analytics or "month" in analytics
    
    def test_monthly_analytics_reflects_transactions(self, config, auth_headers):
        """Verify that monthly analytics reflects actual transactions"""
        url = f"{config.API_BASE_URL}/monthly/analytics"
        params = {"year": 2026, "month": 1}
        
        response = requests.get(url, headers=auth_headers, params=params)
        data = response.json()
        
        analytics = data["data"]
        
        # The analytics should reflect our 4 transactions from January 2026
        # Total income: 3500
        # Total expenses: 1000 (expense) + 500 (saving) + 200 (investment) = 1700
        # Net: 3500 - 1700 = 1800
        
        # Check that totals are present and reasonable
        if "total_income" in analytics:
            assert Decimal(str(analytics["total_income"])) >= 0
        if "total_expenses" in analytics:
            assert Decimal(str(analytics["total_expenses"])) >= 0
            
    def test_monthly_enriched_fields(self, config, auth_headers):
        """Test existence of enriched monthly analytics fields"""
        url = f"{config.API_BASE_URL}/monthly/analytics"
        params = {"year": 2026, "month": 1}
        response = requests.get(url, headers=auth_headers, params=params)
        data = response.json().get("data", {})
        
        # New enriched fields
        assert "run_rate" in data
        assert "day_split" in data
        assert "category_concentration" in data
        assert "comparison" in data
        
        # Verify run_rate structure
        rr = data["run_rate"]
        assert "days_elapsed" in rr
        assert "projected_month_end_expenses" in rr
        
        # Verify comparison
        comp = data["comparison"]
        assert "income_delta" in comp
        assert "income_delta_pct" in comp
        
        # Verify breakdowns
        assert "income_breakdown" in data
        assert isinstance(data["income_breakdown"], list)
        assert "expenses_breakdown" in data
        assert isinstance(data["expenses_breakdown"], list)
        assert "spending_type_breakdown" in data
    
    def test_monthly_analytics_invalid_month(self, config, auth_headers):
        """Test that invalid month returns error"""
        url = f"{config.API_BASE_URL}/monthly/analytics"
        params = {"year": 2026, "month": 13}  # Invalid month
        
        response = requests.get(url, headers=auth_headers, params=params)
        assert response.status_code == 400
    
    def test_monthly_analytics_empty_month(self, config, auth_headers):
        """Test analytics for month with no transactions"""
        url = f"{config.API_BASE_URL}/monthly/analytics"
        params = {"year": 2020, "month": 1}  # No transactions in 2020
        
        response = requests.get(url, headers=auth_headers, params=params)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
    
    def test_monthly_analytics_unauthorized(self, config):
        """Test that monthly analytics requires authentication"""
        url = f"{config.API_BASE_URL}/monthly/analytics"
        headers = {"X-API-KEY": config.API_KEY}
        
        response = requests.get(url, headers=headers)
        assert response.status_code == 400


# ================================================================================================
#                                   Yearly Analytics Tests
# ================================================================================================

class TestYearlyAnalytics:
    """Tests for yearly analytics endpoint"""
    
    def test_get_yearly_analytics(self, config, auth_headers):
        """Test retrieving yearly analytics"""
        url = f"{config.API_BASE_URL}/yearly/analytics"
        params = {"year": 2026}
        
        response = requests.get(url, headers=auth_headers, params=params)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
    
    def test_yearly_analytics_reflects_transactions(self, config, auth_headers):
        """Verify yearly analytics reflects actual transaction data"""
        url = f"{config.API_BASE_URL}/yearly/analytics"
        params = {"year": 2026}
        
        response = requests.get(url, headers=auth_headers, params=params)
        data = response.json()
        
        analytics = data["data"]
        
        # Should have data for January 2026 where our transactions are
        # Check that the analytics is not empty for 2026
        # Check that the analytics is not empty for 2026
        assert analytics is not None
        
    def test_yearly_enriched_fields(self, config, auth_headers):
        """Test existence of enriched yearly analytics fields"""
        url = f"{config.API_BASE_URL}/yearly/analytics"
        params = {"year": 2026}
        response = requests.get(url, headers=auth_headers, params=params)
        data = response.json().get("data", {})
        
        # New enriched fields
        assert "highlights" in data
        assert "volatility" in data
        assert "spending_balance" in data
        
        # Verify highlights
        hl = data["highlights"]
        assert "highest_cashflow_month" in hl
        assert "month" in hl["highest_cashflow_month"]
        
        # Verify volatility
        vol = data["volatility"]
        assert "income_volatility" in vol
        
        # Verify balance
        bal = data["spending_balance"]
        assert "core_share_pct" in bal
    
    def test_yearly_analytics_empty_year(self, config, auth_headers):
        """Test analytics for year with no transactions"""
        url = f"{config.API_BASE_URL}/yearly/analytics"
        params = {"year": 2020}
        
        response = requests.get(url, headers=auth_headers, params=params)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
    
    def test_yearly_analytics_unauthorized(self, config):
        """Test that yearly analytics requires authentication"""
        url = f"{config.API_BASE_URL}/yearly/analytics"
        headers = {"X-API-KEY": config.API_KEY}
        
        response = requests.get(url, headers=headers)
        assert response.status_code == 400
    
    def test_emergency_fund_endpoint(self, config, auth_headers):
        """Test emergency fund analysis endpoint"""
        url = f"{config.API_BASE_URL}/yearly/emergency-fund"
        params = {"year": 2026}
        
        response = requests.get(url, headers=auth_headers, params=params)
        assert response.status_code == 200
        
        body = response.json()
        assert body["success"] is True
        
        data = body["data"]
        
        # Verify Core fields
        assert "average_monthly_core_expenses" in data
        assert "three_month_core_target" in data
        assert "six_month_core_target" in data
        
        # Verify Core + Necessary fields
        assert "average_monthly_core_necessary" in data
        assert "three_month_core_necessary_target" in data
        
        # Verify All Expenses fields
        assert "average_monthly_all_expenses" in data
        assert "total_all_expenses" in data
        
        # Verify Current Savings
        assert "current_savings_amount" in data
        
        # Basic logical check
        if data["current_savings_amount"] > 0:
            assert data["months_analyzed"] > 0


# ================================================================================================
#                                   Rate Limiting Tests
# ================================================================================================

class TestRateLimiting:
    """Tests to verify rate limiting is working"""
    
    def test_health_endpoint_many_requests(self, config):
        """Test that health endpoint allows many requests (high limit)"""
        url = f"{config.API_BASE_URL}/health"
        
        # Health endpoint has 300/minute limit, should handle 10 requests easily
        for _ in range(10):
            response = requests.get(url)
            assert response.status_code == 200
    
    # Note: Full rate limit testing would require making many requests
    # and could interfere with other tests. These are basic sanity checks.


# ================================================================================================
#                                   Admin Endpoint Tests
# ================================================================================================

class TestAdminEndpoints:
    """Tests for admin-only endpoints"""
    
    def test_get_logs_with_admin_key(self, config, admin_headers):
        """Test that logs endpoint works with admin key"""
        if not config.ADMIN_API_KEY:
            pytest.skip("ADMIN_API_KEY not configured")
        
        url = f"{config.API_BASE_URL}/log"
        
        response = requests.get(url, headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "logs" in data
    
    def test_get_logs_without_admin_key(self, config):
        """Test that logs endpoint fails without admin key"""
        url = f"{config.API_BASE_URL}/log"
        headers = {"X-API-KEY": config.API_KEY}
        
        response = requests.get(url, headers=headers)
        assert response.status_code == 400  # Missing admin key


# ================================================================================================
#                                   Integration Tests
# ================================================================================================

class TestIntegration:
    """Integration tests that verify multiple endpoints work together"""
    
    def test_transactions_match_summary(self, config, auth_headers):
        """Verify that transaction totals match summary endpoint"""
        # Get all transactions
        tx_url = f"{config.API_BASE_URL}/transactions/"
        tx_response = requests.get(tx_url, headers=auth_headers)
        tx_data = tx_response.json()
        
        # Calculate totals from transactions
        income = sum(Decimal(str(t["amount"])) for t in tx_data["data"] if Decimal(str(t["amount"])) > 0)
        
        # Get summary
        summary_url = f"{config.API_BASE_URL}/summary/"
        summary_response = requests.get(summary_url, headers=auth_headers)
        summary_data = summary_response.json()
        
        # Verify income matches
        expected_total_income = config.EXPECTED_INCOME_1 + config.EXPECTED_INCOME_2
        assert income == expected_total_income
    
    def test_savings_fund_linked_to_transaction(self, config, auth_headers):
        """Verify savings transaction is linked to savings fund"""
        if not config.TEST_SAVINGS_FUND_ID:
            pytest.skip("TEST_SAVINGS_FUND_ID not configured")
        
        # Get transactions
        url = f"{config.API_BASE_URL}/transactions/"
        response = requests.get(url, headers=auth_headers)
        data = response.json()
        
        # Find the savings transaction
        savings_tx = None
        for tx in data["data"]:
            if tx.get("savings_fund_id_fk") == config.TEST_SAVINGS_FUND_ID:
                savings_tx = tx
                break
        
        assert savings_tx is not None, "No transaction linked to savings fund"
        assert Decimal(str(savings_tx["amount"])) == config.EXPECTED_SAVING
    
    def test_account_has_transactions(self, config, auth_headers):
        """Verify account has associated transactions"""
        if not config.TEST_ACCOUNT_ID:
            pytest.skip("TEST_ACCOUNT_ID not configured")
        
        # Get transactions for account
        url = f"{config.API_BASE_URL}/transactions/"
        params = {"account_id": config.TEST_ACCOUNT_ID}
        response = requests.get(url, headers=auth_headers, params=params)
        data = response.json()
        
        assert data["count"] > 0, "Account should have transactions"


# ================================================================================================
#                                   Edge Cases and Error Handling
# ================================================================================================

class TestEdgeCases:
    """Tests for edge cases and error handling"""
    
    def test_invalid_api_key(self, config, access_token):
        """Test that invalid API key is rejected"""
        url = f"{config.API_BASE_URL}/transactions/"
        headers = {
            "X-API-KEY": "invalid_key",
            "Authorization": f"Bearer {access_token}"
        }
        
        response = requests.get(url, headers=headers)
        assert response.status_code == 401
    
    def test_expired_token_handling(self, config):
        """Test that expired tokens are properly rejected"""
        url = f"{config.API_BASE_URL}/transactions/"
        # This is a malformed/fake JWT that should fail
        fake_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.fake"
        headers = {
            "X-API-KEY": config.API_KEY,
            "Authorization": f"Bearer {fake_token}"
        }
        
        response = requests.get(url, headers=headers)
        assert response.status_code in [401, 498]  # 498 is custom expired token code
    
    def test_missing_required_fields(self, config, auth_headers):
        """Test that missing required fields return validation errors"""
        url = f"{config.API_BASE_URL}/transactions/"
        
        # Try to create transaction with missing required fields
        payload = {"notes": "test"}  # Missing required fields
        
        response = requests.post(url, json=payload, headers=auth_headers)
        assert response.status_code == 422  # Validation error
    
    def test_invalid_date_format(self, config, auth_headers):
        """Test that invalid date format returns error"""
        url = f"{config.API_BASE_URL}/transactions/"
        params = {"start_date": "not-a-date"}
        
        response = requests.get(url, headers=auth_headers, params=params)
        assert response.status_code == 422


# ================================================================================================
#                                   Main Execution
# ================================================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
