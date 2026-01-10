# API Schemas

This document defines the data structures used in the Budgeting Dashboard API.

## Common Data Models

### TransactionData
Represents a single financial transaction.
- `id_pk` (str | None): Transaction ID
- `user_id_fk` (str | None): User ID who owns this transaction
- `account_id_fk` (str): Account ID associated with the transaction
- `category_id_fk` (int): Transaction category ID
- `amount` (Decimal): Transaction amount
- `date` (Date): Transaction date (YYYY-MM-DD)
- `notes` (str | None): Transaction description
- `created_at` (datetime | None): Record creation timestamp
- `savings_fund_id_fk` (str | None): Savings fund ID associated with the transaction

### AccountData
Represents a user's financial account.
- `accounts_id_pk` (str): Account ID
- `user_id_fk` (str | None): User ID who owns this account
- `account_name` (str): Account name
- `type` (str): Type of the account (e.g., 'checking', 'savings')
- `currency` (str | None): Currency of the account
- `current_balance` (float | None): Current balance of the account
- `net_flow_30d` (float | None): Net flow of the account in the last 30 days
- `created_at` (datetime | None): Record creation timestamp

### CategoryData
Represents a transaction category.
- `categories_id_pk` (int): Category ID
- `category_name` (str): Category name
- `type` (CategoryType): Category type (expense, income, etc.)
- `is_active` (bool | None): Indicates if the category is active
- `spending_type` (SpendingType | None): Type of spending associated with the category
- `created_at` (datetime | None): Record creation timestamp

### SavingsFundsData
Represents a savings goal or fund.
- `savings_funds_id_pk` (str): ID of the savings fund
- `user_id_fk` (str): ID of the user who owns the savings fund
- `fund_name` (str): Name of the savings fund
- `target_amount` (int): Target amount for the savings fund
- `current_amount` (float | None): Current amount in the savings fund
- `net_flow_30d` (float | None): Net flow of the savings fund in the last 30 days
- `created_at` (str | None): Creation timestamp of the savings fund

### SummaryData
Financial summary data including totals and category breakdown.
- `total_income` (float): Total income amount
- `total_expense` (float): Total expense amount
- `total_saving` (float): Total saving amount
- `total_investment` (float): Total investment amount
- `profit` (float): Profit (income - expenses)
- `net_cash_flow` (float): Net cash flow
- `comparison` (PeriodComparison): Comparison with previous period
- `savings_rate` (float): Savings rate %
- `investment_rate` (float): Investment rate %
- `top_expenses` (List[CategoryInsight]): Top 3 expense categories
- `biggest_mover` (CategoryInsight | None): Category with largest absolute change
- `largest_transactions` (List[TransactionData]): Top 5 largest transactions
- `by_category` (dict): Summary grouped by category name

### MonthlyAnalyticsData
Comprehensive monthly analytics.
- `year` (int): Year of analysis
- `month` (int): Month of analysis (1-12)
- `month_name` (str): Name of month
- `income` (float): Total income
- `expenses` (float): Total expenses
- `savings` (float): Total savings
- `investments` (float): Total investments
- `profit` (float): Calculated profit
- `cashflow` (float): Calculated cashflow
- `run_rate` (RunRateForecast): Run-rate and forecast data
- `day_split` (DaySplit): Weekday vs Weekend spending split
- `category_concentration` (CategoryConcentration): Category concentration insights
- `comparison` (MonthlyPeriodComparison): Comparison with previous month
- `daily_spending_heatmap` (List[DailySpendingData]): Daily spending data
- `category_breakdown` (List[CategoryBreakdownData]): Breakdown by category
- `spending_type_breakdown` (List[SpendingTypeBreakdownData]): Breakdown by spending type

