from decimal import Decimal
from typing import Any, List, Optional

from pydantic import BaseModel, Field

from .base import (
    AccountData,
    CategoryData,
    CategoryType,
    EmergencyFundData,
    MonthlyAnalyticsData,
    ProfileData,
    SavingsFundsData,
    SpendingType,
    SummaryData,
    TransactionData,
    YearlyAnalyticsData,
    TokenData,
    IncomeRowResponse,
    ExpenseRowResponse,
    SavingsRowResponse,
    InvestmentRowResponse,
    BudgetSummaryResponse
)


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
                        "id_pk": "1",
                        "user_id_fk": "user123",
                        "account_id_fk": "acc456",
                        "category_id_fk": 2,
                        "amount": 49.99,
                        "date": "2025-01-15",
                        "notes": "Weekly grocery shopping",
                        "created_at": "2025-01-15T10:30:00Z",
                        "savings_fund_id_fk": None
                    },
                    {
                        "id_pk": "2",
                        "user_id_fk": "user123",
                        "account_id_fk": "acc789",
                        "category_id_fk": 3,
                        "amount": 19.99,
                        "date": "2025-01-16",
                        "notes": "Coffee with friends",
                        "created_at": "2025-01-16T11:00:00Z",
                        "savings_fund_id_fk": None
                    }
                ],
                "count": 2,
            }
        }


class RefreshTokenResponse(BaseModel):
    """Response schema for token refresh endpoint"""
    data: TokenData = Field(..., description="Token data after refresh")
    user: Optional[dict] = Field(None, description="User information after refresh")
    session: Optional[dict] = Field(None, description="Session information after refresh")
    success: bool = Field(..., description="Indicates if the request was successful")
    message: str = Field(..., description="Response message")


class CategoriesResponse(BaseModel):
    data: List[CategoryData] = Field(..., description="List of category records")
    count: int = Field(..., description="Total number of records returned")

    class Config:
        json_schema_extra = {
            "example": {
                "data": [
                    {
                        "categories_id_pk": "1",
                        "category_name": "Groceries",
                        "type": CategoryType.EXPENSE,
                        "spending_type": SpendingType.CORE,
                        "is_active": True,
                        "created_at": "2025-01-15T10:30:00Z",
                    },
                    {
                        "categories_id_pk": "2",
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
    success: bool = Field(..., description="Indicates if the request was successful")
    message: str = Field(..., description="Response message")

    class Config:
        json_encoders = {
            Decimal: float
        }
        json_schema_extra = {
            "example": {
                "data": [
                    {
                        "accounts_id_pk": "acc456",
                        "user_id_fk": "user123",
                        "account_name": "Main Checking Account",
                        "type": "checking",
                        "currency": "USD",
                        "created_at": "2025-01-15T10:30:00Z"
                    },
                    {
                        "accounts_id_pk": "acc789",
                        "user_id_fk": "user123",
                        "account_name": "Savings Account",
                        "type": "savings",
                        "currency": "USD",
                        "created_at": "2025-01-16T11:00:00Z"
                    }
                ],
                "count": 2,
            }
        }


class SummaryResponse(BaseModel):
    """Response schema for summary endpoint"""
    data: SummaryData = Field(..., description="Financial summary data")
    success: bool = Field(..., description="Indicates if the request was successful")
    message: str = Field(..., description="Response message")

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
                    }
                },
                "success": True,
                "message": "Financial summary retrieved successfully"
            }
        }


class MonthlyAnalyticsResponse(BaseModel):
    """Response schema for monthly analytics endpoint"""
    data: MonthlyAnalyticsData = Field(..., description="Monthly analytics data")
    success: bool = Field(..., description="Indicates if the request was successful")
    message: str = Field(..., description="Success message")

    class Config:
        json_schema_extra = {
            "example": {
                "data": {
                    "year": 2025,
                    "month": 1,
                    "month_name": "January",
                    "income": 5000.00,
                    "expenses": 2500.00,
                    "savings": 1000.00,
                    "investments": 500.00,
                    "profit": 2000.00,
                    "cashflow": 1000.00,
                    "daily_spending_heatmap": [
                        {"day": "2025-01-15", "amount": 125.50}
                    ],
                    "category_breakdown": [
                        {"category": "Salary", "total": 5000.00}
                    ],
                    "spending_type_breakdown": [
                        {"type": "Core", "amount": 1250.00}
                    ]
                },
                "success": True,
                "message": "Monthly analytics for January 2025 retrieved successfully"
            }
        }


class YearlyAnalyticsResponse(BaseModel):
    """Response schema for yearly analytics endpoint"""
    data: YearlyAnalyticsData = Field(..., description="Yearly analytics data")
    success: bool = Field(..., description="Indicates if the request was successful")
    message: str = Field(..., description="Response message")


class EmergencyFundResponse(BaseModel):
    """Response schema for emergency fund analysis endpoint"""
    data: EmergencyFundData = Field(..., description="Emergency fund analysis data")
    success: bool = Field(..., description="Indicates if the request was successful")
    message: str = Field(..., description="Response message")


