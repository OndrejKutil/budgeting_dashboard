from datetime import date as Date
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

# ================================================================================================
#                                   Data Schemas
# ================================================================================================

class TagData(BaseModel):
    """Schema for a transaction tag"""
    tags_id_pk: int = Field(..., description="Tag ID")
    tag_name: str = Field(..., description="Tag name")


class TransactionData(BaseModel):
    """Schema for individual transaction data"""
    id_pk: str | None = Field(None, description="Transaction ID")
    user_id_fk: str | None = Field(None, description="User ID who owns this transaction")
    account_id_fk: str = Field(..., description="Account id associated with the transaction")
    category_id_fk: int = Field(..., description="Transaction category id")
    amount: Decimal = Field(..., description="Transaction amount")
    date: Date = Field(..., description="Transaction date")
    notes: str | None = Field(None, description="Transaction description")
    created_at: datetime | None = Field(None, description="Record creation timestamp")
    savings_fund_id_fk: str | None = Field(None, description="Savings fund ID associated with the transaction")
    tags: list[TagData] | None = Field(None, description="Tags associated with this transaction")

    model_config = ConfigDict(
        # Allow Decimal to be serialized as float in JSON
        json_encoders={Decimal: float},
        # Example for documentation
        json_schema_extra={
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
    )

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
    is_active: bool | None = Field(True, description="Indicates if the category is active")
    spending_type: SpendingType | None = Field(None, description="Type of spending associated with the category")
    created_at: datetime | None = Field(None, description="Record creation timestamp")


class AccountData(BaseModel):
    """Schema for individual account data"""
    accounts_id_pk: str = Field(..., description="Account ID")
    user_id_fk: str | None = Field(None, description="User ID who owns this account")
    account_name: str = Field(..., description="Account name")
    type: str = Field(..., description="Type of the account (e.g., 'checking', 'savings')")
    currency: str | None = Field(..., description="Currency of the account")
    account_is_active: bool | None = Field(True, description="Whether the account is active")
    current_balance: float | None = Field(0.0, description="Current balance of the account")
    net_flow_30d: float | None = Field(0.0, description="Net flow of the account in the last 30 days")
    history_30d: list[dict] | None = Field(None, description="Daily balance history for the last 30 days")
    created_at: datetime | None = Field(None, description="Record creation timestamp")

class UserData(BaseModel):
    """Schema for user registration data"""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password (min 8 characters)")
    full_name: str | None = Field(None, description="User full name")

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
    top_expenses: list[CategoryInsight] = Field(..., description="Top 3 expense categories")
    biggest_mover: CategoryInsight | None = Field(None, description="Category with largest absolute spending change vs previous period")
    largest_transactions: list[TransactionData] = Field(..., description="List of top 5 largest transactions")
    

    
    # by_category removed as requested

    model_config = ConfigDict(
        json_schema_extra={
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
    )


class SavingsFundsData(BaseModel):
    savings_funds_id_pk: str = Field(..., description="ID of the savings fund")
    user_id_fk: str = Field(..., description="ID of the user who owns the savings fund")
    fund_name: str = Field(..., description="Name of the savings fund")
    target_amount: int = Field(..., description="Target amount for the savings fund")
    fund_is_active: bool | None = Field(True, description="Whether the fund is active")
    current_amount: float | None = Field(0.0, description="Current amount in the savings fund")
    net_flow_30d: float | None = Field(0.0, description="Net flow of the savings fund in the last 30 days")
    created_at: str | None = Field(..., description="Creation timestamp of the savings fund")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "savings_funds_id_pk": "123aaa",
                "user_id_fk": "456user",
                "fund_name": "Emergency Fund",
                "target_amount": 5000,
                "created_at": "2025-01-15T10:30:00Z"
            }
        }
    )

