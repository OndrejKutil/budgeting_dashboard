# imports
import calendar
import logging
from datetime import date
from typing import List
from pydantic import BaseModel, Field

from ..columns import TRANSACTIONS_COLUMNS
from ..environment import PROJECT_URL, ANON_KEY
from supabase.client import create_client, Client
import pandas as pd

# schemas
from ...schemas.endpoint_schemas import (
    MonthlyAnalyticsData,
    DailySpendingData,
    CategoryBreakdownData,
    SpendingTypeBreakdownData
)


# Create logger for this module
logger = logging.getLogger(__name__)


# ================================================================================================
#                                   Internal Data Classes
# ================================================================================================

class MonthlyTotals(BaseModel):
    """Internal data class for storing calculated monthly totals"""
    income: float = Field(0.0)
    expenses: float = Field(0.0)
    savings: float = Field(0.0)
    investments: float = Field(0.0)
    profit: float = Field(0.0)
    cashflow: float = Field(0.0)


# ================================================================================================
#                                   Helper Functions
# ================================================================================================

def _get_month_date_range(year: int, month: int) -> tuple[date, date]:
    """
    Get the start and end dates for a specific month.
    
    Args:
        year: Year for the date range
        month: Month for the date range (1-12)
    
    Returns:
        Tuple of (start_date, end_date)
    """
    start_date = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    end_date = date(year, month, last_day)
    return start_date, end_date


def _fetch_monthly_transactions(access_token: str, start_date: date, end_date: date) -> List[dict]:
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
        
        query = user_supabase_client.table('fct_transactions').select(
            '*',
            'dim_categories(*)'
        )
        query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
        query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
        query = query.order(TRANSACTIONS_COLUMNS.DATE.value, desc=False)
        
        response = query.execute()
        return response.data

    except Exception as e:
        logger.error(f'Database query failed for monthly transactions: {str(e)}')
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
    df['abs_amount'] = df['amount'].abs()

    return df


def _calculate_monthly_totals(df: pd.DataFrame) -> MonthlyTotals:
    """
    Calculate all monthly financial totals from the transactions DataFrame.
    
    Important: Expenses, savings, and investments are stored as negative numbers in the database.
    We use absolute values for display purposes.
    
    Args:
        df: Prepared transactions DataFrame
    
    Returns:
        MonthlyTotals dataclass with all calculated values
    """
    if df.empty:
        return MonthlyTotals(income=0.0, expenses=0.0, savings=0.0, investments=0.0, profit=0.0, cashflow=0.0)

    # Income: use original amount (positive)
    total_income = df[df['category_type'] == 'income']['amount'].sum()
    savings_fund_income = df[(df['category_type'] == 'income') & (df['savings_funds'].notnull())]['amount'].sum()
    total_income_wo_savings_funds = total_income - savings_fund_income

    # Expenses, savings, investments: use absolute amounts for display
    total_expenses = df[df['category_type'] == 'expense']['abs_amount'].sum()
    total_savings = df[df['category_type'] == 'saving']['abs_amount'].sum()
    total_savings_w_withdrawals = total_savings - savings_fund_income
    total_investments = df[df['category_type'] == 'investment']['abs_amount'].sum()
    
    # Calculate profit and cashflow
    profit = total_income_wo_savings_funds - total_expenses - total_investments
    cashflow = total_income - total_expenses - total_investments - total_savings

    return MonthlyTotals(
        income=round(total_income_wo_savings_funds, 2),
        expenses=round(total_expenses, 2),
        savings=round(total_savings_w_withdrawals, 2),
        investments=round(total_investments, 2),
        profit=round(profit, 2),
        cashflow=round(cashflow, 2)
    )


def _calculate_daily_spending_heatmap(df: pd.DataFrame) -> List[DailySpendingData]:
    """
    Calculate daily spending amounts for heatmap visualization.
    
    Args:
        df: Prepared transactions DataFrame
    
    Returns:
        List of DailySpendingData objects with day and amount
    """
    if df.empty:
        return []

    daily_spending = df[df['category_type'] == 'expense'].groupby('date_parsed')['abs_amount'].sum().reset_index()
    
    return [
        DailySpendingData(
            day=row['date_parsed'].isoformat(),
            amount=round(row['abs_amount'], 2)
        )
        for _, row in daily_spending.iterrows()
    ]


