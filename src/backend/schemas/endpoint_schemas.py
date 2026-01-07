from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import date as Date, datetime
from decimal import Decimal
from enum import Enum


# ================================================================================================
#                                   Data Schemas
# ================================================================================================

class TransactionData(BaseModel):
    """Schema for individual transaction data"""
    id_pk: str | None = Field(None, description="Transaction ID")
    user_id_fk: str | None = Field(None, description="User ID who owns this transaction")
    account_id_fk: str = Field(..., description="Account id associated with the transaction")
    category_id_fk: int = Field(..., description="Transaction category id")
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
                "id_pk": "",
                "user_id_fk": "",
                "account_id_fk": "",
                "category_id_fk": 1,
                "amount": 100.00,
                "date": "2025-01-15",
                "notes": "",
                "created_at": "2025-01-15T10:30:00Z",
                "savings_fund_id_fk": None
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
    NECESSARY = "Necessary"
    FUN = "Fun"
    FUTURE = "Future"
    INCOME = "Income"

    def __str__(self):
        return self.value


class CategoryData(BaseModel):
    """Schema for individual category data"""
    categories_id_pk: int = Field(..., description="Category ID")
    category_name: str = Field(..., description="Category name")
    type: CategoryType = Field(..., description="Category type (expense, income, etc.)")
    is_active: Optional[bool] = Field(True, description="Indicates if the category is active")
    spending_type: Optional[SpendingType] = Field(None, description="Type of spending associated with the category")
    created_at: Optional[datetime] = Field(None, description="Record creation timestamp")


class AccountData(BaseModel):
    """Schema for individual account data"""
    accounts_id_pk: str = Field(..., description="Account ID")
    user_id_fk: Optional[str] = Field(None, description="User ID who owns this account")
    account_name: str = Field(..., description="Account name")
    type: str = Field(..., description="Type of the account (e.g., 'checking', 'savings')")
    currency: Optional[str] = Field(..., description="Currency of the account")
    created_at: Optional[datetime] = Field(None, description="Record creation timestamp")

class UserData(BaseModel):
    """Schema for user registration data"""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password (min 8 characters)")
    full_name: Optional[str] = Field(None, description="User full name")

class LoginRequest(BaseModel):
    """Schema for user login credentials"""
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")

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


class SavingsFundsData(BaseModel):
    savings_funds_id_pk: str = Field(..., description="ID of the savings fund")
    user_id_fk: str = Field(..., description="ID of the user who owns the savings fund")
    fund_name: str = Field(..., description="Name of the savings fund")
    target_amount: int = Field(..., description="Target amount for the savings fund")
    created_at: Optional[str] = Field(..., description="Creation timestamp of the savings fund")

    class Config:
        json_schema_extra = {
            "example": {
                "savings_funds_id_pk": "123aaa",
                "user_id_fk": "456user",
                "fund_name": "Emergency Fund",
                "target_amount": 5000,
                "created_at": "2025-01-15T10:30:00Z"
            }
        }


class SavingsFundsRequest(BaseModel):
    """Request schema for creating or updating savings funds"""
    user_id_fk: str = Field(..., description="ID of the user who owns the savings fund")
    fund_name: str = Field(..., description="Name of the savings fund")
    target_amount: int = Field(..., description="Target amount for the savings fund")
    created_at: Optional[datetime] = Field(..., description="Creation timestamp of the savings fund")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "456user",
                "fund_name": "Emergency Fund",
                "target_amount": 5000
            }
        }


# ================================================================================================
#                                Monthly Analytics Schemas
# ================================================================================================

class DailySpendingData(BaseModel):
    """Schema for daily spending heatmap data"""
    day: str = Field(..., description="Date in YYYY-MM-DD format")
    amount: float = Field(..., description="Total spending amount for the day")

    class Config:
        json_schema_extra = {
            "example": {
                "day": "2025-01-15",
                "amount": 125.50
            }
        }


class CategoryBreakdownData(BaseModel):
    """Schema for category breakdown data"""
    category: str = Field(..., description="Category name")
    total: float = Field(..., description="Total amount for the category")

    class Config:
        json_schema_extra = {
            "example": {
                "category": "Groceries",
                "total": 450.75
            }
        }


class SpendingTypeBreakdownData(BaseModel):
    """Schema for spending type breakdown data"""
    type: str = Field(..., description="Spending type (Core, Fun, or Future)")
    amount: float = Field(..., description="Total amount for the spending type")

    class Config:
        json_schema_extra = {
            "example": {
                "type": "Core",
                "amount": 1250.00
            }
        }


