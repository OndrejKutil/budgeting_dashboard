# imports
import calendar
from datetime import date
from typing import List, Dict, Optional
from pydantic import BaseModel, Field

from ..columns import TRANSACTIONS_COLUMNS
from ..environment import PROJECT_URL, ANON_KEY
from supabase.client import create_client, Client
import logging
import polars as pl

# schemas
from ...schemas.endpoint_schemas import YearlyAnalyticsData, EmergencyFundData


# Create logger for this module
logger = logging.getLogger(__name__)


# ================================================================================================
#                                   Internal Data Classes
# ================================================================================================

class YearlyTotals(BaseModel):
    """Internal data class for storing calculated yearly totals"""
    income: float = Field(default=0.0)
    expense: float = Field(default=0.0)
    saving: float = Field(default=0.0)
    investment: float = Field(default=0.0)
    core_expense: float = Field(default=0.0)
    fun_expense: float = Field(default=0.0)
    future_expense: float = Field(default=0.0)
    profit: float = Field(default=0.0)
    net_cash_flow: float = Field(default=0.0)
    savings_rate: float = Field(default=0.0)
    investment_rate: float = Field(default=0.0)


class MonthlyDataPoint(BaseModel):
    """Internal data class for monthly aggregated data"""
    income: float = Field(default=0.0)
    income_wo_savings_funds: float = Field(default=0.0)
    expense: float = Field(default=0.0)
    saving: float = Field(default=0.0)
    savings_w_withdrawals: float = Field(default=0.0)
    investment: float = Field(default=0.0)
    core_expense: float = Field(default=0.0)
    fun_expense: float = Field(default=0.0)
    future_expense: float = Field(default=0.0)


class CategoryBreakdowns(BaseModel):
    """Internal data class for category breakdowns"""
    by_category: Dict[str, float] = Field(default_factory=dict)
    core_categories: Dict[str, float] = Field(default_factory=dict)
    income_by_category: Dict[str, float] = Field(default_factory=dict)
    expense_by_category: Dict[str, float] = Field(default_factory=dict)


# ================================================================================================
#                                   Helper Functions
# ================================================================================================

def _get_year_date_range(year: int) -> tuple[date, date]:
    """
    Get the start and end dates for a specific year.
    
    Args:
        year: Year for the date range
    
    Returns:
        Tuple of (start_date, end_date)
    """
    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)
    return start_date, end_date


def _fetch_yearly_transactions(access_token: str, start_date: date, end_date: date) -> List[dict]:
    """
    Fetch transactions from the database for a specific date range.
    
    Args:
        access_token: User's access token for database authentication
        start_date: Start date for the query
        end_date: End date for the query
    
    Returns:
        List of transaction dictionaries with category data
    
    Raises:
        EnvironmentError: If environment variables are not set
        ConnectionError: If database query fails
    """
    if PROJECT_URL == "" or ANON_KEY == "":
        logger.error('Environment variables PROJECT_URL or ANON_KEY are not set.')
        raise EnvironmentError('Missing environment variables for database connection.')

    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        user_supabase_client.postgrest.auth(access_token)
        
        query = user_supabase_client.table('fct_transactions').select('*, dim_categories(*)')
        query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
        query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
        query = query.order(TRANSACTIONS_COLUMNS.DATE.value, desc=False)
        
        response = query.execute()
        return response.data

    except Exception as e:
        logger.error(f'Database query failed for yearly transactions: {str(e)}')
        logger.info(f'Query parameters - start_date: {start_date}, end_date: {end_date}')
        raise ConnectionError('Failed to fetch transactions from database. Please check your connection or try again later.')


