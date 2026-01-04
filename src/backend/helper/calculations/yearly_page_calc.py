# imports
import calendar
from datetime import date
from typing import List, Dict, Optional
from pydantic import BaseModel, Field

from ..columns import TRANSACTIONS_COLUMNS
from ..environment import PROJECT_URL, ANON_KEY
from supabase.client import create_client, Client
import logging
import pandas as pd

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


def _prepare_transactions_dataframe(transactions: List[dict]) -> pd.DataFrame:
    """
    Convert raw transaction data to a prepared pandas DataFrame.
    
    Args:
        transactions: List of transaction dictionaries from database
    
    Returns:
        Prepared DataFrame with normalized columns and derived fields
    """
    if not transactions:
        return pd.DataFrame()

    # Flatten the nested structure using pandas json_normalize
    df = pd.json_normalize(
        transactions,
        sep='.',
        errors='ignore'
    )
    
    # Ensure we have the required columns, create them if missing
    required_columns = {
        'amount': 0.0,
        'date': '',
        'categories.type': '',
        'categories.category_name': 'Unknown Category',
        'categories.spending_type': '',
        'savings_fund_id': None
    }
    
    for col, default_val in required_columns.items():
        if col not in df.columns:
            df[col] = default_val
    
    # Rename columns to match the expected structure
    column_mapping = {
        'categories.type': 'category_type',
        'categories.category_name': 'category_name', 
        'categories.spending_type': 'spending_type',
        'savings_fund_id': 'savings_funds'
    }
    
    df = df.rename(columns=column_mapping)
    
    # Handle missing values using simple assignment
    df.loc[df['category_type'].isna(), 'category_type'] = ''
    df.loc[df['category_name'].isna(), 'category_name'] = 'Unknown Category'
    df.loc[df['spending_type'].isna(), 'spending_type'] = ''
    
    # Convert amount to float
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce').replace({pd.NA: 0.0, None: 0.0})
    
    # Add derived columns
    df['date_parsed'] = pd.to_datetime(df['date']).dt.date
    df['month_name'] = df['date_parsed'].apply(lambda x: calendar.month_abbr[x.month])
    df['abs_amount'] = df['amount'].abs()

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


