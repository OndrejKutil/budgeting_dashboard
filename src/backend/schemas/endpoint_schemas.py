from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date as Date, datetime
from decimal import Decimal
from enum import Enum


# ================================================================================================
#                                   Data Schemas
# ================================================================================================

class TransactionData(BaseModel):
    """Schema for individual transaction data"""
    id: str = Field(None, description="Transaction ID")
    user_id: str = Field(None, description="User ID who owns this transaction")
    account_id: str = Field(..., description="Account id associated with the transaction")
    category_id: int = Field(..., description="Transaction category id")
    amount: Decimal = Field(..., description="Transaction amount")
    date: Date = Field(..., description="Transaction date")
    notes: Optional[str] = Field(None, description="Transaction description")
    created_at: Optional[datetime] = Field(None, description="Record creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Record update timestamp")
    
    
    class Config:
        # Allow Decimal to be serialized as float in JSON
        json_encoders = {
            Decimal: float
        }
        # Example for documentation
        json_schema_extra = {
            "example": {
                "id": "",
                "user_id": "",
                "account_id": "",
                "category_id": 1,
                "amount": 100.00,
                "date": "2025-01-15",
                "notes": "",
                "created_at": "2025-01-15T10:30:00Z",
                "updated_at": "2025-01-15T10:30:00Z"
            }
        }

class CategoryType(str, Enum):
    """Enum for category types"""
    EXPENSE = "expense"
    INCOME = "income"
    TRANSFER = "transfer"
    SAVING = "saving"
    INVESTMENT = "investment"
    EXCLUDE = "exclude"

    def __str__(self):
        return self.value
    

class SpendingType(str, Enum):
    """Enum for spending types"""
    CORE = "Core"
    FUN = "Fun"
    FUTURE = "Future"
    INCOME = "Income"

    def __str__(self):
        return self.value


class CategoryData(BaseModel):
    """Schema for individual category data"""
    id: int = Field(..., description="Category ID")
    name: str = Field(..., description="Category name")
    type: CategoryType = Field(..., description="Category type (expense, income, etc.)")
    is_active: Optional[bool] = Field(True, description="Indicates if the category is active")
    spending_type: Optional[SpendingType] = Field(None, description="Type of spending associated with the category")
    created_at: Optional[datetime] = Field(None, description="Record creation timestamp")


class AccountData(BaseModel):
    """Schema for individual account data"""
    id: str = Field(..., description="Account ID")
    user_id: Optional[str] = Field(None, description="User ID who owns this account")
    name: str = Field(..., description="Account name")
    type: str = Field(..., description="Type of the account (e.g., 'checking', 'savings')")
    currency: Optional[str] = Field(..., description="Currency of the account")
    created_at: Optional[datetime] = Field(None, description="Record creation timestamp")


# ================================================================================================
#                                        Get Schemas
# ================================================================================================

class AllDataResponse(BaseModel):
    data: List[TransactionData] = Field(..., description="List of transaction records")
    count: int = Field(..., description="Total number of records returned")
    
    class Config:
        json_schema_extra = {
            "example": {
                "data": [
                    {
                        "id": "1",
                        "user_id": "user123",
                        "account_id": "acc456",
                        "category_id": 2,
                        "amount": 49.99,
                        "date": "2025-01-15",
                        "notes": "Weekly grocery shopping",
                        "created_at": "2025-01-15T10:30:00Z",
                        "updated_at": "2025-01-15T10:30:00Z"
                    },
                    {
                        "id": "2",
                        "user_id": "user123",
                        "account_id": "acc789",
                        "category_id": 3,
                        "amount": 19.99,
                        "date": "2025-01-16",
                        "notes": "Coffee with friends",
                        "created_at": "2025-01-16T11:00:00Z",
                        "updated_at": "2025-01-16T11:00:00Z"
                    }
                ],
                "count": 2,
            }
        }


class RefreshTokenResponse(BaseModel):
    """Response schema for token refresh endpoint"""
    user: Optional[dict] = Field(None, description="User information after refresh")
    session: Optional[dict] = Field(None, description="Session information after refresh")