def _prepare_transactions_dataframe(transactions: List[dict]) -> pl.DataFrame:
    """
    Convert raw transaction data to a prepared polars DataFrame.
    
    Args:
        transactions: List of transaction dictionaries from database
    
    Returns:
        Prepared DataFrame with normalized columns and derived fields
    """
    if not transactions:
        return pl.DataFrame({
            'amount': pl.Series(dtype=pl.Float64),
            'date': pl.Series(dtype=pl.Utf8),
            'category_type': pl.Series(dtype=pl.Utf8),
            'category_name': pl.Series(dtype=pl.Utf8),
            'spending_type': pl.Series(dtype=pl.Utf8),
            'savings_funds': pl.Series(dtype=pl.Utf8),
            'date_parsed': pl.Series(dtype=pl.Date),
            'month_name': pl.Series(dtype=pl.Utf8),
            'abs_amount': pl.Series(dtype=pl.Float64)
        })

    # Polars unnest logic
    df = pl.from_dicts(transactions)
    
    struct_col = None
    if 'dim_categories' in df.columns:
        struct_col = 'dim_categories'
    elif 'categories' in df.columns:
        struct_col = 'categories'
        
    if struct_col:
        df = df.unnest(struct_col)
    
    # Helper to safe add column if missing
    def safe_with_column(df, name, default, dtype):
        if name not in df.columns:
            return df.with_columns(pl.lit(default).cast(dtype).alias(name))
        return df

    df = safe_with_column(df, 'amount', 0.0, pl.Float64)
    df = safe_with_column(df, 'date', None, pl.Utf8)
    df = safe_with_column(df, 'type', '', pl.Utf8)
    df = safe_with_column(df, 'category_name', 'Unknown Category', pl.Utf8)
    df = safe_with_column(df, 'spending_type', '', pl.Utf8)
    # df = safe_with_column(df, 'savings_fund_id_fk', None, pl.Utf8) 
    # Use savings_fund_id_fk or savings_fund_id based on source. 
    # Logic: yearly uses `savings_fund_id_fk` -> `savings_funds`.
    
    rename_map = {}
    if 'type' in df.columns: rename_map['type'] = 'category_type'
    if 'savings_fund_id_fk' in df.columns: rename_map['savings_fund_id_fk'] = 'savings_funds'
    elif 'savings_fund_id' in df.columns: rename_map['savings_fund_id'] = 'savings_funds'
    
    df = df.rename(rename_map)
    df = safe_with_column(df, 'savings_funds', None, pl.Utf8) # Ensure it exists after rename try
    
    # Fill nulls
    df = df.with_columns([
        pl.col('category_type').fill_null(''),
        pl.col('category_name').fill_null('Unknown Category'),
        pl.col('spending_type').fill_null(''),
        pl.col('amount').cast(pl.Float64).fill_null(0.0)
    ])
    
    # Derived columns
    # month_name: Polars str.to_date().dt.strftime('%b') or using python map.
    # %b gives abbreviated month name (Jan, Feb).
    
    df = df.with_columns([
        pl.col('date').str.to_date().alias('date_parsed'),
        pl.col('amount').abs().alias('abs_amount')
    ])
    
    df = df.with_columns([
        pl.col('date_parsed').dt.strftime('%b').alias('month_name')
    ])

    return df


def _initialize_monthly_data() -> Dict[str, MonthlyDataPoint]:
    """
    Initialize the monthly data structure for all 12 months.
    
    Returns:
        Dictionary mapping month abbreviations to MonthlyDataPoint instances
    """
    monthly_data = {}
    for month in range(1, 13):
        month_name = calendar.month_abbr[month]
        monthly_data[month_name] = MonthlyDataPoint()
    return monthly_data


