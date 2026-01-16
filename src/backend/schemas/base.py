from datetime import date as Date, datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field

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
    current_balance: Optional[float] = Field(0.0, description="Current balance of the account")
    net_flow_30d: Optional[float] = Field(0.0, description="Net flow of the account in the last 30 days")
    created_at: Optional[datetime] = Field(None, description="Record creation timestamp")

class UserData(BaseModel):
    """Schema for user registration data"""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password (min 8 characters)")
    full_name: Optional[str] = Field(None, description="User full name")

class CategoryInsight(BaseModel):
    """Schema for category insight data"""
    name: str = Field(..., description="Category name")
    total: float = Field(..., description="Total amount spent")
    share_of_total: float = Field(..., description="Percentage share of total expenses")


class PeriodComparison(BaseModel):
    """Schema for period-over-period comparison data"""
    income_delta: float = Field(..., description="Absolute change in income vs previous period")
    income_delta_pct: float = Field(..., description="Percentage change in income vs previous period")
    expense_delta: float = Field(..., description="Absolute change in expenses vs previous period")
    expense_delta_pct: float = Field(..., description="Percentage change in expenses vs previous period")
    saving_delta_pct: float = Field(..., description="Percentage change in savings vs previous period")
    investment_delta_pct: float = Field(..., description="Percentage change in investments vs previous period")
    profit_delta_pct: float = Field(..., description="Percentage change in profit vs previous period")
    cashflow_delta_pct: float = Field(..., description="Percentage change in cashflow vs previous period")


class SummaryData(BaseModel):
    """Schema for financial summary data"""
    total_income: float = Field(..., description="Total income amount")
    total_expense: float = Field(..., description="Total expense amount")
    total_saving: float = Field(..., description="Total saving amount")
    total_investment: float = Field(..., description="Total investment amount")
    profit: float = Field(..., description="Profit (income - expenses)")
    net_cash_flow: float = Field(..., description="Net cash flow (income - expenses - savings - investments)")
    
    # New fields
    comparison: PeriodComparison = Field(..., description="Period-over-period comparison metrics")
    savings_rate: float = Field(..., description="Savings rate as percentage of income")
    investment_rate: float = Field(..., description="Investment rate as percentage of income")
    top_expenses: List[CategoryInsight] = Field(..., description="Top 3 expense categories")
    biggest_mover: Optional[CategoryInsight] = Field(None, description="Category with largest absolute spending change vs previous period")
    largest_transactions: List[TransactionData] = Field(..., description="List of top 5 largest transactions")
    

    
    # by_category removed as requested

    class Config:
        json_schema_extra = {
            "example": {
                "total_income": 5000.00,
                "total_expense": 3500.00,
                "total_saving": 1000.00,
                "total_investment": 500.00,
                "profit": 1500.00,
                "net_cash_flow": 0.00,
                "comparison": {
                    "income_delta": 500.00,
                    "income_delta_pct": 11.1,
                    "expense_delta": -200.00,
                    "expense_delta_pct": -5.4,
                    "saving_delta": 100.00,
                    "investment_delta": 0.00,
                    "profit_delta": 700.00,
                    "cashflow_delta": 0.00
                },
                "savings_rate": 20.0,
                "investment_rate": 10.0,
                "top_expenses": [
                     {"name": "Rent", "total": 1500.0, "share_of_total": 42.8},
                     {"name": "Groceries", "total": 600.0, "share_of_total": 17.1},
                     {"name": "Utilities", "total": 200.0, "share_of_total": 5.7}
                ],
                "biggest_mover": {"name": "Travel", "total": 500.0, "share_of_total": 14.2},
                "largest_transactions": [],
                "by_category": {
                    "Salary": 5000.00,
                    "Groceries": -800.00,
                    "Utilities": -300.00
                }
            }
        }


class SavingsFundsData(BaseModel):
    savings_funds_id_pk: str = Field(..., description="ID of the savings fund")
    user_id_fk: str = Field(..., description="ID of the user who owns the savings fund")
    fund_name: str = Field(..., description="Name of the savings fund")
    target_amount: int = Field(..., description="Target amount for the savings fund")
    current_amount: Optional[float] = Field(0.0, description="Current amount in the savings fund")
    net_flow_30d: Optional[float] = Field(0.0, description="Net flow of the savings fund in the last 30 days")
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

class TokenData(BaseModel):
    access_token: str = Field(..., description="Access token")
    refresh_token: str = Field(..., description="Refresh token")
    user_id: str = Field(..., description="User ID")

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



class RunRateForecast(BaseModel):
    """Schema for run-rate and forecast data"""
    average_daily_spend: float = Field(..., description="Average daily spending so far")
    projected_month_end_expenses: float = Field(..., description="Projected total expenses for the month")
    days_elapsed: int = Field(..., description="Number of days elapsed in the month")
    days_remaining: int = Field(..., description="Number of days remaining in the month")


class DaySplit(BaseModel):
    """Schema for weekend vs weekday spending split"""
    average_weekday_spend: float = Field(..., description="Average daily spend on weekdays")
    average_weekend_spend: float = Field(..., description="Average daily spend on weekends")


