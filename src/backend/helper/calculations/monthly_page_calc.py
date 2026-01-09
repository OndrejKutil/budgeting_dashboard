# imports
import calendar
import logging
from datetime import date
from typing import List
from pydantic import BaseModel, Field

from ..columns import TRANSACTIONS_COLUMNS
from ...data.database import get_db_client
import polars as pl

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

    try:
        user_supabase_client = get_db_client(access_token)
        
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
            'abs_amount': pl.Series(dtype=pl.Float64)
        })

    # Polars unnest logic
    # First create DF from list of dicts. Nested dicts become Structs.
    df = pl.from_dicts(transactions)
    
    # Check if 'categories' or 'dim_categories' exists. 
    # The Supabase query returns 'dim_categories' (aliased or not?).
    # In pandas json_normalize it flattened categories.*
    # Here we should look for the struct column.
    
    # Note: The fetch function selects 'dim_categories(*)'.
    # If the response has 'dim_categories' as a key.
    
    struct_col = None
    if 'dim_categories' in df.columns:
        struct_col = 'dim_categories'
    elif 'categories' in df.columns: # fallback if alias used
        struct_col = 'categories'
        
    if struct_col:
        # Rename colliding columns in the struct (like created_at) to avoid DuplicateError
        existing_cols = set(df.columns)
        
        # Get struct fields to generate new names
        struct_dtype = df.schema[struct_col]
        # Depending on polars version, struct fields access varies
        # We try to get field names safely
        field_names = []
        if hasattr(struct_dtype, 'fields'): # Recent polars
             field_names = [f.name for f in struct_dtype.fields]
        elif hasattr(struct_dtype, 'to_schema'):
             field_names = list(struct_dtype.to_schema().keys())
        
        # fallback if we can't get names (shouldn't happen with standard polars)
        if field_names:
            new_names = [f"{struct_col}_{x}" if x in existing_cols else x for x in field_names]
            
            df = df.with_columns(
                pl.col(struct_col).struct.rename_fields(new_names)
            )
            
        # Unnest the struct
        df = df.unnest(struct_col)
    
    # Rename columns if needed. 
    # After unnest, if 'type', 'category_name', 'spending_type' were in the struct, they are now columns.
    # If there were name collisions, Polars might handle them or we need to check.
    # Assuming 'categories' struct had 'type', 'category_name', 'spending_type'.
    
    # Required columns and filling nulls
    
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
    df = safe_with_column(df, 'savings_fund_id', None, pl.Utf8) # Original was savings_fund_id
    
    # Rename to match internal logic expectations
    # pandas code mapped: 'categories.type' -> 'category_type'
    
    rename_map = {}
    if 'type' in df.columns: rename_map['type'] = 'category_type'
    if 'savings_fund_id' in df.columns: rename_map['savings_fund_id'] = 'savings_funds'
    
    df = df.rename(rename_map)
    
    # Fill nulls
    df = df.with_columns([
        pl.col('category_type').fill_null(''),
        pl.col('category_name').fill_null('Unknown Category'),
        pl.col('spending_type').fill_null(''),
        pl.col('amount').cast(pl.Float64).fill_null(0.0)
    ])
    
    # Derived columns
    # date is string YYYY-MM-DD
    
    df = df.with_columns([
        pl.col('date').str.to_date().alias('date_parsed'),
        pl.col('amount').abs().alias('abs_amount')
    ])
    
    return df


def _calculate_monthly_totals(df: pl.DataFrame) -> MonthlyTotals:
    """
    Calculate all monthly financial totals from the transactions DataFrame.
    
    Args:
        df: Prepared transactions DataFrame (Polars)
    
    Returns:
        MonthlyTotals dataclass with all calculated values
    """
    if df.is_empty():
        return MonthlyTotals(income=0.0, expenses=0.0, savings=0.0, investments=0.0, profit=0.0, cashflow=0.0)

    # Income
    income_df = df.filter(pl.col('category_type') == 'income')
    total_income = income_df.select(pl.col('amount').sum()).item() or 0.0
    
    savings_fund_income = income_df.filter(pl.col('savings_funds').is_not_null()).select(pl.col('amount').sum()).item() or 0.0
    total_income_wo_savings_funds = total_income - savings_fund_income

    # Expenses, savings, investments (absolute)
    total_expenses = df.filter(pl.col('category_type') == 'expense').select(pl.col('abs_amount').sum()).item() or 0.0
    total_savings = df.filter(pl.col('category_type') == 'saving').select(pl.col('abs_amount').sum()).item() or 0.0
    total_savings_w_withdrawals = total_savings - savings_fund_income
    total_investments = df.filter(pl.col('category_type') == 'investment').select(pl.col('abs_amount').sum()).item() or 0.0
    
    # Profit and Cashflow
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


def _calculate_daily_spending_heatmap(df: pl.DataFrame) -> List[DailySpendingData]:
    """
    Calculate daily spending amounts for heatmap visualization.
    
    Args:
        df: Prepared transactions DataFrame (Polars)
    
    Returns:
        List of DailySpendingData objects with day and amount
    """
    if df.is_empty():
        return []

    daily_spending = (
        df.filter(pl.col('category_type') == 'expense')
          .group_by('date_parsed')
          .agg(pl.col('abs_amount').sum())
          .sort('date_parsed')
    )
    
    result = []
    # iter_rows usually returns tuple values
    for row in daily_spending.iter_rows(named=True):
        if row['date_parsed']:
            result.append(
                DailySpendingData(
                    day=row['date_parsed'].isoformat(),
                    amount=round(row['abs_amount'], 2)
                )
            )
    return result


def _calculate_category_breakdown(df: pl.DataFrame) -> List[CategoryBreakdownData]:
    """
    Calculate spending breakdown by category (expenses only).
    
    Args:
        df: Prepared transactions DataFrame (Polars)
    
    Returns:
        List of CategoryBreakdownData objects with category name and total
    """
    if df.is_empty():
        return []

    category_data = (
        df.filter(pl.col('category_type') == 'expense')
          .group_by('category_name')
          .agg(pl.col('abs_amount').sum())
    )
    
    if category_data.is_empty():
        return []
        
    return [
        CategoryBreakdownData(
            category=str(row['category_name']),
            total=round(row['abs_amount'], 2)
        )
        for row in category_data.iter_rows(named=True)
    ]


def _calculate_spending_type_breakdown(df: pl.DataFrame) -> List[SpendingTypeBreakdownData]:
    """
    Calculate spending breakdown by spending type (Core, Necessary, Fun, Future).
    
    Args:
        df: Prepared transactions DataFrame (Polars)
    
    Returns:
        List of SpendingTypeBreakdownData objects with type and amount
    """
    if df.is_empty():
        return []

    breakdown = []
    
    # Define spending types and their filters in a list of tuples (name, expression)
    # Using expressions directly
    
    configs = [
        ('Core', (pl.col('category_type') == 'expense') & (pl.col('spending_type') == 'Core')),
        ('Necessary', (pl.col('category_type') == 'expense') & (pl.col('spending_type') == 'Necessary')),
        ('Fun', (pl.col('category_type') == 'expense') & (pl.col('spending_type') == 'Fun')),
        ('Future', pl.col('spending_type') == 'Future'),
    ]
    
    for type_name, condition in configs:
        amount = df.filter(condition).select(pl.col('abs_amount').sum()).item()
        # amount can be None if filter is empty in some polars versions or 0.0
        if amount and amount > 0:
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