def _calculate_monthly_aggregations(df: pl.DataFrame, monthly_data: Dict[str, MonthlyDataPoint]) -> Dict[str, MonthlyDataPoint]:
    """
    Calculate monthly aggregations from the transactions DataFrame.
    
    Args:
        df: Prepared transactions DataFrame (Polars)
        monthly_data: Initialized monthly data structure
    
    Returns:
        Updated monthly data with calculated values
    """
    if df.is_empty():
        return monthly_data

    # Group by month and category type
    monthly_groups = (
        df.group_by(['month_name', 'category_type'])
          .agg([
              pl.col('amount').sum().alias('amount'),
              pl.col('abs_amount').sum().alias('abs_amount')
          ])
    )
    
    # Income (original amount)
    income_rows = monthly_groups.filter(pl.col('category_type') == 'income')
    for row in income_rows.iter_rows(named=True):
        if row['month_name'] in monthly_data:
            monthly_data[row['month_name']].income = row['amount']
    
    # Income without savings funds withdrawals
    # Logic: income - income_where_savings_fund_not_null
    
    # We can do this with polars group by month.
    income_wo_savings = (
        df.filter(pl.col('category_type') == 'income')
          .group_by('month_name')
          .agg([
              (pl.col('amount').sum() - 
               pl.col('amount').filter(pl.col('savings_funds').is_not_null()).sum().fill_null(0.0)
              ).alias('income_wo_savings_funds')
          ])
    )
    
    for row in income_wo_savings.iter_rows(named=True):
        if row['month_name'] in monthly_data:
            monthly_data[row['month_name']].income_wo_savings_funds = row['income_wo_savings_funds']
            
    # Expenses (abs amount)
    expense_rows = monthly_groups.filter(pl.col('category_type') == 'expense')
    for row in expense_rows.iter_rows(named=True):
        if row['month_name'] in monthly_data:
            monthly_data[row['month_name']].expense = row['abs_amount']
            
    # Saving (abs amount)
    saving_rows = monthly_groups.filter(pl.col('category_type') == 'saving')
    for row in saving_rows.iter_rows(named=True):
        if row['month_name'] in monthly_data:
            monthly_data[row['month_name']].saving = row['abs_amount']
            
    # Savings withdrawals (income with savings_funds set)
    savings_withdrawals = (
        df.filter((pl.col('category_type') == 'income') & (pl.col('savings_funds').is_not_null()))
          .group_by('month_name')
          .agg(pl.col('amount').sum().alias('amount'))
    )
    
    withdrawals_map = {row['month_name']: row['amount'] for row in savings_withdrawals.iter_rows(named=True)}
    
    # Apply withdrawals
    for month in monthly_data.keys():
        monthly_data[month].savings_w_withdrawals = monthly_data[month].saving - withdrawals_map.get(month, 0.0)
        
    # Investment (abs amount)
    investment_rows = monthly_groups.filter(pl.col('category_type') == 'investment')
    for row in investment_rows.iter_rows(named=True):
        if row['month_name'] in monthly_data:
            monthly_data[row['month_name']].investment = row['abs_amount']
            
    # Core/Fun expenses
    expense_details = (
        df.filter(pl.col('category_type') == 'expense')
          .group_by(['month_name', 'spending_type'])
          .agg(pl.col('abs_amount').sum())
    )
    
    for row in expense_details.iter_rows(named=True):
        m = row['month_name']
        if m in monthly_data:
            if row['spending_type'] == 'Core':
                monthly_data[m].core_expense = row['abs_amount']
            elif row['spending_type'] == 'Fun':
                monthly_data[m].fun_expense = row['abs_amount']
                
    # Future expenses (saving/investment + Future)
    future_rows = (
        df.filter(pl.col('category_type').is_in(['saving', 'investment']) & (pl.col('spending_type') == 'Future'))
          .group_by('month_name')
          .agg(pl.col('abs_amount').sum())
    )
    
    for row in future_rows.iter_rows(named=True):
        if row['month_name'] in monthly_data:
            monthly_data[row['month_name']].future_expense = row['abs_amount']

    return monthly_data


def _calculate_yearly_totals(df: pl.DataFrame) -> YearlyTotals:
    """
    Calculate yearly totals from the transactions DataFrame.
    
    Args:
        df: Prepared transactions DataFrame (Polars)
    
    Returns:
        YearlyTotals with all calculated values
    """
    if df.is_empty():
        return YearlyTotals()

    # Helpers
    def get_sum(cond, col='abs_amount'):
        res = df.filter(cond).select(pl.col(col).sum()).item()
        return res if res else 0.0

    total_income = get_sum(pl.col('category_type') == 'income', 'abs_amount') # Wait, income uses abs? original used abs_amount for total_income variable but amount logic check.
    # Original: total_income = df[...]['abs_amount'].sum(). Since income is positive, abs is same.
    # But savings_fund_income check:
    # savings_fund_income = df[(category_type==income) & savings_funds not null]['abs_amount'].sum()
    
    income_cond = pl.col('category_type') == 'income'
    savings_funds_cond = income_cond & pl.col('savings_funds').is_not_null()
    
    total_income = get_sum(income_cond)
    savings_fund_income = get_sum(savings_funds_cond)
    total_income_wo_savings_funds = total_income - savings_fund_income
    
    total_expense = get_sum(pl.col('category_type') == 'expense')
    total_saving = get_sum(pl.col('category_type') == 'saving')
    total_savings_w_withdrawals = total_saving - savings_fund_income
    total_investment = get_sum(pl.col('category_type') == 'investment')
    
    total_core_expense = get_sum((pl.col('category_type') == 'expense') & (pl.col('spending_type') == 'Core'))
    total_fun_expense = get_sum((pl.col('category_type') == 'expense') & (pl.col('spending_type') == 'Fun'))
    total_future_expense = get_sum(pl.col('category_type').is_in(['saving', 'investment']) & (pl.col('spending_type') == 'Future'))

    # Profit
    profit = total_income_wo_savings_funds - total_expense - total_investment
    
    # Net cash flow = sum of amount (signed)
    net_cash_flow = df.select(pl.col('amount').sum()).item() or 0.0
    
    # Rates
    if total_income_wo_savings_funds > 0:
        savings_rate = (total_savings_w_withdrawals / total_income_wo_savings_funds * 100)
        investment_rate = (total_investment / total_income_wo_savings_funds * 100)
    else:
        savings_rate = 0.0
        investment_rate = 0.0

    return YearlyTotals(
        income=round(total_income_wo_savings_funds, 2),
        expense=round(total_expense, 2),
        saving=round(total_savings_w_withdrawals, 2),
        investment=round(total_investment, 2),
        core_expense=round(total_core_expense, 2),
        fun_expense=round(total_fun_expense, 2),
        future_expense=round(total_future_expense, 2),
        profit=round(profit, 2),
        net_cash_flow=round(net_cash_flow, 2),
        savings_rate=round(savings_rate, 2),
        investment_rate=round(investment_rate, 2)
    )