### YearlyAnalyticsData
Comprehensive yearly analytics.
- `year` (int): Year of analytics
- `total_income` (float): Total income
- `total_expense` (float): Total expenses
- `total_saving` (float): Total savings
- `total_investment` (float): Total investments
- `total_core_expense` (float): Total core expenses
- `total_fun_expense` (float): Total fun expenses
- `total_future_expense` (float): Total future expenses
- `profit` (float): Profit
- `net_cash_flow` (float): Net cash flow
- `savings_rate` (float): Savings rate %
- `investment_rate` (float): Investment rate %
- `highlights` (YearlyHighlights): Yearly highlights
- `volatility` (VolatilityMetrics): Volatility metrics
- `spending_balance` (YearlySpendingBalance): Spending balance summary
- `months` (List[str]): Month names
- `monthly_income` (List[float]): Monthly income amounts
- `monthly_expense` (List[float]): Monthly expense amounts
- `monthly_saving` (List[float]): Monthly saving amounts
- `monthly_investment` (List[float]): Monthly investment amounts
- `monthly_core_expense` (List[float]): Monthly core expense amounts
- `monthly_fun_expense` (List[float]): Monthly fun expense amounts
- `monthly_future_expense` (List[float]): Monthly future expense amounts
- `monthly_savings_rate` (List[float]): Monthly savings rate %
- `monthly_investment_rate` (List[float]): Monthly investment rate %
- `by_category` (dict[str, float]): Breakdown by category
- `core_categories` (dict[str, float]): Core category breakdown
- `income_by_category` (dict[str, float]): Income breakdown by category
- `expense_by_category` (dict[str, float]): Expense breakdown by category

### EmergencyFundData
Emergency fund analysis.
- `year` (int): Year of analysis
- `average_monthly_core_expenses` (float): Average monthly core expenses
- `total_core_expenses` (float): Total core expenses for the year
- `three_month_fund_target` (float): Target for 3-month fund
- `six_month_fund_target` (float): Target for 6-month fund
- `core_category_breakdown` (dict[str, float]): Breakdown of core expenses by category
- `months_analyzed` (int): Number of months analyzed

### Nested Types

#### PeriodComparison
- `income_delta` (float): Absolute change in income
- `income_delta_pct` (float): % change in income
- `expense_delta` (float): Absolute change in expenses
- `expense_delta_pct` (float): % change in expenses
- `saving_delta` (float): Absolute change in savings
- `investment_delta` (float): Absolute change in investments
- `profit_delta` (float): Absolute change in profit
- `cashflow_delta` (float): Absolute change in cashflow

#### CategoryInsight
- `name` (str): Category name
- `total` (float): Total amount spent
- `share_of_total` (float): % share of total expenses

#### DailySpendingData
- `day` (str): Date (YYYY-MM-DD)
- `amount` (float): Total spending amount

#### CategoryBreakdownData
- `category` (str): Category name
- `total` (float): Total amount

#### SpendingTypeBreakdownData
- `type` (str): Spending type (Core, Fun, Future)
- `amount` (float): Total amount

#### RunRateForecast
- `average_daily_spend` (float): Average daily spending
- `projected_month_end_expenses` (float): Projected total expenses
- `days_elapsed` (int): Days elapsed
- `days_remaining` (int): Days remaining

#### DaySplit
- `average_weekday_spend` (float): Average daily spend (weekday)
- `average_weekend_spend` (float): Average daily spend (weekend)

#### CategoryConcentration
- `top_3_share_pct` (float): % share of top 3 categories
- `top_3_categories` (List[CategoryBreakdownData]): Top 3 categories

#### MonthlyPeriodComparison
- `income_delta` (float): Absolute change in income
- `income_delta_pct` (float): % change in income
- `expenses_delta` (float): Absolute change in expenses
- `expenses_delta_pct` (float): % change in expenses
- `savings_delta` (float): Absolute change in savings
- `savings_delta_pct` (float): % change in savings
- `investments_delta` (float): Absolute change in investments
- `investments_delta_pct` (float): % change in investments
- `profit_delta` (float): Absolute change in profit
- `profit_delta_pct` (float): % change in profit
- `cashflow_delta` (float): Absolute change in cashflow
- `cashflow_delta_pct` (float): % change in cashflow