class CategoriesResponse(BaseModel):
    data: List[CategoryData] = Field(..., description="List of category records")
    count: int = Field(..., description="Total number of records returned")

    class Config:
        json_schema_extra = {
            "example": {
                "data": [
                    {
                        "id": "1",
                        "name": "Groceries",
                        "type": CategoryType.EXPENSE,
                        "spending_type": SpendingType.CORE,
                        "is_active": True,
                        "created_at": "2025-01-15T10:30:00Z",
                    },
                    {
                        "id": "2",
                        "notes": "Coffee with friends",
                        "created_at": "2025-01-16T11:00:00Z",
                        "updated_at": "2025-01-16T11:00:00Z"
                    }
                ],
                "count": 2,
        }}


class AccountsResponse(BaseModel):
    """Response schema for accounts endpoint"""
    data: List[AccountData] = Field(..., description="List of account records")
    count: int = Field(..., description="Total number of records returned")

    class Config:
        json_encoders = {
            Decimal: float
        }
        json_schema_extra = {
            "example": {
                "data": [
                    {
                        "id": "acc456",
                        "user_id": "user123",
                        "name": "Main Checking Account",
                        "type": "checking",
                        "currency": "USD",
                        "created_at": "2025-01-15T10:30:00Z"
                    },
                    {
                        "id": "acc789",
                        "user_id": "user123",
                        "name": "Savings Account",
                        "type": "savings",
                        "currency": "USD",
                        "created_at": "2025-01-16T11:00:00Z"
                    }
                ],
                "count": 2,
            }
        }

# ================================================================================================
#                                   Insert Schemas
# ================================================================================================

class TransactionRequest(BaseModel):
    account_id: str = Field(..., description="Account ID associated with the transaction")
    category_id: int = Field(..., description="Transaction category ID")
    amount: Decimal = Field(..., description="Transaction amount")
    date: Date = Field(..., description="Transaction date")
    notes: Optional[str] = Field(None, description="Transaction description")
    is_transfer: Optional[bool] = Field(False, description="Indicates if this is a transfer transaction")
    created_at: Optional[datetime] = Field(None, description="Record creation timestamp")

    class Config:
        # Allow Decimal to be serialized as float in JSON
        json_encoders = {
            Decimal: float
        }
        # Example for documentation
        json_schema_extra = {
            "example": {
                "account_id": "",
                "category_id": 2,
                "amount": 49.99,
                "date": "2025-01-15",
                "notes": "",
                "is_transfer": False,
                "created_at": "2025-01-15T10:30:00Z"
            }
        }


class AccountRequest(BaseModel):
    """Schema for creating a new account"""
    name: str = Field(..., description="Name of the account")
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
                "name": "",
                "type": "",
                "currency": "",
                "created_at": "2025-01-15T10:30:00Z"
            }
        }



class SummaryData(BaseModel):
    """Schema for financial summary data"""
    total_income: float = Field(..., description="Total income amount")
    total_expense: float = Field(..., description="Total expense amount")
    total_saving: float = Field(..., description="Total saving amount")
    total_investment: float = Field(..., description="Total investment amount")
    profit: float = Field(..., description="Profit (income - expenses)")
    net_cash_flow: float = Field(..., description="Net cash flow (income - expenses - savings - investments)")
    by_category: dict = Field(..., description="Summary grouped by category name")

    class Config:
        json_schema_extra = {
            "example": {
                "total_income": 5000.00,
                "total_expense": 3500.00,
                "total_saving": 1000.00,
                "total_investment": 500.00,
                "profit": 1500.00,
                "net_cash_flow": 0.00,
                "by_category": {
                    "Salary": 5000.00,
                    "Groceries": -800.00,
                    "Utilities": -300.00
                }
            }
        }


class SummaryResponse(BaseModel):
    """Response schema for summary endpoint"""
    data: SummaryData = Field(..., description="Financial summary data")

    class Config:
        json_schema_extra = {
            "example": {
                "data": {
                    "total_income": 5000.00,
                    "total_expense": 3500.00,
                    "total_saving": 1000.00,
                    "total_investment": 500.00,
                    "profit": 1500.00,
                    "net_cash_flow": 0.00,
                    "by_category": {
                        "Salary": 5000.00,
                        "Groceries": -800.00,
                        "Utilities": -300.00
                    },
                    "by_account": {
                        "Main Checking": 2500.00,
                        "Savings Account": 1000.00
                    }
                }
            }
        }


# ================================================================================================
#                                   Error Schemas
# ================================================================================================

# TODO: Define error schemas for consistent error responses