def _calculate_monthly_aggregations(df: pd.DataFrame, monthly_data: Dict[str, MonthlyDataPoint]) -> Dict[str, MonthlyDataPoint]:
    """
    Calculate monthly aggregations from the transactions DataFrame.
    
    Args:
        df: Prepared transactions DataFrame
        monthly_data: Initialized monthly data structure
    
    Returns:
        Updated monthly data with calculated values
    """
    if df.empty:
        return monthly_data

    # Group by month and category type for monthly aggregations
    monthly_groups = df.groupby(['month_name', 'category_type'])['amount'].sum().reset_index()
    monthly_groups_abs = df.groupby(['month_name', 'category_type'])['abs_amount'].sum().reset_index()
    
    # Fill monthly data for income (use original amount)
    income_monthly = monthly_groups[monthly_groups['category_type'] == 'income']
    for _, row in income_monthly.iterrows():
        monthly_data[row['month_name']].income = row['amount']
    
    # Fill monthly data for income without savings funds withdrawals
    income_wo_savings_funds_monthly = df[df['category_type'] == 'income'].groupby('month_name').apply(
        lambda x: x['amount'].sum() - x[x['savings_funds'].notnull()]['amount'].sum()
    ).reset_index(name='income_wo_savings_funds')
    for _, row in income_wo_savings_funds_monthly.iterrows():
        monthly_data[row['month_name']].income_wo_savings_funds = row['income_wo_savings_funds']
    
    # Fill monthly data for expenses (use absolute amount)
    expense_monthly = monthly_groups_abs[monthly_groups_abs['category_type'] == 'expense']
    for _, row in expense_monthly.iterrows():
        monthly_data[row['month_name']].expense = row['abs_amount']
    
    # Fill monthly data for saving (use absolute amount)
    saving_monthly = monthly_groups_abs[monthly_groups_abs['category_type'] == 'saving']
    for _, row in saving_monthly.iterrows():
        monthly_data[row['month_name']].saving = row['abs_amount']
    
    # Calculate savings fund withdrawals by month
    savings_fund_withdrawals_monthly = df[(df['category_type'] == 'income') & (df['savings_funds'].notnull())].groupby('month_name')['amount'].sum()
    
    # Calculate savings with withdrawals for each month
    for month in monthly_data.keys():
        monthly_savings = monthly_data[month].saving
        monthly_withdrawals = savings_fund_withdrawals_monthly.get(month, 0.0)
        monthly_data[month].savings_w_withdrawals = monthly_savings - monthly_withdrawals
    
    # Fill monthly data for investment (use absolute amount)
    investment_monthly = monthly_groups_abs[monthly_groups_abs['category_type'] == 'investment']
    for _, row in investment_monthly.iterrows():
        monthly_data[row['month_name']].investment = row['abs_amount']
    
    # Handle core and fun expenses
    expense_df = df[df['category_type'] == 'expense']
    if not expense_df.empty:
        core_expense_monthly = expense_df[expense_df['spending_type'] == 'Core'].groupby('month_name')['abs_amount'].sum()
        for month, amount in core_expense_monthly.items():
            monthly_data[str(month)].core_expense = amount
        
        fun_expense_monthly = expense_df[expense_df['spending_type'] == 'Fun'].groupby('month_name')['abs_amount'].sum()
        for month, amount in fun_expense_monthly.items():
            monthly_data[str(month)].fun_expense = amount
    
    # Handle future expenses (from saving and investment with Future spending_type)
    future_df = df[(df['category_type'].isin(['saving', 'investment'])) & (df['spending_type'] == 'Future')]
    if not future_df.empty:
        future_expense_monthly = future_df.groupby('month_name')['abs_amount'].sum()
        for month, amount in future_expense_monthly.items():
            monthly_data[str(month)].future_expense = amount

    return monthly_data


def _calculate_yearly_totals(df: pd.DataFrame) -> YearlyTotals:
    """
    Calculate yearly totals from the transactions DataFrame.
    
    Args:
        df: Prepared transactions DataFrame
    
    Returns:
        YearlyTotals with all calculated values
    """
    if df.empty:
        return YearlyTotals()

    # Calculate totals using pandas aggregation
    total_income = df[df['category_type'] == 'income']['abs_amount'].sum()
    savings_fund_income = df[(df['category_type'] == 'income') & (df['savings_funds'].notnull())]['abs_amount'].sum()
    total_income_wo_savings_funds = total_income - savings_fund_income
    
    total_expense = df[df['category_type'] == 'expense']['abs_amount'].sum()
    total_saving = df[df['category_type'] == 'saving']['abs_amount'].sum()
    total_savings_w_withdrawals = total_saving - savings_fund_income
    total_investment = df[df['category_type'] == 'investment']['abs_amount'].sum()
    
    total_core_expense = df[(df['category_type'] == 'expense') & (df['spending_type'] == 'Core')]['abs_amount'].sum()
    total_fun_expense = df[(df['category_type'] == 'expense') & (df['spending_type'] == 'Fun')]['abs_amount'].sum()
    total_future_expense = df[(df['category_type'].isin(['saving', 'investment'])) & (df['spending_type'] == 'Future')]['abs_amount'].sum()

    # Calculate derived metrics
    profit = total_income_wo_savings_funds - total_expense - total_investment
    net_cash_flow = df['amount'].sum()
    savings_rate = (total_savings_w_withdrawals / total_income_wo_savings_funds * 100) if total_income_wo_savings_funds > 0 else 0
    investment_rate = (total_investment / total_income_wo_savings_funds * 100) if total_income_wo_savings_funds > 0 else 0

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


