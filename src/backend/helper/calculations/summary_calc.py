# imports
import logging
from datetime import date
from typing import List, Dict, Optional
from pydantic import BaseModel, Field

from ..columns import TRANSACTIONS_COLUMNS
from ..environment import PROJECT_URL, ANON_KEY
from supabase.client import create_client, Client
import pandas as pd

# schemas
from ...schemas.endpoint_schemas import SummaryData


# Create logger for this module
logger = logging.getLogger(__name__)


# ================================================================================================
#                                   Internal Data Classes
# ================================================================================================

class SummaryTotals(BaseModel):
    """Internal data class for storing calculated summary totals"""
    income: float = Field(default=0.0)
    expense: float = Field(default=0.0)
    saving: float = Field(default=0.0)
    investment: float = Field(default=0.0)
    profit: float = Field(default=0.0)
    net_cash_flow: float = Field(default=0.0)


# ================================================================================================
#                                   Helper Functions
# ================================================================================================

def _fetch_summary_transactions(
    access_token: str, 
    start_date: Optional[date], 
    end_date: Optional[date]
) -> List[dict]:
    """
    Fetch transactions from the database with optional date filtering.
    
    Args:
        access_token: User's access token for database authentication
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
    
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
        
        query = user_supabase_client.table("fct_transactions").select(
            '*',
            'dim_categories(*)'
        )

        # Apply date filters if provided
        if start_date:
            query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
        if end_date:
            query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
            
        # Order by date for consistency
        query = query.order(TRANSACTIONS_COLUMNS.DATE.value, desc=False)
        
        response = query.execute()
        return response.data

    except Exception as e:
        logger.error(f'Database query failed for summary transactions: {str(e)}')
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
    
    # Add derived column
    df['abs_amount'] = df['amount'].abs()

    return df


def _calculate_summary_totals(df: pd.DataFrame) -> SummaryTotals:
    """
    Calculate financial summary totals from the transactions DataFrame.
    
    Important: Expenses, savings, and investments are stored as negative numbers in the database.
    We use absolute values for display purposes.
    
    Args:
        df: Prepared transactions DataFrame
    
    Returns:
        SummaryTotals with all calculated values
    """
    if df.empty:
        return SummaryTotals()

    # Income: use original amount (positive)
    total_income = df[df['category_type'] == 'income']['amount'].sum()
    savings_fund_income = df[(df['category_type'] == 'income') & (df['savings_funds'].notnull())]['amount'].sum()
    total_income_wo_savings_funds = total_income - savings_fund_income

    # Expenses, savings, investments: use absolute amounts for display
    total_expense = df[df['category_type'] == 'expense']['abs_amount'].sum()
    total_saving = df[df['category_type'] == 'saving']['abs_amount'].sum()
    total_saving_w_withdrawals = total_saving - savings_fund_income
    total_investment = df[df['category_type'] == 'investment']['abs_amount'].sum()
    
    # Calculate profit and cashflow
    profit = total_income_wo_savings_funds - total_expense - total_investment
    net_cash_flow = total_income - total_expense - total_investment - total_saving

    return SummaryTotals(
        income=round(total_income_wo_savings_funds, 2),
        expense=round(total_expense, 2),
        saving=round(total_saving_w_withdrawals, 2),
        investment=round(total_investment, 2),
        profit=round(profit, 2),
        net_cash_flow=round(net_cash_flow, 2)
    )


def _calculate_category_breakdown(df: pd.DataFrame) -> Dict[str, float]:
    """
    Calculate breakdown of amounts by category, sorted by category type and amount.
    
    Categories are sorted in order: income, expenses, savings, investments.
    Within each type, they are sorted by absolute amount descending.
    
    Args:
        df: Prepared transactions DataFrame
    
    Returns:
        Dictionary mapping category names to their total amounts
    """
    if df.empty:
        return {}

    # Group by category name using pandas aggregation
    category_totals = df.groupby(['category_name', 'category_type'])['amount'].sum().reset_index()
    
    # Separate categories by type for custom sorting
    expense_categories = category_totals[category_totals['category_type'] == 'expense'].copy()
    income_categories = category_totals[category_totals['category_type'] == 'income'].copy()
    saving_categories = category_totals[category_totals['category_type'] == 'saving'].copy()
    investment_categories = category_totals[category_totals['category_type'] == 'investment'].copy()
    
    # Sort each type descending by amount (using absolute value for proper sorting)
    expense_categories = expense_categories.reindex(
        expense_categories['amount'].abs().sort_values(ascending=False).index
    )
    income_categories = income_categories.reindex(
        income_categories['amount'].abs().sort_values(ascending=False).index
    )
    saving_categories = saving_categories.reindex(
        saving_categories['amount'].abs().sort_values(ascending=False).index
    )
    investment_categories = investment_categories.reindex(
        investment_categories['amount'].abs().sort_values(ascending=False).index
    )
    
    # Combine in desired order: income, expenses, then savings and investments at the end
    sorted_categories = pd.concat([
        income_categories,
        expense_categories,
        saving_categories,
        investment_categories
    ], ignore_index=True)
    
    # Convert to dictionary and round values
    by_category = dict(zip(sorted_categories['category_name'], sorted_categories['amount']))
    return {k: round(v, 2) for k, v in by_category.items()}


# ================================================================================================
#                                   Main Summary Function
# ================================================================================================

def _summary_calc(
    access_token: str, 
    start_date: Optional[date], 
    end_date: Optional[date]
) -> SummaryData:
    """
    Calculate financial summary for the specified date range.
    
    This function orchestrates the summary calculation by:
    1. Fetching transactions from the database
    2. Preparing the data in a DataFrame
    3. Calculating totals and category breakdowns
    
    Important: Expenses, savings, and investments are stored as negative numbers in the database.
    We use absolute values for display purposes.
    
    Args:
        access_token: User's access token for database authentication
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
    
    Returns:
        SummaryData containing the financial summary
    
    Raises:
        EnvironmentError: If environment variables are not set
        ConnectionError: If database query fails
    """
    # Fetch transactions from database
    transactions = _fetch_summary_transactions(access_token, start_date, end_date)
    
    # Prepare DataFrame for calculations
    df = _prepare_transactions_dataframe(transactions)
    
    # Calculate totals and breakdown
    totals = _calculate_summary_totals(df)
    by_category = _calculate_category_breakdown(df)

    return SummaryData(
        total_income=totals.income,
        total_expense=totals.expense,
        total_saving=totals.saving,
        total_investment=totals.investment,
        profit=totals.profit,
        net_cash_flow=totals.net_cash_flow,
        by_category=by_category
    )