#### YearlyHighlights
- `highest_cashflow_month` (MonthMetric): Month with highest cashflow
- `highest_expense_month` (MonthMetric): Month with highest expenses
- `highest_savings_rate_month` (MonthMetric): Month with highest savings rate

#### MonthMetric
- `month` (str): Month name
- `value` (float): Metric value

#### VolatilityMetrics
- `expense_volatility` (float): Std dev of monthly expenses
- `income_volatility` (float): Std dev of monthly income

#### YearlySpendingBalance
- `core_share_pct` (float): Share of Core expenses %
- `fun_share_pct` (float): Share of Fun expenses %
- `future_share_pct` (float): Share of Future expenses %



---

## Request Models

### LoginRequest
- `email` (str): User email address
- `password` (str): User password

### TransactionRequest
- `account_id_fk` (str): Account ID associated with the transaction
- `category_id_fk` (int): Transaction category ID
- `amount` (Decimal): Transaction amount
- `date` (Date): Transaction date
- `notes` (str | None): Transaction description
- `created_at` (datetime | None): Record creation timestamp
- `savings_fund_id_fk` (str | None): Savings fund ID associated with the transaction

### AccountRequest
- `account_name` (str): Name of the account
- `type` (str): Type of the account (e.g., 'checking', 'savings')
- `currency` (str | None): Currency of the account
- `created_at` (datetime | None): Record creation timestamp

### SavingsFundsRequest
- `user_id_fk` (str): ID of the user who owns the savings fund
- `fund_name` (str): Name of the savings fund
- `target_amount` (int): Target amount for the savings fund
- `created_at` (datetime | None): Creation timestamp of the savings fund

---

## Response Models

### LoginResponse
- `access_token` (str): Access token for authenticated requests
- `refresh_token` (str): Refresh token for obtaining new access tokens
- `user_id` (str): ID of the authenticated user
- `data` (dict): Login response data containing user and session info

### RefreshTokenResponse
- `user` (dict | None): User information after refresh
- `session` (dict | None): Session information after refresh

### ProfileResponse
- `data` (ProfileData): User profile data
- `success` (bool): Operation success status
- `message` (str): Response message

### AccountsResponse
- `data` (List[AccountData]): List of account records
- `count` (int): Total number of records returned
- `success` (bool): Operation success status
- `message` (str): Response message

### CategoriesResponse
- `data` (List[CategoryData]): List of category records
- `count` (int): Total number of records returned

### TransactionsResponse
- `data` (List[TransactionData]): List of transaction records
- `count` (int): Total number of records returned
- `success` (bool): Operation success status
- `message` (str): Response message

### SavingsFundsResponse
- `data` (List[SavingsFundsData]): List of savings fund records
- `count` (int): Total number of records returned
- `success` (bool): Operation success status
- `message` (str): Response message

### SummaryResponse
- `data` (SummaryData): Financial summary data
- `success` (bool): Operation success status
- `message` (str): Response message

### MonthlyAnalyticsResponse
- `data` (MonthlyAnalyticsData): Monthly analytics data
- `success` (bool): Operation success status
- `message` (str): Response message

### YearlyAnalyticsResponse
- `data` (YearlyAnalyticsData): Yearly analytics data
- `success` (bool): Operation success status
- `message` (str): Response message

### EmergencyFundResponse
- `data` (EmergencyFundData): Emergency fund analysis data
- `success` (bool): Operation success status
- `message` (str): Response message

### Generic Success Responses
- `AccountSuccessResponse`: { success: bool, message: str }
- `TransactionSuccessResponse`: { success: bool, message: str, data: Optional[List[TransactionData]] }
- `SavingsFundSuccessResponse`: { success: bool, message: str, data: Optional[List[SavingsFundsData]] }