def _calculate_category_breakdowns(df: pl.DataFrame) -> CategoryBreakdowns:
    """
    Calculate category breakdowns from the transactions DataFrame.
    
    Args:
        df: Prepared transactions DataFrame (Polars)
    
    Returns:
        CategoryBreakdowns with all category aggregations
    """
    if df.is_empty():
        return CategoryBreakdowns()

    # Generic helper
    def group_to_dict(cond, col='amount'):
        # cond can be True (all) or boolean expression
        res_df = df.filter(cond).group_by('category_name').agg(pl.col(col).sum())
        return {row['category_name']: round(row[col], 2) for row in res_df.iter_rows(named=True)}

    by_category = group_to_dict(pl.lit(True), 'amount')
    core_categories = group_to_dict((pl.col('category_type') == 'expense') & (pl.col('spending_type') == 'Core'), 'abs_amount')
    income_by_category = group_to_dict(pl.col('category_type') == 'income', 'amount')
    expense_by_category = group_to_dict(pl.col('category_type') == 'expense', 'abs_amount')

    return CategoryBreakdowns(
        by_category=by_category,
        core_categories=core_categories,
        income_by_category=income_by_category,
        expense_by_category=expense_by_category
    )


def _prepare_monthly_arrays(monthly_data: Dict[str, MonthlyDataPoint]) -> dict:
    """
    Prepare monthly data arrays for chart visualization.
    
    Args:
        monthly_data: Dictionary of monthly aggregated data
    
    Returns:
        Dictionary containing monthly arrays for all metrics
    """
    months = list(monthly_data.keys())
    
    return {
        'months': months,
        'monthly_income': [round(monthly_data[month].income_wo_savings_funds, 2) for month in months],
        'monthly_expense': [round(monthly_data[month].expense, 2) for month in months],
        'monthly_saving': [round(monthly_data[month].savings_w_withdrawals, 2) for month in months],
        'monthly_investment': [round(monthly_data[month].investment, 2) for month in months],
        'monthly_core_expense': [round(monthly_data[month].core_expense, 2) for month in months],
        'monthly_fun_expense': [round(monthly_data[month].fun_expense, 2) for month in months],
        'monthly_future_expense': [round(monthly_data[month].future_expense, 2) for month in months],
        'monthly_savings_rate': [
            round((monthly_data[month].savings_w_withdrawals / monthly_data[month].income_wo_savings_funds * 100) 
                  if monthly_data[month].income_wo_savings_funds > 0 else 0, 2) 
            for month in months
        ],
        'monthly_investment_rate': [
            round((monthly_data[month].investment / monthly_data[month].income_wo_savings_funds * 100) 
                  if monthly_data[month].income_wo_savings_funds > 0 else 0, 2) 
            for month in months
        ]
    }


# ================================================================================================
#                                   Main Analytics Functions
# ================================================================================================