def _calculate_category_breakdowns(df: pd.DataFrame) -> CategoryBreakdowns:
    """
    Calculate category breakdowns from the transactions DataFrame.
    
    Args:
        df: Prepared transactions DataFrame
    
    Returns:
        CategoryBreakdowns with all category aggregations
    """
    if df.empty:
        return CategoryBreakdowns()

    by_category = df.groupby('category_name')['amount'].sum().to_dict()
    core_categories = df[(df['category_type'] == 'expense') & (df['spending_type'] == 'Core')].groupby('category_name')['abs_amount'].sum().to_dict()
    income_by_category = df[df['category_type'] == 'income'].groupby('category_name')['amount'].sum().to_dict()
    expense_by_category = df[df['category_type'] == 'expense'].groupby('category_name')['abs_amount'].sum().to_dict()

    # Round all values
    return CategoryBreakdowns(
        by_category={k: round(v, 2) for k, v in by_category.items()},
        core_categories={k: round(v, 2) for k, v in core_categories.items()},
        income_by_category={k: round(v, 2) for k, v in income_by_category.items()},
        expense_by_category={k: round(v, 2) for k, v in expense_by_category.items()}
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
        
        query = user_supabase_client.table('transactions').select('*, categories(*), savings_funds(*)')
        query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
        query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
        query = query.order(TRANSACTIONS_COLUMNS.DATE.value, desc=False)
        
        response = query.execute()
        return response.data

    except Exception as e:
        logger.error(f'Database query failed for emergency fund analysis: {str(e)}')
        logger.info(f'Query parameters - start_date: {start_date}, end_date: {end_date}')
        raise ConnectionError('Failed to fetch transactions from database. Please check your connection or try again later.')


def _prepare_emergency_fund_dataframe(transactions: List[dict]) -> pd.DataFrame:
    """
    Prepare DataFrame for emergency fund analysis.
    
    Args:
        transactions: List of transaction dictionaries
    
    Returns:
        Prepared DataFrame with normalized columns
    """
    if not transactions:
        return pd.DataFrame()

    df = pd.json_normalize(
        transactions,
        sep='.',
        errors='ignore'
    )
    
    # Ensure we have the required columns
    required_columns = {
        'amount': 0.0,
        'date': '',
        'categories.type': '',
        'categories.category_name': 'Unknown Category',
        'categories.spending_type': '',
        'savings_funds.fund_name': None
    }
    
    for col, default_val in required_columns.items():
        if col not in df.columns:
            df[col] = default_val
    
    # Rename columns
    column_mapping = {
        'categories.type': 'category_type',
        'categories.category_name': 'category_name', 
        'categories.spending_type': 'spending_type',
        'savings_funds.fund_name': 'savings_funds'
    }
    
    df = df.rename(columns=column_mapping)
    
    # Handle missing values
    df.loc[df['category_type'].isna(), 'category_type'] = ''
    df.loc[df['category_name'].isna(), 'category_name'] = 'Unknown Category'
    df.loc[df['spending_type'].isna(), 'spending_type'] = ''
    
    # Convert amount to float and add derived columns
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce').replace({pd.NA: 0.0, None: 0.0})
    df['date_parsed'] = pd.to_datetime(df['date']).dt.date
    df['month_key'] = df['date_parsed'].apply(lambda x: f'{x.year}-{x.month:02d}')

    return df


def _calculate_core_expenses(df: pd.DataFrame) -> tuple[Dict[str, float], Dict[str, float]]:
    """
    Calculate core expenses by month and category.
    
    Args:
        df: Prepared DataFrame
    
    Returns:
        Tuple of (monthly_core_expenses, core_category_breakdown)
    """
    if df.empty:
        return {}, {}

    # Filter for core expenses only
    core_expenses_df = df[(df['category_type'] == 'expense') & (df['spending_type'] == 'Core')]
    
    if core_expenses_df.empty:
        return {}, {}

    core_expenses_df = core_expenses_df.copy()
    core_expenses_df['abs_amount'] = core_expenses_df['amount'].abs()
    
    # Group by month
    monthly_core_expenses = core_expenses_df.groupby('month_key')['abs_amount'].sum().to_dict()
    
    # Group by category
    core_category_breakdown = core_expenses_df.groupby('category_name')['abs_amount'].sum().to_dict()

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