class AccountSuccessResponse(BaseModel):
    """Response schema for account creation endpoint"""
    success: bool = Field(..., description="Indicates if the account creation was successful")
    message: str = Field(..., description="Success message for account creation")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Account created successfully"
            }
        }

class LoginResponse(BaseModel):
    """Response schema for login endpoint"""
    access_token: str = Field(..., description="Access token for authenticated requests")
    refresh_token: str = Field(..., description="Refresh token for obtaining new access tokens")
    user_id: str = Field(..., description="ID of the authenticated user")
    data: dict[Any, Any] = Field(..., description="Login response data containing user and session info")

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "access_token_value",
                "refresh_token": "refresh_token_value",
                "user_id": "user123",
                "data": {
                    "user": {
                        "id": "user123",
                        "email": "user@example.com"
                    },
                    "session": {
                        "access_token": "access_token_value",
                        "refresh_token": "refresh_token_value"
                    }
                }
            }
        }


class TransactionsResponse(BaseModel):
    """Response schema for transactions list endpoint"""
    data: List[TransactionData] = Field(..., description="List of transaction records")
    count: int = Field(..., description="Total number of records returned")
    success: bool = Field(..., description="Indicates if the request was successful")
    message: str = Field(..., description="Response message")

    class Config:
        json_schema_extra = {
            "example": {
                "data": [
                    {
                        "id_pk": "1",
                        "user_id_fk": "user123",
                        "account_id_fk": "acc456",
                        "category_id_fk": 2,
                        "amount": 49.99,
                        "date": "2025-01-15",
                        "notes": "Weekly grocery shopping",
                        "created_at": "2025-01-15T10:30:00Z",
                        "savings_fund_id_fk": None
                    }
                ],
                "count": 1,
                "success": True,
                "message": "Transactions retrieved successfully"
            }
        }


class TransactionSuccessResponse(BaseModel):
    """Response schema for transaction create/update/delete operations"""
    success: bool = Field(..., description="Indicates if the operation was successful")
    message: str = Field(..., description="Success/error message")
    data: Optional[List[TransactionData]] = Field(None, description="Transaction data if applicable")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Transaction created successfully",
                "data": [
                    {
                        "id_pk": "1",
                        "user_id_fk": "user123",
                        "account_id_fk": "acc456",
                        "category_id_fk": 2,
                        "amount": 49.99,
                        "date": "2025-01-15",
                        "notes": "Weekly grocery shopping",
                        "created_at": "2025-01-15T10:30:00Z",
                        "savings_fund_id_fk": None
                    }
                ]
            }
        }


class SavingsFundsResponse(BaseModel):
    """Response schema for savings funds list endpoint"""
    data: List[SavingsFundsData] = Field(..., description="List of savings fund records")
    count: int = Field(..., description="Total number of records returned")
    success: bool = Field(..., description="Indicates if the request was successful")
    message: str = Field(..., description="Response message")

    class Config:
        json_schema_extra = {
            "example": {
                "data": [
                    {
                        "savings_funds_id_pk": "123aaa",
                        "user_id_fk": "456user",
                        "fund_name": "Emergency Fund",
                        "target_amount": 5000,
                        "created_at": "2025-01-15T10:30:00Z"
                    }
                ],
                "count": 1,
                "success": True,
                "message": "Savings funds retrieved successfully"
            }
        }


class SavingsFundSuccessResponse(BaseModel):
    """Response schema for savings fund create/update/delete operations"""
    success: bool = Field(..., description="Indicates if the operation was successful")
    message: str = Field(..., description="Success/error message")
    data: Optional[List[SavingsFundsData]] = Field(None, description="Savings fund data if applicable")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Savings fund created successfully",
                "data": [
                    {
                        "savings_funds_id_pk": "123aaa",
                        "user_id_fk": "456user",
                        "fund_name": "Emergency Fund",
                        "target_amount": 5000,
                        "created_at": "2025-01-15T10:30:00Z"
                    }
                ]
            }
        }


class ProfileResponse(BaseModel):
    """Response schema for profile endpoint"""
    data: ProfileData = Field(..., description="User profile data")
    success: bool = Field(..., description="Indicates if the request was successful")
    message: str = Field(..., description="Response message")

    class Config:
        json_schema_extra = {
            "example": {
                "data": {
                    "id": "user123",
                    "email": "user@example.com",
                    "role": "authenticated"
                },
                "success": True,
                "message": "Profile retrieved successfully"
            }
        }

# ================================================================================================
#                                      Budget Schemas
# ================================================================================================

class BudgetResponse(BaseModel):
    summary: BudgetSummaryResponse = Field(..., description="Summary of the budget")
    income_rows: List[IncomeRowResponse] = Field(..., description="List of income budget rows")
    expense_rows: List[ExpenseRowResponse] = Field(..., description="List of expense budget rows")
    savings_rows: List[SavingsRowResponse] = Field(..., description="List of savings budget rows")
    investment_rows: List[InvestmentRowResponse] = Field(..., description="List of investment budget rows")
    success: bool = Field(..., description="Indicates if the request was successful")
    message: str = Field(..., description="Response message")

    class Config:
        ...
        # TODO: Add example if needed