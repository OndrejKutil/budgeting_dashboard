from datetime import date as Date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict

# ================================================================================================
#                                   Insert Schemas
# ================================================================================================

class TransactionRequest(BaseModel):
    account_id_fk: str = Field(..., description="Account ID associated with the transaction")
    category_id_fk: int = Field(..., description="Transaction category ID")
    amount: Decimal = Field(..., description="Transaction amount")
    date: Date = Field(..., description="Transaction date")
    notes: Optional[str] = Field(None, description="Transaction description")
    created_at: Optional[datetime] = Field(None, description="Record creation timestamp")
    savings_fund_id_fk: Optional[str] = Field(None, description="Savings fund ID associated with the transaction")

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
                "savings_fund_id_fk": None
            }
        }
    )


class AccountRequest(BaseModel):
    """Schema for creating a new account"""
    account_name: str = Field(..., description="Name of the account")
    type: str = Field(..., description="Type of the account (e.g., 'checking', 'savings')")
    currency: Optional[str] = Field(..., description="Currency of the account")
    created_at: Optional[datetime] = Field(None, description="Record creation timestamp")

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
    created_at: Optional[datetime] = Field(None, description="Creation timestamp of the savings fund")

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
    full_name: Optional[str] = Field(None, description="User full name")
    currency: Optional[str] = Field(None, description="User preferred currency (e.g., USD, CZK)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "full_name": "John Doe",
                "currency": "CZK"
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
    is_active: Optional[bool] = Field(True, description="Whether the category is active")

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
    category_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Name of the category")
    type: Optional[str] = Field(None, description="Category type (expense, income, saving, investment, exclude)")
    spending_type: Optional[str] = Field(None, description="Spending type (Core, Necessary, Fun, Future, Income)")
    is_active: Optional[bool] = Field(None, description="Whether the category is active")

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