def _yearly_analytics(access_token: str, year: int) -> YearlyAnalyticsData:
    """
    Calculate comprehensive yearly analytics for a specific year.
    
    This function orchestrates the yearly analytics calculation by:
    1. Fetching transactions from the database
    2. Preparing the data in a DataFrame
    3. Calculating monthly aggregations
    4. Calculating yearly totals and category breakdowns
    
    Args:
        access_token: User's access token for database authentication
        year: Year for the analysis
    
    Returns:
        YearlyAnalyticsData containing all calculated analytics
    
    Raises:
        EnvironmentError: If environment variables are not set
        ConnectionError: If database query fails
    """
    # Get date range for the year
    start_date, end_date = _get_year_date_range(year)
    
    # Fetch transactions from database
    transactions = _fetch_yearly_transactions(access_token, start_date, end_date)
    
    # Prepare DataFrame for calculations
    df = _prepare_transactions_dataframe(transactions)
    
    # Initialize and calculate monthly data
    monthly_data = _initialize_monthly_data()
    monthly_data = _calculate_monthly_aggregations(df, monthly_data)
    
    # Calculate totals and breakdowns
    totals = _calculate_yearly_totals(df)
    breakdowns = _calculate_category_breakdowns(df)
    monthly_arrays = _prepare_monthly_arrays(monthly_data)

    return YearlyAnalyticsData(
        year=year,
        total_income=totals.income,
        total_expense=totals.expense,
        total_saving=totals.saving,
        total_investment=totals.investment,
        total_core_expense=totals.core_expense,
        total_fun_expense=totals.fun_expense,
        total_future_expense=totals.future_expense,
        profit=totals.profit,
        net_cash_flow=totals.net_cash_flow,
        savings_rate=totals.savings_rate,
        investment_rate=totals.investment_rate,
        months=monthly_arrays['months'],
        monthly_income=monthly_arrays['monthly_income'],
        monthly_expense=monthly_arrays['monthly_expense'],
        monthly_saving=monthly_arrays['monthly_saving'],
        monthly_investment=monthly_arrays['monthly_investment'],
        monthly_core_expense=monthly_arrays['monthly_core_expense'],
        monthly_fun_expense=monthly_arrays['monthly_fun_expense'],
        monthly_future_expense=monthly_arrays['monthly_future_expense'],
        monthly_savings_rate=monthly_arrays['monthly_savings_rate'],
        monthly_investment_rate=monthly_arrays['monthly_investment_rate'],
        by_category=breakdowns.by_category,
        core_categories=breakdowns.core_categories,
        income_by_category=breakdowns.income_by_category,
        expense_by_category=breakdowns.expense_by_category
    )


# ================================================================================================
#                                   Emergency Fund Analysis
# ================================================================================================

def _fetch_emergency_fund_transactions(access_token: str, start_date: date, end_date: date) -> List[dict]:
    """
    Fetch transactions for emergency fund analysis.
    
    Args:
        access_token: User's access token for database authentication
        start_date: Start date for the query
        end_date: End date for the query
    
    Returns:
        List of transaction dictionaries
    
    Raises:
        EnvironmentError: If environment variables are not set
        ConnectionError: If database query fails
    """
    if PROJECT_URL is None or ANON_KEY is None:
        logger.error('Environment variables PROJECT_URL or ANON_KEY are not set.')
        raise EnvironmentError('Missing environment variables for database connection.')

    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        user_supabase_client.postgrest.auth(access_token)
        
        query = user_supabase_client.table('fct_transactions').select('*, dim_categories(*), dim_savings_funds(*)')
        query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
        query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
        query = query.order(TRANSACTIONS_COLUMNS.DATE.value, desc=False)
        
        response = query.execute()
        return response.data

    except Exception as e:
        logger.error(f'Database query failed for emergency fund analysis: {str(e)}')
        logger.info(f'Query parameters - start_date: {start_date}, end_date: {end_date}')
        raise ConnectionError('Failed to fetch transactions from database. Please check your connection or try again later.')


