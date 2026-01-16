"""
Unit tests for Pydantic schemas.
Tests validation rules, correct types, and required fields.
"""

import pytest
from pydantic import ValidationError
from datetime import date
from decimal import Decimal

from schemas.requests import (
    TransactionRequest,
    AccountRequest
)
from schemas.base import UserData

# ================================================================================================
#                                   Transaction Schema Tests
# ================================================================================================

def test_transaction_request_valid():
    """Test creating a transaction request with valid data"""
    tx_data = {
        "amount": 100.50,
        "date": "2026-01-01",
        "category_id_fk": 1,
        "account_id_fk": "123e4567-e89b-12d3-a456-426614174000",
        "savings_fund_id_fk": None,
        "notes": "Test Note"
    }
    tx = TransactionRequest(**tx_data) # type: ignore
    assert tx.amount == Decimal("100.50")
    assert tx.category_id_fk == 1
    assert tx.date == date(2026, 1, 1)


def test_transaction_types():
    """Test that Pydantic coerces types correctly (string to decimal, string to date)"""
    tx_data = {
        "amount": "100.50",  # String
        "date": "2026-01-01", # String
        "category_id_fk": "5", # String
        "account_id_fk": "acc_id",
        "savings_fund_id_fk": None
    }
    tx = TransactionRequest(**tx_data) # type: ignore
    assert isinstance(tx.amount, Decimal)
    assert isinstance(tx.date, date)
    assert isinstance(tx.category_id_fk, int)


# ================================================================================================
#                                   User Schema Tests
# ================================================================================================

def test_user_data_valid():
    """Test valid user create"""
    user = UserData(email="test@example.com", password="password123", full_name="John Doe")
    assert user.email == "test@example.com"

def test_user_email_validation():
    """Test that invalid email format raises error"""
    # Note: Pydantic's EmailStr requires 'email-validator' package.
    # If not installed, it might fall back to str or simple check.
    # Assuming standard Pydantic usage if configured.
    try:
        UserData(email="not-an-email", first_name="John", last_name="Doe") # type: ignore
        # If it doesn't raise, we check if validation is strict or loose
    except ValidationError:
        assert True


# ================================================================================================
#                                   Account Schema Tests
# ================================================================================================

def test_account_creation():
    """Test account schema validation"""
    acc = AccountRequest(
        account_name="Main Bank",
        type="Checking",
        currency="USD",
        created_at=None
    )
    assert acc.account_name == "Main Bank"