class RecurringData(BaseModel):
    """Schema for a recurring transaction template"""
    recurring_id_pk: str | None = Field(None, description="Recurring template ID")
    user_id_fk: str | None = Field(None, description="User ID")
    account_id_fk: str = Field(..., description="Account ID")
    category_id_fk: int = Field(..., description="Category ID")
    savings_fund_id_fk: str | None = Field(None, description="Savings fund ID")
    amount: Decimal = Field(..., description="Transaction amount (signed)")
    cadence: str = Field(..., description="Recurrence cadence: weekly|biweekly|monthly|quarterly|yearly")
    next_date: Date = Field(..., description="Next due date")
    notes: str | None = Field(None, description="Notes")
    is_active: bool | None = Field(True, description="Whether template is active")
    created_at: datetime | None = Field(None, description="Created at")
    updated_at: datetime | None = Field(None, description="Updated at")

    model_config = ConfigDict(json_encoders={Decimal: float})


class RecurringSummary(BaseModel):
    monthly_total: float = Field(..., description="Sum of all active recurring amounts normalized to monthly")
    annual_total: float = Field(..., description="Sum of all active recurring amounts normalized to yearly")
    base_currency: str = Field(..., description="Currency used for totals")


class InvestmentContribution(BaseModel):
    """The latest Trading212 portfolio value, folded into the net-worth headline."""
    total_value: float = Field(..., description="Latest synced portfolio value, converted to base currency")
    synced_at: str = Field(..., description="ISO timestamp of the snapshot this value came from")
    is_stale: bool = Field(..., description="True when synced_at is older than ~2x the sync cadence")


class NetWorthTimelineData(BaseModel):
    """Schema for net-worth timeline data point"""
    dates: list[str] = Field(..., description="ISO date strings")
    net_worth: list[float] = Field(..., description="Net worth values in base currency")
    base_currency: str = Field(..., description="Base currency used")
    investments: InvestmentContribution | None = Field(
        None, description="Latest T212 portfolio value, or null when the feature is off/unconnected/never synced"
    )


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

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "day": "2025-01-15",
                "amount": 125.50
            }
        }
    )


class CategoryBreakdownData(BaseModel):
    """Schema for category breakdown data"""
    category: str = Field(..., description="Category name")
    total: float = Field(..., description="Total amount for the category")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "category": "Groceries",
                "total": 450.75
            }
        }
    )


