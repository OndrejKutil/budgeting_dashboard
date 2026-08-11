from datetime import date as Date
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

# ================================================================================================
#                                   Insert Schemas
# ================================================================================================

class TransactionRequest(BaseModel):
    account_id_fk: str = Field(..., description="Account ID associated with the transaction")
    category_id_fk: int = Field(..., description="Transaction category ID")
    amount: Decimal = Field(..., description="Transaction amount")
    date: Date = Field(..., description="Transaction date")
    notes: str | None = Field(None, description="Transaction description")
    created_at: datetime | None = Field(None, description="Record creation timestamp")
    savings_fund_id_fk: str | None = Field(None, description="Savings fund ID associated with the transaction")
    tags: list[int] | None = Field(None, description="Tag IDs to associate with this transaction")

    model_config = ConfigDict(
        # Allow Decimal to be serialized as float in JSON
        json_encoders={Decimal: float},
        # Example for documentation
        json_schema_extra={
            "example": {
                "account_id_fk": "",
                "category_id_fk": 2,
                "amount": 49.99,
                "date": "2025-01-15",
                "notes": "",
                "created_at": "2025-01-15T10:30:00Z",
                "savings_fund_id_fk": None,
                "tags": []
            }
        }
    )


class ImportTransactionsRequest(BaseModel):
    """
    Request schema for POST /screenshot-import/import.

    Each row is exactly what a single POST /transactions/ would accept -- this just inserts
    them together so the review screen doesn't need one request per draft.
    """
    transactions: list[TransactionRequest] = Field(
        ..., min_length=1, description="Reviewed drafts to save as real transactions"
    )


class TagRequest(BaseModel):
    """Schema for creating a new tag"""
    tag_name: str = Field(..., min_length=1, max_length=100, description="Name of the tag")


class TagUpdateRequest(BaseModel):
    """Schema for updating an existing tag"""
    tag_name: str = Field(..., min_length=1, max_length=100, description="New name for the tag")


class AccountRequest(BaseModel):
    """Schema for creating a new account"""
    account_name: str = Field(..., description="Name of the account")
    type: str = Field(..., description="Type of the account (e.g., 'checking', 'savings')")
    currency: str | None = Field(..., description="Currency of the account")
    created_at: datetime | None = Field(None, description="Record creation timestamp")
    account_is_active: bool | None = Field(None, description="Whether the account is active")

    model_config = ConfigDict(
        # Allow Decimal to be serialized as float in JSON
        json_encoders={Decimal: float},
        # Example for documentation
        json_schema_extra={
            "example": {
                "account_name": "",
                "type": "",
                "currency": "",
                "created_at": "2025-01-15T10:30:00Z"
            }
        }
    )

class LoginRequest(BaseModel):
    """Schema for user login credentials"""
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class SavingsFundsRequest(BaseModel):
    """Request schema for creating or updating savings funds"""
    user_id_fk: str = Field(..., description="ID of the user who owns the savings fund")
    fund_name: str = Field(..., description="Name of the savings fund")
    target_amount: int = Field(..., description="Target amount for the savings fund")
    created_at: datetime | None = Field(None, description="Creation timestamp of the savings fund")
    fund_is_active: bool | None = Field(None, description="Whether the savings fund is active")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "456user",
                "fund_name": "Emergency Fund",
                "target_amount": 5000
            }
        }
    )


class UpdateProfileRequest(BaseModel):
    """Schema for updating user profile"""
    full_name: str | None = Field(None, description="User full name")
    currency: str | None = Field(None, description="User preferred currency (e.g., USD, CZK)")
    locale: str | None = Field(None, description="User preferred locale (e.g., en-US, cs-CZ)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "full_name": "John Doe",
                "currency": "CZK",
                "locale": "cs-CZ"
            }
        }
    )


class DeleteAccountRequest(BaseModel):
    """
    Schema for confirming account deletion.

    Deletion is irreversible, so it requires proof of identity beyond the ambient JWT.
    Password-based accounts send their password; accounts that only have an OAuth identity have
    no password to give, so they confirm by typing their own email address instead. Exactly one
    of the two is required — which one is decided server-side from the user's linked identities.
    """
    password: str | None = Field(None, description="Current password (accounts with an email/password identity)")
    email_confirmation: str | None = Field(None, description="The account's own email address, typed to confirm (OAuth-only accounts)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "password": "current-password"
            }
        }
    )


class ForgotPasswordRequest(BaseModel):
    """Schema for requesting password reset email"""
    email: str = Field(..., description="User email address")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "user@example.com"
            }
        }
    )


class ResetPasswordRequest(BaseModel):
    """Schema for resetting password with access token"""
    access_token: str = Field(..., description="Access token from password reset email link")
    new_password: str = Field(..., min_length=6, description="New password (minimum 6 characters)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "new_password": "newSecurePassword123"
            }
        }
    )


class CategoryRequest(BaseModel):
    """Schema for creating a new category"""
    category_name: str = Field(..., min_length=1, max_length=100, description="Name of the category")
    type: str = Field(..., description="Category type (expense, income, saving, investment, exclude)")
    spending_type: str = Field(..., description="Spending type (Core, Necessary, Fun, Future, Income)")
    is_active: bool | None = Field(True, description="Whether the category is active")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "category_name": "Groceries",
                "type": "expense",
                "spending_type": "Necessary",
                "is_active": True
            }
        }
    )


class CategoryUpdateRequest(BaseModel):
    """Schema for updating an existing category"""
    category_name: str | None = Field(None, min_length=1, max_length=100, description="Name of the category")
    type: str | None = Field(None, description="Category type (expense, income, saving, investment, exclude)")
    spending_type: str | None = Field(None, description="Spending type (Core, Necessary, Fun, Future, Income)")
    is_active: bool | None = Field(None, description="Whether the category is active")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "category_name": "Housing",
                "type": "expense",
                "spending_type": "Core",
                "is_active": True
            }
        }
    )


# ================================================================================================
#                                   Dividend Calculator Requests
# ================================================================================================


class RecurringRequest(BaseModel):
    """Schema for creating or updating a recurring template"""
    account_id_fk: str = Field(..., description="Account ID")
    category_id_fk: int = Field(..., description="Category ID")
    savings_fund_id_fk: str | None = Field(None, description="Savings fund ID")
    amount: Decimal = Field(..., description="Transaction amount (signed)")
    cadence: str = Field(..., description="weekly|biweekly|monthly|quarterly|yearly")
    next_date: Date = Field(..., description="Next due date")
    notes: str | None = Field(None, description="Notes")
    is_active: bool | None = Field(True, description="Whether template is active")

    model_config = ConfigDict(json_encoders={Decimal: float})


class DividendPortfolioRequest(BaseModel):
    """Request schema for saving a user's dividend portfolio"""
    portfolio_value: Decimal = Field(..., ge=Decimal("0"), description="Total portfolio value")
    portfolio: list[dict] = Field(..., description="Array of DividendStockRow objects")

    model_config = ConfigDict(
        json_encoders={Decimal: float},
        json_schema_extra={
            "example": {
                "portfolio_value": 10000.00,
                "portfolio": [
                    {
                        "ticker": "AAPL",
                        "weight_pct": 50.0,
                        "dividend_yield": 0.55,
                        "yield_frequency": "annual"
                    },
                    {
                        "ticker": "JNJ",
                        "weight_pct": 50.0,
                        "dividend_yield": 3.0,
                        "yield_frequency": "annual"
                    }
                ]
            }
        }
    )