class CategoryConcentration(BaseModel):
    """Schema for category concentration insights"""
    top_3_share_pct: float = Field(..., description="Percentage share of expenses from top 3 categories")
    top_3_categories: List[CategoryBreakdownData] = Field(..., description="Top 3 categories by spending")


class MonthlyPeriodComparison(BaseModel):
    """Schema for monthly period-over-period comparison"""
    income_delta: float = Field(..., description="Absolute change in income vs previous month")
    income_delta_pct: float = Field(..., description="Percentage change in income vs previous month")
    expenses_delta: float = Field(..., description="Absolute change in expenses vs previous month")
    expenses_delta_pct: float = Field(..., description="Percentage change in expenses vs previous month")
    savings_delta: float = Field(..., description="Absolute change in savings vs previous month")
    savings_delta_pct: float = Field(..., description="Percentage change in savings vs previous month")
    investments_delta: float = Field(..., description="Absolute change in investments vs previous month")
    investments_delta_pct: float = Field(..., description="Percentage change in investments vs previous month")
    profit_delta: float = Field(..., description="Absolute change in profit vs previous month")
    profit_delta_pct: float = Field(..., description="Percentage change in profit vs previous month")
    cashflow_delta: float = Field(..., description="Absolute change in cashflow vs previous month")
    cashflow_delta_pct: float = Field(..., description="Percentage change in cashflow vs previous month")


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
    
    # New fields
    run_rate: RunRateForecast = Field(..., description="Run-rate and forecast data")
    day_split: DaySplit = Field(..., description="Weekday vs Weekend spending split")
    category_concentration: CategoryConcentration = Field(..., description="Category concentration insights")
    comparison: MonthlyPeriodComparison = Field(..., description="Comparison with previous month")
    
    daily_spending_heatmap: List[DailySpendingData] = Field(..., description="Daily spending data for heatmap")
    # breakdown: List[CategoryBreakdownData] # REMOVED
    income_breakdown: List[CategoryBreakdownData] = Field(..., description="Income breakdown by category")
    expenses_breakdown: List[CategoryBreakdownData] = Field(..., description="Expenses breakdown by category")
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


# ================================================================================================
#                                   Yearly Analytics Schemas
# ================================================================================================


class MonthMetric(BaseModel):
    """Schema for single month metric"""
    month: str = Field(..., description="Month name")
    value: float = Field(..., description="Metric value")

class YearlyHighlights(BaseModel):
    """Schema for yearly highlights"""
    highest_cashflow_month: MonthMetric = Field(..., description="Month with highest cashflow")
    highest_expense_month: MonthMetric = Field(..., description="Month with highest expenses")
    highest_savings_rate_month: MonthMetric = Field(..., description="Month with highest savings rate")

class VolatilityMetrics(BaseModel):
    """Schema for volatility metrics (standard deviation)"""
    expense_volatility: float = Field(..., description="Standard deviation of monthly expenses")
    income_volatility: float = Field(..., description="Standard deviation of monthly income")

class YearlySpendingBalance(BaseModel):
    """Schema for yearly spending balance"""
    core_share_pct: float = Field(..., description="Share of Core expenses (%)")
    fun_share_pct: float = Field(..., description="Share of Fun expenses (%)")
    future_share_pct: float = Field(..., description="Share of Future expenses (%)")

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
    
    # New fields
    highlights: YearlyHighlights = Field(..., description="Yearly highlights")
    volatility: VolatilityMetrics = Field(..., description="Volatility metrics")
    spending_balance: YearlySpendingBalance = Field(..., description="Spending balance summary")
    
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


class EmergencyFundData(BaseModel):
    """Schema for emergency fund analysis data"""
    year: int = Field(..., description="Year of the analysis")
    
    # Core Expenses (Existing)
    average_monthly_core_expenses: float = Field(..., description="Average monthly core expenses")
    total_core_expenses: float = Field(..., description="Total core expenses for the year")
    three_month_core_target: float = Field(..., description="Target amount for 3-month core emergency fund")
    six_month_core_target: float = Field(..., description="Target amount for 6-month core emergency fund")
    core_category_breakdown: dict[str, float] = Field(..., description="Breakdown of core expenses by category")
    
    # Core + Necessary Expenses (New)
    average_monthly_core_necessary: float = Field(..., description="Average monthly core + necessary expenses")
    total_core_necessary: float = Field(..., description="Total core + necessary expenses for the year")
    three_month_core_necessary_target: float = Field(..., description="Target amount for 3-month core + necessary emergency fund")
    six_month_core_necessary_target: float = Field(..., description="Target amount for 6-month core + necessary emergency fund")
    
    # All Expenses (New - sans Future)
    average_monthly_all_expenses: float = Field(..., description="Average monthly all expenses (excluding future)")
    total_all_expenses: float = Field(..., description="Total all expenses for the year (excluding future)")
    three_month_all_target: float = Field(..., description="Target amount for 3-month all expenses emergency fund")
    six_month_all_target: float = Field(..., description="Target amount for 6-month all expenses emergency fund")
    
    # Current State
    current_savings_amount: float = Field(..., description="Current total amount in savings funds")
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