class SpendingTypeBreakdownData(BaseModel):
    """Schema for spending type breakdown data"""
    type: str = Field(..., description="Spending type (Core, Fun, or Future)")
    amount: float = Field(..., description="Total amount for the spending type")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "type": "Core",
                "amount": 1250.00
            }
        }
    )



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
    top_3_categories: list[CategoryBreakdownData] = Field(..., description="Top 3 categories by spending")


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
    savings_rate: float = Field(..., description="Savings rate as percentage of income")
    investment_rate: float = Field(..., description="Investment rate as percentage of income")

    # New fields
    run_rate: RunRateForecast = Field(..., description="Run-rate and forecast data")
    day_split: DaySplit = Field(..., description="Weekday vs Weekend spending split")
    category_concentration: CategoryConcentration = Field(..., description="Category concentration insights")
    comparison: MonthlyPeriodComparison = Field(..., description="Comparison with previous month")
    yoy_comparison: MonthlyPeriodComparison | None = Field(None, description="Year-over-year comparison (vs same month last year)")

    daily_spending_heatmap: list[DailySpendingData] = Field(..., description="Daily spending data for heatmap")
    # breakdown: List[CategoryBreakdownData] # REMOVED
    income_breakdown: list[CategoryBreakdownData] = Field(..., description="Income breakdown by category")
    expenses_breakdown: list[CategoryBreakdownData] = Field(..., description="Expenses breakdown by category")
    saving_breakdown: list[CategoryBreakdownData] = Field(default_factory=list, description="Saving breakdown by category")
    investment_breakdown: list[CategoryBreakdownData] = Field(default_factory=list, description="Investment breakdown by category")
    spending_type_breakdown: list[SpendingTypeBreakdownData] = Field(..., description="Breakdown by spending type")

    model_config = ConfigDict(
        json_schema_extra={
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
    )


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

class TrendDirectionItem(BaseModel):
    """Schema for a single trend direction metric"""
    direction: str = Field(..., description="Trend direction: 'growing', 'stable', or 'declining'")
    avg_monthly_change_pct: float = Field(..., description="Average monthly change as percentage")

class TrendDirectionMetrics(BaseModel):
    """Schema for trend direction metrics replacing volatility"""
    income_trend: TrendDirectionItem = Field(..., description="Income trend direction")
    savings_rate_trend: TrendDirectionItem = Field(..., description="Savings rate trend direction")
    core_expense_trend: TrendDirectionItem = Field(..., description="Core expense trend direction")


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
    trend_directions: TrendDirectionMetrics = Field(..., description="Trend direction metrics")
    spending_balance: YearlySpendingBalance = Field(..., description="Spending balance summary")
    
    months: list[str] = Field(..., description="Month names")
    monthly_income: list[float] = Field(..., description="Monthly income amounts")
    monthly_expense: list[float] = Field(..., description="Monthly expense amounts")
    monthly_saving: list[float] = Field(..., description="Monthly saving amounts")
    monthly_investment: list[float] = Field(..., description="Monthly investment amounts")
    monthly_core_expense: list[float] = Field(..., description="Monthly core expense amounts")
    monthly_fun_expense: list[float] = Field(..., description="Monthly fun expense amounts")
    monthly_future_expense: list[float] = Field(..., description="Monthly future expense amounts")
    monthly_savings_rate: list[float] = Field(..., description="Monthly savings rate percentages")
    monthly_investment_rate: list[float] = Field(..., description="Monthly investment rate percentages")
    by_category: dict[str, float] = Field(..., description="Breakdown by category")
    core_categories: dict[str, float] = Field(..., description="Core category breakdown")
    income_by_category: dict[str, float] = Field(..., description="Income breakdown by category")
    expense_by_category: dict[str, float] = Field(..., description="Expense breakdown by category")
    saving_by_category: dict[str, float] = Field(default_factory=dict, description="Saving breakdown by category")
    investment_by_category: dict[str, float] = Field(default_factory=dict, description="Investment breakdown by category")

    model_config = ConfigDict(
        json_schema_extra={
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
    )


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

    model_config = ConfigDict(
        json_schema_extra={
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
    )


# ================================================================================================
#                                   Profile Schemas
# ================================================================================================

class IdentityData(BaseModel):
    """Schema for user identity provider data"""
    id: str | None = Field(None, description="Identity ID")
    identity_id: str | None = Field(None, description="Provider identity ID")
    user_id: str | None = Field(None, description="Associated user ID")
    provider: str | None = Field(None, description="Identity provider name")
    identity_data: dict | None = Field(None, description="Provider-specific identity data")
    created_at: datetime | None = Field(None, description="Identity creation timestamp")
    last_sign_in_at: datetime | None = Field(None, description="Last sign in timestamp")
    updated_at: datetime | None = Field(None, description="Identity update timestamp")


class ProfileData(BaseModel):
    """Schema for user profile data"""
    # Core identity
    id: str | None = Field(None, description="User ID")
    aud: str | None = Field(None, description="Audience claim")
    role: str | None = Field(None, description="User role")
    is_anonymous: bool = Field(False, description="Whether user is anonymous")
    
    # Email information
    email: str | None = Field(None, description="User email address")
    email_confirmed_at: datetime | None = Field(None, description="Email confirmation timestamp")
    email_change_sent_at: datetime | None = Field(None, description="Email change request timestamp")
    new_email: str | None = Field(None, description="Pending new email address")
    
    # Phone information
    phone: str | None = Field(None, description="User phone number")
    phone_confirmed_at: datetime | None = Field(None, description="Phone confirmation timestamp")
    new_phone: str | None = Field(None, description="Pending new phone number")
    
    # Authentication timestamps
    created_at: datetime | None = Field(None, description="Account creation timestamp")
    updated_at: datetime | None = Field(None, description="Profile update timestamp")
    last_sign_in_at: datetime | None = Field(None, description="Last sign in timestamp")
    confirmed_at: datetime | None = Field(None, description="Account confirmation timestamp")
    confirmation_sent_at: datetime | None = Field(None, description="Confirmation email sent timestamp")
    recovery_sent_at: datetime | None = Field(None, description="Recovery email sent timestamp")
    invited_at: datetime | None = Field(None, description="Invitation sent timestamp")
    
    # Metadata
    app_metadata: dict | None = Field(None, description="Application-specific metadata")
    user_metadata: dict | None = Field(None, description="User-specific metadata")
    
    # Identity and security
    identities: list[IdentityData] | None = Field(None, description="User identity providers")
    factors: list[dict] | None = Field(None, description="MFA factors")
    action_link: str | None = Field(None, description="Pending action link")

    model_config = ConfigDict(
        json_schema_extra={
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
    )

# ================================================================================================
#                                      Budget Schemas
# ================================================================================================


class IncomeRowResponse(BaseModel):
    name: str = Field(..., description="Name of the income source")
    amount: Decimal = Field(..., description="Amount allocated for this income source")
    actual_amount: Decimal | None = Field(None, description="Actual amount received for this income source")
    difference_pct: Decimal | None = Field(None, description="Difference between allocated and actual amount")
    category_ids: list[int] | None = Field(None, description="Linked category IDs used for actuals calculation")
    tags: list[int] | None = Field(None, description="Linked tag IDs used for actuals calculation")
    include_in_total: bool = Field(True, description="Whether to include this row in the total calculations")

class ExpenseRowResponse(BaseModel):
    name: str = Field(..., description="Name of the expense category")
    amount: Decimal = Field(..., description="Amount allocated for this expense category")
    actual_amount: Decimal | None = Field(None, description="Actual amount spent for this expense category")
    difference_pct: Decimal | None = Field(None, description="Difference between allocated and actual amount")
    category_ids: list[int] | None = Field(None, description="Linked category IDs used for actuals calculation")
    tags: list[int] | None = Field(None, description="Linked tag IDs used for actuals calculation")
    include_in_total: bool = Field(True, description="Whether to include this row in the total calculations")

class SavingsRowResponse(BaseModel):
    name: str = Field(..., description="Name of the savings goal")
    amount: Decimal = Field(..., description="Amount allocated for this savings goal")
    actual_amount: Decimal | None = Field(None, description="Actual amount saved for this savings goal")
    difference_pct: Decimal | None = Field(None, description="Difference between allocated and actual amount")
    category_ids: list[int] | None = Field(None, description="Linked category IDs used for actuals calculation")
    tags: list[int] | None = Field(None, description="Linked tag IDs used for actuals calculation")
    include_in_total: bool = Field(True, description="Whether to include this row in the total calculations")

class InvestmentRowResponse(BaseModel):
    name: str = Field(..., description="Name of the investment")
    amount: Decimal = Field(..., description="Amount allocated for this investment")
    actual_amount: Decimal | None = Field(None, description="Actual amount invested")
    difference_pct: Decimal | None = Field(None, description="Difference between allocated and actual amount")
    category_ids: list[int] | None = Field(None, description="Linked category IDs used for actuals calculation")
    tags: list[int] | None = Field(None, description="Linked tag IDs used for actuals calculation")
    include_in_total: bool = Field(True, description="Whether to include this row in the total calculations")

class BudgetSummaryResponse(BaseModel):
    total_income: Decimal = Field(..., description="Total budgeted income")
    total_expense: Decimal = Field(..., description="Total budgeted expenses")
    total_savings: Decimal = Field(..., description="Total budgeted savings")
    total_investments: Decimal = Field(..., description="Total budgeted investments")
    remaining_budget: Decimal = Field(..., description="Remaining budget after expenses, savings, and investments")

# ================================================================================================
#                                   Internal Json Schemas
# ================================================================================================

class BudgetPlanRow(BaseModel):
    """Schema for a single row in the budget plan JSON"""
    group: str = Field(..., description="Group name (income, expense, saving, investment)")
    name: str = Field(..., min_length=1, max_length=255, description="Name of the budget item")
    amount: Decimal = Field(..., ge=0, description="Planned amount")
    include_in_total: bool = Field(True, description="Whether to include this row in the total calculations")
    category_ids: list[int] | None = Field(None, description="Linked category IDs for actuals (replaces category_id)")
    tags: list[int] | None = Field(None, description="Linked tag IDs for actuals filtering")

    @model_validator(mode='before')
    @classmethod
    def migrate_category_id(cls, data: Any) -> Any:
        if isinstance(data, dict) and 'category_id' in data and 'category_ids' not in data:
            cat_id = data.pop('category_id')
            if cat_id is not None:
                data['category_ids'] = [cat_id]
        return data

class BudgetPlan(BaseModel):
    """Schema for the entire budget plan JSON structure"""
    rows: list[BudgetPlanRow] = Field(..., description="List of budget plan rows")


# ================================================================================================
#                                   Dividend Calculator Schemas
# ================================================================================================


class DividendYieldFrequency(str, Enum):
    """Enum for dividend yield frequency"""
    ANNUAL = "annual"
    QUARTERLY = "quarterly"
    MONTHLY = "monthly"

    def __str__(self):
        return self.value


class DividendStockRow(BaseModel):
    """Schema for a single stock row in the dividend portfolio"""
    ticker: str = Field(..., min_length=1, max_length=10, description="Stock ticker symbol")
    weight_pct: Decimal = Field(..., ge=Decimal("0"), le=Decimal("100"), description="Portfolio weight percentage (0-100)")
    dividend_yield: Decimal = Field(..., ge=Decimal("0"), description="Dividend yield percentage")
    yield_frequency: DividendYieldFrequency = Field(DividendYieldFrequency.ANNUAL, description="Dividend frequency: annual or monthly")

    model_config = ConfigDict(
        json_encoders={Decimal: float},
        json_schema_extra={
            "example": {
                "ticker": "AAPL",
                "weight_pct": 25.0,
                "dividend_yield": 0.55,
                "yield_frequency": "annual"
            }
        }
    )


class DividendPortfolio(BaseModel):
    """Schema for the full portfolio stored as JSON"""
    rows: list[DividendStockRow] = Field(..., description="List of stock rows")


class DividendCalculationResult(BaseModel):
    """Computed dividend metrics returned to the frontend"""
    weighted_avg_yield: Decimal = Field(..., description="Weighted average annual yield (%)")
    annual_income: Decimal = Field(..., description="Estimated annual dividend income")
    monthly_income: Decimal = Field(..., description="Estimated monthly dividend income (annual / 12)")
    portfolio_value: Decimal = Field(..., description="Total portfolio value used in calculations")
    rows: list[DividendStockRow] = Field(..., description="Stock rows as saved")

    model_config = ConfigDict(
        json_encoders={Decimal: float}
    )


# ================================================================================================
#                                   Feature Flags
# ================================================================================================

class FeatureFlagData(BaseModel):
    """A single feature and whether it is enabled for the current user"""
    feature_key: str = Field(..., description="Stable identifier the code branches on")
    feature_name: str = Field(..., description="Human-readable feature name")
    feature_description: str | None = Field(None, description="What the feature does")
    is_enabled: bool = Field(..., description="Whether the feature is enabled for this user")


# ================================================================================================
#                                   Screenshot Import
# ================================================================================================

class FieldSource(str, Enum):
    """
    Where a draft field's value came from.

    The review UI shows this per field, and it is what makes the rules-first design legible:
    a field sourced from MODEL that the user corrects is exactly the signal that should become
    a rule, so the next import sources it from RULE instead.
    """
    RULE = "rule"        # matched a deterministic user rule
    MODEL = "model"      # the model guessed it
    DEFAULT = "default"  # filled from user context (e.g. their only account, home currency)
    NONE = "none"        # nothing produced a value; the user must supply it

    def __str__(self):
        return self.value


class DraftTransactionData(BaseModel):
    """
    One proposed transaction extracted from a screenshot.

    Nothing here is final. Amounts and dates should be right nearly always, the category is a
    best guess. There is no separate merchant field -- the app doesn't store one on a real
    transaction, so the merchant name (when read) is prefilled straight into `notes` instead.
    """
    amount: Decimal | None = Field(None, description="Transaction amount")
    currency: str | None = Field(None, description="Currency code as read from the screenshot")
    date: Date | None = Field(None, description="Transaction date")
    account_id_fk: str | None = Field(None, description="Resolved account ID, if one could be determined")
    category_id_fk: int | None = Field(None, description="Best-guess category ID")
    notes: str | None = Field(None, description="Prefilled with the merchant name when read; freely editable")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="Overall confidence in this draft (0-1)")
    field_sources: dict[str, FieldSource] = Field(
        default_factory=dict,
        description="Per-field provenance, keyed by field name"
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Anything the user should look at before saving this draft"
    )

    model_config = ConfigDict(
        json_encoders={Decimal: float}
    )


class NoTransactionsReason(str, Enum):
    """
    Why a screenshot yielded no drafts, as reported by the vision stage itself.

    Every one of these reaches the backend as the same empty `transactions` array, so nothing
    downstream can tell them apart -- a blurry photo of a screen, a screenshot of something
    that isn't banking at all, and a genuinely empty wallet screen are indistinguishable after
    the fact. The vision model is the only thing that saw the image, so it is asked to say
    which case it was; these are the four answers it may give.

    Carried as a code rather than a sentence because the frontend renders it through i18n --
    see `pages.screenshotImport.reason.*`. Adding a member here means adding that key in every
    language, or the UI falls back to the generic empty state.
    """
    UNREADABLE = "unreadable"
    NOT_A_TRANSACTION_SCREENSHOT = "not_a_transaction_screenshot"
    ONLY_GROUPED_NOTIFICATIONS = "only_grouped_notifications"
    NO_TRANSACTIONS_VISIBLE = "no_transactions_visible"

    def __str__(self):
        return self.value


class ExtractionData(BaseModel):
    """Result of one screenshot extraction, plus how it was produced."""
    drafts: list[DraftTransactionData] = Field(..., description="Proposed transactions for review")
    # Named inference_* rather than model_*: pydantic v2 reserves the `model_` field namespace.
    inference_model: str | None = Field(None, description="Model identifier, if one was called")
    inference_called: bool = Field(False, description="Whether the model ran, or rules covered it")
    rules_hit: int = Field(0, description="Number of fields resolved by deterministic rules")
    raw_text: str | None = Field(None, description="Raw text read off the screenshot, for debugging")
    reason: NoTransactionsReason | None = Field(
        None, description="Why nothing was extracted; null whenever drafts is non-empty"
    )


# ================================================================================================
#                                   Trading212 Integration
# ================================================================================================

class T212SyncStatus(str, Enum):
    """Mirrors the fct_t212_connection_status_check constraint in the migration."""
    OK = "ok"
    AUTH_FAILED = "auth_failed"
    RATE_LIMITED = "rate_limited"
    ERROR = "error"

    def __str__(self):
        return self.value


class T212ConnectionData(BaseModel):
    """GET /trading212/connection. Never includes the key/secret, not even masked."""
    connected: bool = Field(..., description="Whether this user has a stored Trading212 connection")
    last_synced_at: str | None = Field(None, description="ISO timestamp of the last successful sync")
    last_sync_status: T212SyncStatus | None = Field(
        None, description="null (no sync attempted yet) | ok | auth_failed | rate_limited | error"
    )
    account_currency: str | None = Field(None, description="T212 account's primary currency, once known")


class T212PositionData(BaseModel):
    """One open position from the latest synced snapshot, converted to the caller's base currency."""
    ticker: str = Field(..., description="T212 instrument ticker")
    quantity: float = Field(..., description="Shares held")
    average_price: float = Field(..., description="Average price paid per share")
    current_price: float = Field(..., description="Current market price per share")
    market_value: float = Field(..., description="quantity * current_price")
    unrealised_pnl: float = Field(..., description="Unrealised profit/loss on this position")
    weight_pct: float = Field(..., description="This position's share of total portfolio market value, 0-100")


class T212PositionsData(BaseModel):
    """GET /trading212/positions."""
    positions: list[T212PositionData] = Field(default_factory=list, description="Latest synced positions")
    synced_at: str | None = Field(None, description="ISO timestamp of the snapshot these positions came from")
    currency: str | None = Field(None, description="Currency all values above are converted to (the caller's base currency)")


class T212ValueHistoryPoint(BaseModel):
    """One row from fct_t212_value_history."""
    snapshot_at: str = Field(..., description="ISO timestamp of this snapshot")
    total_value: float = Field(..., description="Portfolio total value at this snapshot")


class T212HistoryData(BaseModel):
    """GET /trading212/history."""
    points: list[T212ValueHistoryPoint] = Field(default_factory=list, description="Value-history series")
    currency: str | None = Field(None, description="Currency total_value is converted to (the caller's base currency)")