def _calculate_category_breakdown(df: pd.DataFrame) -> List[CategoryBreakdownData]:
    """
    Calculate spending breakdown by category (expenses only).
    
    Args:
        df: Prepared transactions DataFrame
    
    Returns:
        List of CategoryBreakdownData objects with category name and total
    """
    if df.empty:
        return []

    category_data = df[df['category_type'] == 'expense']
    if category_data.empty:
        return []
    
    category_totals = category_data.groupby('category_name')['abs_amount'].sum()
    
    return [
        CategoryBreakdownData(
            category=str(category_name),
            total=round(total, 2)
        )
        for category_name, total in category_totals.items()
    ]


def _calculate_spending_type_breakdown(df: pd.DataFrame) -> List[SpendingTypeBreakdownData]:
    """
    Calculate spending breakdown by spending type (Core, Necessary, Fun, Future).
    
    Args:
        df: Prepared transactions DataFrame
    
    Returns:
        List of SpendingTypeBreakdownData objects with type and amount
    """
    if df.empty:
        return []

    breakdown = []
    
    # Define spending types and their filters
    spending_type_configs = [
        ('Core', (df['category_type'] == 'expense') & (df['spending_type'] == 'Core')),
        ('Necessary', (df['category_type'] == 'expense') & (df['spending_type'] == 'Necessary')),
        ('Fun', (df['category_type'] == 'expense') & (df['spending_type'] == 'Fun')),
        ('Future', df['spending_type'] == 'Future'),
    ]
    
    for type_name, filter_condition in spending_type_configs:
        amount = df[filter_condition]['abs_amount'].sum()
        if amount > 0:
            breakdown.append(
                SpendingTypeBreakdownData(
                    type=type_name,
                    amount=round(amount, 2)
                )
            )
    
    return breakdown


# ================================================================================================
#                                   Main Analytics Function
# ================================================================================================

def _monthly_analytics(access_token: str, year: int, month: int) -> MonthlyAnalyticsData:
    """
    Calculate comprehensive monthly analytics for a specific month and year.
    
    This function orchestrates the monthly analytics calculation by:
    1. Fetching transactions from the database
    2. Preparing the data in a DataFrame
    3. Calculating various metrics and breakdowns
    
    Important: Expenses, savings, and investments are stored as negative numbers in the database.
    We use absolute values for display purposes and simple addition for calculations since 
    the negative signs are already embedded in the stored amounts.
    
    Args:
        access_token: User's access token for database authentication
        year: Year for the analysis
        month: Month for the analysis (1-12)
    
    Returns:
        MonthlyAnalyticsData containing all calculated analytics
    
    Raises:
        EnvironmentError: If environment variables are not set
        ConnectionError: If database query fails
    """
    # Get date range for the month
    start_date, end_date = _get_month_date_range(year, month)
    
    # Fetch transactions from database
    transactions = _fetch_monthly_transactions(access_token, start_date, end_date)
    
    # Prepare DataFrame for calculations
    df = _prepare_transactions_dataframe(transactions)
    
    # Calculate all metrics
    totals = _calculate_monthly_totals(df)
    daily_heatmap = _calculate_daily_spending_heatmap(df)
    category_breakdown = _calculate_category_breakdown(df)
    spending_type_breakdown = _calculate_spending_type_breakdown(df)

    return MonthlyAnalyticsData(
        year=year,
        month=month,
        month_name=calendar.month_name[month],
        income=totals.income,
        expenses=totals.expenses,
        savings=totals.savings,
        investments=totals.investments,
        profit=totals.profit,
        cashflow=totals.cashflow,
        daily_spending_heatmap=daily_heatmap,
        category_breakdown=category_breakdown,
        spending_type_breakdown=spending_type_breakdown
    )