class MonthlyAnalyticsData(BaseModel):
    """Schema for monthly analytics data"""
    year: int = Field(..., description="Year of the analysis")
    month: int = Field(..., description="Month of the analysis (1-12)")
    month_name: str = Field(..., description="Name of the month")
    income: float = Field(..., description="Total income for the month")
    expenses: float = Field(..., description="Total expenses for the month (absolute value)")
    savings: float = Field(..., description="Total savings for the month (absolute value)")
    investments: float = Field(..., description="Total investments for the month (absolute value)")
    profit: float = Field(..., description="Calculated profit (income + expenses + investments)")
    cashflow: float = Field(..., description="Calculated cashflow (income + expenses + investments + savings)")
    daily_spending_heatmap: List[DailySpendingData] = Field(..., description="Daily spending data for heatmap")
    category_breakdown: List[CategoryBreakdownData] = Field(..., description="Breakdown by category")
    spending_type_breakdown: List[SpendingTypeBreakdownData] = Field(..., description="Breakdown by spending type")

    class Config:
        json_schema_extra = {
            "example": {
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
                    {"day": "2025-01-15", "amount": 125.50},
                    {"day": "2025-01-16", "amount": 75.25}
                ],
                "category_breakdown": [
                    {"category": "Salary", "total": 5000.00},
                    {"category": "Groceries", "total": 450.75}
                ],
                "spending_type_breakdown": [
                    {"type": "Core", "amount": 1250.00},
                    {"type": "Fun", "amount": 300.00}
                ]
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


# ================================================================================================
#                                   Yearly Analytics Schemas
# ================================================================================================

class YearlyAnalyticsData(BaseModel):
    """Schema for yearly analytics data"""
    year: int = Field(..., description="Year of the analytics")
    total_income: float = Field(..., description="Total income for the year")
    total_expense: float = Field(..., description="Total expenses for the year")
    total_saving: float = Field(..., description="Total savings for the year")
    total_investment: float = Field(..., description="Total investments for the year")
    total_core_expense: float = Field(..., description="Total core expenses for the year")
    total_fun_expense: float = Field(..., description="Total fun expenses for the year")
    total_future_expense: float = Field(..., description="Total future expenses for the year")
    profit: float = Field(..., description="Profit (income - expenses)")
    net_cash_flow: float = Field(..., description="Net cash flow")
    savings_rate: float = Field(..., description="Savings rate as percentage of income")
    investment_rate: float = Field(..., description="Investment rate as percentage of income")
    months: List[str] = Field(..., description="Month names")
    monthly_income: List[float] = Field(..., description="Monthly income amounts")
    monthly_expense: List[float] = Field(..., description="Monthly expense amounts")
    monthly_saving: List[float] = Field(..., description="Monthly saving amounts")
    monthly_investment: List[float] = Field(..., description="Monthly investment amounts")
    monthly_core_expense: List[float] = Field(..., description="Monthly core expense amounts")
    monthly_fun_expense: List[float] = Field(..., description="Monthly fun expense amounts")
    monthly_future_expense: List[float] = Field(..., description="Monthly future expense amounts")
    monthly_savings_rate: List[float] = Field(..., description="Monthly savings rate percentages")
    monthly_investment_rate: List[float] = Field(..., description="Monthly investment rate percentages")
    by_category: dict[str, float] = Field(..., description="Breakdown by category")
    core_categories: dict[str, float] = Field(..., description="Core category breakdown")
    income_by_category: dict[str, float] = Field(..., description="Income breakdown by category")
    expense_by_category: dict[str, float] = Field(..., description="Expense breakdown by category")

    class Config:
        json_schema_extra = {
            "example": {
                "year": 2024,
                "total_income": 60000.00,
                "total_expense": 45000.00,
                "total_saving": 10000.00,
                "total_investment": 5000.00,
                "total_core_expense": 30000.00,
                "total_fun_expense": 15000.00,
                "total_future_expense": 5000.00,
                "profit": 15000.00,
                "net_cash_flow": 0.00,
                "savings_rate": 16.67,
                "investment_rate": 8.33,
                "months": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                "monthly_income": [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000],
                "monthly_expense": [3750, 3750, 3750, 3750, 3750, 3750, 3750, 3750, 3750, 3750, 3750, 3750],
                "monthly_saving": [833, 833, 833, 833, 833, 833, 833, 833, 833, 833, 833, 833],
                "monthly_investment": [417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417],
                "monthly_core_expense": [2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500],
                "monthly_fun_expense": [1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250],
                "monthly_future_expense": [417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417],
                "monthly_savings_rate": [16.67, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67],
                "monthly_investment_rate": [8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33],
                "by_category": {
                    "Salary": 60000.00,
                    "Rent": -18000.00,
                    "Groceries": -12000.00
                },
                "core_categories": {
                    "Rent": 18000.00,
                    "Groceries": 12000.00
                },
                "income_by_category": {
                    "Salary": 60000.00
                },
                "expense_by_category": {
                    "Rent": 18000.00,
                    "Groceries": 12000.00
                }
            }
        }


class YearlyAnalyticsResponse(BaseModel):
    """Response schema for yearly analytics endpoint"""
    data: YearlyAnalyticsData = Field(..., description="Yearly analytics data")
    success: bool = Field(..., description="Indicates if the request was successful")
    message: str = Field(..., description="Response message")


class EmergencyFundData(BaseModel):
    """Schema for emergency fund analysis data"""
    year: int = Field(..., description="Year of the analysis")
    average_monthly_core_expenses: float = Field(..., description="Average monthly core expenses")
    total_core_expenses: float = Field(..., description="Total core expenses for the year")
    three_month_fund_target: float = Field(..., description="Target amount for 3-month emergency fund")
    six_month_fund_target: float = Field(..., description="Target amount for 6-month emergency fund")
    core_category_breakdown: dict[str, float] = Field(..., description="Breakdown of core expenses by category")
    months_analyzed: int = Field(..., description="Number of months with data")

    class Config:
        json_schema_extra = {
            "example": {
                "year": 2024,
                "average_monthly_core_expenses": 2500.00,
                "total_core_expenses": 30000.00,
                "three_month_fund_target": 7500.00,
                "six_month_fund_target": 15000.00,
                "core_category_breakdown": {
                    "Rent": 18000.00,
                    "Groceries": 8000.00,
                    "Utilities": 4000.00
                },
                "months_analyzed": 12
            }
        }


class EmergencyFundResponse(BaseModel):
    """Response schema for emergency fund analysis endpoint"""
    data: EmergencyFundData = Field(..., description="Emergency fund analysis data")
    success: bool = Field(..., description="Indicates if the request was successful")
    message: str = Field(..., description="Response message")


# ================================================================================================
#                                   Error Schemas
# ================================================================================================

# TODO: Define error schemas for consistent error responses

# ================================================================================================
#                                   Message Schemas
# ================================================================================================

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


# ================================================================================================
#                                   Transactions Schemas
# ================================================================================================

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


# ================================================================================================
#                                   Savings Funds Schemas
# ================================================================================================

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


# ================================================================================================
#                                   Profile Schemas
# ================================================================================================

class IdentityData(BaseModel):
    """Schema for user identity provider data"""
    id: Optional[str] = Field(None, description="Identity ID")
    identity_id: Optional[str] = Field(None, description="Provider identity ID")
    user_id: Optional[str] = Field(None, description="Associated user ID")
    provider: Optional[str] = Field(None, description="Identity provider name")
    identity_data: Optional[dict] = Field(None, description="Provider-specific identity data")
    created_at: Optional[datetime] = Field(None, description="Identity creation timestamp")
    last_sign_in_at: Optional[datetime] = Field(None, description="Last sign in timestamp")
    updated_at: Optional[datetime] = Field(None, description="Identity update timestamp")


class ProfileData(BaseModel):
    """Schema for user profile data"""
    # Core identity
    id: Optional[str] = Field(None, description="User ID")
    aud: Optional[str] = Field(None, description="Audience claim")
    role: Optional[str] = Field(None, description="User role")
    is_anonymous: bool = Field(False, description="Whether user is anonymous")
    
    # Email information
    email: Optional[str] = Field(None, description="User email address")
    email_confirmed_at: Optional[datetime] = Field(None, description="Email confirmation timestamp")
    email_change_sent_at: Optional[datetime] = Field(None, description="Email change request timestamp")
    new_email: Optional[str] = Field(None, description="Pending new email address")
    
    # Phone information
    phone: Optional[str] = Field(None, description="User phone number")
    phone_confirmed_at: Optional[datetime] = Field(None, description="Phone confirmation timestamp")
    new_phone: Optional[str] = Field(None, description="Pending new phone number")
    
    # Authentication timestamps
    created_at: Optional[datetime] = Field(None, description="Account creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Profile update timestamp")
    last_sign_in_at: Optional[datetime] = Field(None, description="Last sign in timestamp")
    confirmed_at: Optional[datetime] = Field(None, description="Account confirmation timestamp")
    confirmation_sent_at: Optional[datetime] = Field(None, description="Confirmation email sent timestamp")
    recovery_sent_at: Optional[datetime] = Field(None, description="Recovery email sent timestamp")
    invited_at: Optional[datetime] = Field(None, description="Invitation sent timestamp")
    
    # Metadata
    app_metadata: Optional[dict] = Field(None, description="Application-specific metadata")
    user_metadata: Optional[dict] = Field(None, description="User-specific metadata")
    
    # Identity and security
    identities: Optional[List[IdentityData]] = Field(None, description="User identity providers")
    factors: Optional[List[dict]] = Field(None, description="MFA factors")
    action_link: Optional[str] = Field(None, description="Pending action link")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "user123",
                "aud": "authenticated",
                "role": "authenticated",
                "is_anonymous": False,
                "email": "user@example.com",
                "email_confirmed_at": "2025-01-15T10:30:00Z",
                "created_at": "2025-01-15T10:30:00Z",
                "last_sign_in_at": "2025-01-20T14:00:00Z",
                "app_metadata": {},
                "user_metadata": {"full_name": "John Doe"}
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