def _prepare_emergency_fund_dataframe(transactions: List[dict]) -> pl.DataFrame:
    """
    Prepare DataFrame for emergency fund analysis.
    
    Args:
        transactions: List of transaction dictionaries
    
    Returns:
        Prepared DataFrame with normalized columns
    """
    if not transactions:
        return pl.DataFrame({
            'amount': pl.Series(dtype=pl.Float64),
            'date': pl.Series(dtype=pl.Utf8),
            'category_type': pl.Series(dtype=pl.Utf8),
            'category_name': pl.Series(dtype=pl.Utf8),
            'spending_type': pl.Series(dtype=pl.Utf8),
            'savings_funds': pl.Series(dtype=pl.Utf8),
            'date_parsed': pl.Series(dtype=pl.Date),
            'month_key': pl.Series(dtype=pl.Utf8),
            'abs_amount': pl.Series(dtype=pl.Float64)
        })

    # Unnest logic
    df = pl.from_dicts(transactions)
    
    # Unnest dim_categories and dim_savings_funds if they exist
    if 'dim_categories' in df.columns:
        df = df.unnest('dim_categories')
    
    if 'dim_savings_funds' in df.columns:
        df = df.unnest('dim_savings_funds')
        
    # Helper to safe add column if missing
    def safe_with_column(df, name, default, dtype):
        if name not in df.columns:
            return df.with_columns(pl.lit(default).cast(dtype).alias(name))
        return df

    df = safe_with_column(df, 'amount', 0.0, pl.Float64)
    df = safe_with_column(df, 'date', None, pl.Utf8)
    df = safe_with_column(df, 'type', '', pl.Utf8)
    df = safe_with_column(df, 'category_name', 'Unknown Category', pl.Utf8)
    df = safe_with_column(df, 'spending_type', '', pl.Utf8)
    
    rename_map = {}
    if 'type' in df.columns: rename_map['type'] = 'category_type'
    if 'fund_name' in df.columns: rename_map['fund_name'] = 'savings_funds'
    
    df = df.rename(rename_map)
    df = safe_with_column(df, 'savings_funds', None, pl.Utf8)
    
    # Fill nulls
    df = df.with_columns([
        pl.col('category_type').fill_null(''),
        pl.col('category_name').fill_null('Unknown Category'),
        pl.col('spending_type').fill_null(''),
        pl.col('amount').cast(pl.Float64).fill_null(0.0)
    ])
    
    # Derived
    df = df.with_columns([
        pl.col('date').str.to_date().alias('date_parsed'),
        pl.col('amount').abs().alias('abs_amount')
    ])
    
    df = df.with_columns([
        pl.col('date_parsed').dt.strftime('%Y-%m').alias('month_key')
    ])

    return df


def _calculate_core_expenses(df: pl.DataFrame) -> tuple[Dict[str, float], Dict[str, float]]:
    """
    Calculate core expenses by month and category.
    
    Args:
        df: Prepared DataFrame (Polars)
    
    Returns:
        Tuple of (monthly_core_expenses, core_category_breakdown)
    """
    if df.is_empty():
        return {}, {}

    # Filter for core expenses only
    core_expenses_df = df.filter((pl.col('category_type') == 'expense') & (pl.col('spending_type') == 'Core'))
    
    if core_expenses_df.is_empty():
        return {}, {}

    # Group by month
    monthly_agg = core_expenses_df.group_by('month_key').agg(pl.col('abs_amount').sum())
    monthly_core_expenses = {row['month_key']: row['abs_amount'] for row in monthly_agg.iter_rows(named=True)}
    
    # Group by category
    category_agg = core_expenses_df.group_by('category_name').agg(pl.col('abs_amount').sum())
    core_category_breakdown = {row['category_name']: row['abs_amount'] for row in category_agg.iter_rows(named=True)}

    return monthly_core_expenses, core_category_breakdown


def _emergency_fund_analysis(access_token: str, year: int) -> EmergencyFundData:
    """
    Calculate emergency fund requirements based on core expenses.
    
    This function analyzes core expenses to determine:
    1. Average monthly core expenses
    2. 3-month and 6-month emergency fund targets
    3. Breakdown by core expense category
    
    Args:
        access_token: User's access token for database authentication
        year: Year for the analysis
    
    Returns:
        EmergencyFundData containing emergency fund calculations
    
    Raises:
        EnvironmentError: If environment variables are not set
        ConnectionError: If database query fails
    """
    # Get date range for the year
    start_date, end_date = _get_year_date_range(year)
    
    # Fetch transactions
    transactions = _fetch_emergency_fund_transactions(access_token, start_date, end_date)
    
    # Prepare DataFrame
    df = _prepare_emergency_fund_dataframe(transactions)
    
    # Calculate core expenses
    monthly_core_expenses, core_category_breakdown = _calculate_core_expenses(df)
    
    # Calculate average monthly core expenses
    if monthly_core_expenses:
        total_core_expenses = sum(monthly_core_expenses.values())
        months_with_data = len(monthly_core_expenses)
        average_monthly_core = total_core_expenses / months_with_data if months_with_data > 0 else 0
    else:
        average_monthly_core = 0
        total_core_expenses = 0
        months_with_data = 0
    
    # Calculate emergency fund requirements
    three_month_fund = average_monthly_core * 3
    six_month_fund = average_monthly_core * 6

    return EmergencyFundData(
        year=year,
        average_monthly_core_expenses=round(average_monthly_core, 2),
        total_core_expenses=round(total_core_expenses, 2),
        three_month_fund_target=round(three_month_fund, 2),
        six_month_fund_target=round(six_month_fund, 2),
        core_category_breakdown={k: round(v, 2) for k, v in core_category_breakdown.items()},
        months_analyzed=months_with_data
    )