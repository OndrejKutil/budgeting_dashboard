from datetime import date as Date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

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

    class Config:
        # Allow Decimal to be serialized as float in JSON
        json_encoders = {
            Decimal: float
        }
        # Example for documentation
        json_schema_extra = {
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


class AccountRequest(BaseModel):
    """Schema for creating a new account"""
    account_name: str = Field(..., description="Name of the account")
    type: str = Field(..., description="Type of the account (e.g., 'checking', 'savings')")
    currency: Optional[str] = Field(..., description="Currency of the account")
    created_at: Optional[datetime] = Field(None, description="Record creation timestamp")

    class Config:
        # Allow Decimal to be serialized as float in JSON
        json_encoders = {
            Decimal: float
        }
        # Example for documentation
        json_schema_extra = {
            "example": {
                "account_name": "",
                "type": "",
                "currency": "",
                "created_at": "2025-01-15T10:30:00Z"
            }
        }

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

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "456user",
                "fund_name": "Emergency Fund",
                "target_amount": 5000
            }
        }


class UpdateProfileRequest(BaseModel):
    """Schema for updating user profile"""
    full_name: Optional[str] = Field(None, description="User full name")
    currency: Optional[str] = Field(None, description="User preferred currency (e.g., USD, CZK)")

    class Config:
        json_schema_extra = {
            "example": {
                "full_name": "John Doe",
                "currency": "CZK"
            }
        }
