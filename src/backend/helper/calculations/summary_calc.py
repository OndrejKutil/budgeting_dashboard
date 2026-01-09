# imports
import logging
from datetime import date
from typing import List, Dict, Optional
from pydantic import BaseModel, Field

from ..columns import TRANSACTIONS_COLUMNS
from ...data.database import get_db_client
import polars as pl

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

    try:
        user_supabase_client = get_db_client(access_token)
        
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
        existing_cols = set(df.columns)
        struct_dtype = df.schema[struct_col]
        field_names = []
        if hasattr(struct_dtype, 'fields'):
             field_names = [f.name for f in struct_dtype.fields]
        elif hasattr(struct_dtype, 'to_schema'):
             field_names = list(struct_dtype.to_schema().keys())
             
        if field_names:
            new_names = [f"{struct_col}_{x}" if x in existing_cols else x for x in field_names]
            df = df.with_columns(
                pl.col(struct_col).struct.rename_fields(new_names)
            )
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
    df = safe_with_column(df, 'savings_fund_id', None, pl.Utf8)
    
    rename_map = {}
    if 'type' in df.columns: rename_map['type'] = 'category_type'
    if 'savings_fund_id' in df.columns: rename_map['savings_fund_id'] = 'savings_funds'
    
    df = df.rename(rename_map)
    
    # Fill nulls and types
    df = df.with_columns([
        pl.col('category_type').fill_null(''),
        pl.col('category_name').fill_null('Unknown Category'),
        pl.col('spending_type').fill_null(''),
        pl.col('amount').cast(pl.Float64).fill_null(0.0)
    ])
    
    # Derived column
    df = df.with_columns([
        pl.col('amount').abs().alias('abs_amount')
    ])

    return df


def _calculate_summary_totals(df: pl.DataFrame) -> SummaryTotals:
    """
    Calculate financial summary totals from the transactions DataFrame.
    
    Args:
        df: Prepared transactions DataFrame (Polars)
    
    Returns:
        SummaryTotals with all calculated values
    """
    if df.is_empty():
        return SummaryTotals()

    # Income
    income_df = df.filter(pl.col('category_type') == 'income')
    total_income = income_df.select(pl.col('amount').sum()).item() or 0.0
    
    savings_fund_income = income_df.filter(pl.col('savings_funds').is_not_null()).select(pl.col('amount').sum()).item() or 0.0
    total_income_wo_savings_funds = total_income - savings_fund_income

    # Expenses, savings, investments (absolute)
    total_expense = df.filter(pl.col('category_type') == 'expense').select(pl.col('abs_amount').sum()).item() or 0.0
    total_saving = df.filter(pl.col('category_type') == 'saving').select(pl.col('abs_amount').sum()).item() or 0.0
    total_saving_w_withdrawals = total_saving - savings_fund_income
    total_investment = df.filter(pl.col('category_type') == 'investment').select(pl.col('abs_amount').sum()).item() or 0.0
    
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


def _calculate_category_breakdown(df: pl.DataFrame) -> Dict[str, float]:
    """
    Calculate breakdown of amounts by category, sorted by category type and amount.
    
    Categories are sorted in order: income, expenses, savings, investments.
    Within each type, they are sorted by absolute amount descending.
    
    Args:
        df: Prepared transactions DataFrame (Polars)
    
    Returns:
        Dictionary mapping category names to their total amounts
    """
    if df.is_empty():
        return {}

    # Group by category name and type
    category_totals = (
        df.group_by(['category_name', 'category_type'])
          .agg(pl.col('amount').sum())
    )
    
    if category_totals.is_empty():
        return {}
    
    # We need to sort by type (specific order) and then amount descending (abs)
    # Mapping type to priority index
    # income: 0, expense: 1, saving: 2, investment: 3
    
    def type_priority(t):
        if t == 'income': return 0
        if t == 'expense': return 1
        if t == 'saving': return 2
        if t == 'investment': return 3
        return 4
        
    # Polars doesn't have custom sort key easily in eager mode like python sort, 
    # but we can add conditional column or use python logic on the result since it's small.
    # Actually, we can just split and sort like original code or use Polars expressions.
    
    # Easier to replicate original logic: specific order of types.
    
    result_dict = {}
    
    for type_name in ['income', 'expense', 'saving', 'investment']:
        type_df = category_totals.filter(pl.col('category_type') == type_name)
        if not type_df.is_empty():
            # Sort by absolute amount descending
            type_df = type_df.sort(pl.col('amount').abs(), descending=True)
            
            # Add to result
            for row in type_df.iter_rows(named=True):
                result_dict[row['category_name']] = round(row['amount'], 2)
                
    return result_dict


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