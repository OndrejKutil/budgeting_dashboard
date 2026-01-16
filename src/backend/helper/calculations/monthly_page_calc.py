
# imports
import calendar
import logging
from datetime import date, timedelta
from typing import List, Tuple, Dict, Any, cast
from pydantic import BaseModel, Field

from ..columns import TRANSACTIONS_COLUMNS
# from data.database import get_db_client # Moved inside function
import polars as pl
from dateutil.relativedelta import relativedelta

# schemas
from ...schemas.base import (
    TransactionData,
    MonthlyAnalyticsData,
    DailySpendingData,
    CategoryBreakdownData,
    SpendingTypeBreakdownData,
    RunRateForecast,
    DaySplit,
    CategoryConcentration,
    MonthlyPeriodComparison
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
    """
    start_date = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    end_date = date(year, month, last_day)
    return start_date, end_date


def _fetch_monthly_transactions(access_token: str, start_date: date, end_date: date) -> List[dict]:
    """
    Fetch transactions from the database for a specific date range.
    """
    from ...data.database import get_db_client
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
        return cast(List[dict[Any, Any]], response.data)

    except Exception as e:
        logger.error(f'Database query failed for monthly transactions: {str(e)}')
        logger.info(f'Query parameters - start_date: {start_date}, end_date: {end_date}')
        raise ConnectionError('Failed to fetch transactions from database. Please check your connection or try again later.')


def _prepare_transactions_dataframe(transactions: List[dict]) -> pl.DataFrame:
    """
    Convert raw transaction data to a prepared polars DataFrame.
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
    if 'type' in df.columns and 'category_type' not in df.columns:
        rename_map['type'] = 'category_type'
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
    df = df.with_columns([
        pl.col('date').str.to_date().alias('date_parsed'),
        pl.col('amount').abs().alias('abs_amount')
    ])
    
    return cast(pl.DataFrame, df)


def _calculate_monthly_totals(df: pl.DataFrame) -> MonthlyTotals:
    """
    Calculate all monthly financial totals from the transactions DataFrame.
    """
    if df.is_empty():
        return MonthlyTotals(income=0.0, expenses=0.0, savings=0.0, investments=0.0, profit=0.0, cashflow=0.0)

    # Income
    income_df = df.filter(pl.col('category_type') == 'income')
    total_income = income_df.select(pl.col('amount').sum()).item() or 0.0
    
    savings_fund_income = income_df.filter(pl.col('category_name') == 'Savings Funds Withdrawal').select(pl.col('amount').sum()).item() or 0.0
    total_income_wo_savings_funds = total_income - savings_fund_income

    # Expenses, savings, investments (absolute)
    total_expenses = df.filter(pl.col('category_type') == 'expense').select(pl.col('abs_amount').sum()).item() or 0.0
    total_savings = df.filter(pl.col('category_type') == 'saving').select(pl.col('abs_amount').sum()).item() or 0.0
    # Net savings = (Total Savings (abs)) - (Withdrawals (positive))
    total_savings_w_withdrawals = total_savings - savings_fund_income
    total_investments = df.filter(pl.col('category_type') == 'investment').select(pl.col('abs_amount').sum()).item() or 0.0
    
    # Profit and Cashflow
    # Profit = Clean Income - Expenses - Investments
    profit = total_income_wo_savings_funds - total_expenses - total_investments
    cashflow = total_income_wo_savings_funds - total_expenses - total_investments - total_savings_w_withdrawals

    return MonthlyTotals(
        income=round(total_income_wo_savings_funds, 2),
        expenses=round(total_expenses, 2),
        savings=round(total_savings_w_withdrawals, 2),
        investments=round(total_investments, 2),
        profit=round(profit, 2),
        cashflow=round(cashflow, 2)
    )

def _calculate_run_rate(df: pl.DataFrame, year: int, month: int) -> RunRateForecast:
    """
    Calculate daily run-rate and month-end forecast.
    """
    total_days = calendar.monthrange(year, month)[1]
    today = date.today()
    
    # If analyzing past month, full duration. If current month, partial.
    if year < today.year or (year == today.year and month < today.month):
        days_elapsed = total_days
    elif year == today.year and month == today.month:
        days_elapsed = today.day
    else:
        days_elapsed = 0 # Future month
        
    days_remaining = total_days - days_elapsed
    
    # Calculate expenses so far
    expenses_so_far = 0.0
    if not df.is_empty():
         expenses_so_far = df.filter(pl.col('category_type') == 'expense').select(pl.col('abs_amount').sum()).item() or 0.0
    
    avg_daily = 0.0
    if days_elapsed > 0:
        avg_daily = expenses_so_far / days_elapsed
        
    projected = expenses_so_far + (avg_daily * days_remaining)
    
    return RunRateForecast(
        average_daily_spend=round(avg_daily, 2),
        projected_month_end_expenses=round(projected, 2),
        days_elapsed=days_elapsed,
        days_remaining=days_remaining
    )

def _calculate_day_split(df: pl.DataFrame) -> DaySplit:
    """
    Calculate average spending on weekdays vs weekends.
    """
    if df.is_empty():
        return DaySplit(average_weekday_spend=0.0, average_weekend_spend=0.0)
        
    expenses = df.filter(pl.col('category_type') == 'expense')
    if expenses.is_empty():
        return DaySplit(average_weekday_spend=0.0, average_weekend_spend=0.0)
    
    # Extract weekday: 1 (Mon) - 7 (Sun)
    # Polars dt.weekday(): 1=Mon, 7=Sun
    expenses = expenses.with_columns(
        pl.col('date_parsed').dt.weekday().alias('weekday_iso')
    )
    
    # Weekday: 1-5, Weekend: 6-7
    weekday_exp = expenses.filter(pl.col('weekday_iso') <= 5)
    weekend_exp = expenses.filter(pl.col('weekday_iso') >= 6)
    
    # We need unique dates with spending to calculate valid average
    # Or should we divide by total weekdays/weekends in that period?
    # Simple approach: sum / count of days *with transactions* OR sum / count of distinct dates found
    # Better: sum / count of distinct dates where spending happened.
    # If we want true daily average including zero days, we'd need to know the full date range range.
    # Let's use count of days in the DF for now, as filling zeros is complex without generating date range series.
    # Actually, simpler metrics are usually just average of spend days.
    
    def calc_avg(sub_df):
        if sub_df.is_empty(): return 0.0
        total = sub_df.select(pl.col('abs_amount').sum()).item() or 0.0
        # Count unique days
        n_days = sub_df.select(pl.col('date_parsed').n_unique()).item()
        return total / n_days if n_days > 0 else 0.0
        
    avg_weekday = calc_avg(weekday_exp)
    avg_weekend = calc_avg(weekend_exp)
    
    return DaySplit(
        average_weekday_spend=round(avg_weekday, 2),
        average_weekend_spend=round(avg_weekend, 2)
    )

def _calculate_concentration(df: pl.DataFrame) -> CategoryConcentration:
    """
    Calculate share of top 3 categories.
    """
    if df.is_empty():
        return CategoryConcentration(top_3_share_pct=0.0, top_3_categories=[])
        
    expenses = df.filter(pl.col('category_type') == 'expense')
    total_expenses = expenses.select(pl.col('abs_amount').sum()).item() or 0.0
    
    if total_expenses == 0:
         return CategoryConcentration(top_3_share_pct=0.0, top_3_categories=[])
         
    cat_breakdown = (
        expenses.group_by('category_name')
        .agg(pl.col('abs_amount').sum().alias('total'))
        .sort('total', descending=True)
        .head(3)
    )
    
    top_3_sum = cat_breakdown.select(pl.col('total').sum()).item() or 0.0
    share_pct = (top_3_sum / total_expenses) * 100
    
    top_cats = [
        CategoryBreakdownData(category=row['category_name'], total=round(row['total'], 2))
        for row in cat_breakdown.iter_rows(named=True)
    ]
    
    return CategoryConcentration(
        top_3_share_pct=round(share_pct, 1),
        top_3_categories=top_cats
    )

def _calculate_comparison(current: MonthlyTotals, previous: MonthlyTotals) -> MonthlyPeriodComparison:
    """
    Calculate month-over-month comparison.
    """
    def delta(curr, prev):
        return round(curr - prev, 2)
    
    def delta_pct(curr, prev):
        if prev == 0:
            return 0.0 if curr == 0 else 100.0
        return round(((curr - prev) / abs(prev)) * 100, 1)
        
    return MonthlyPeriodComparison(
        income_delta=delta(current.income, previous.income),
        income_delta_pct=delta_pct(current.income, previous.income),
        expenses_delta=delta(current.expenses, previous.expenses),
        expenses_delta_pct=delta_pct(current.expenses, previous.expenses),
        savings_delta=delta(current.savings, previous.savings),
        savings_delta_pct=delta_pct(current.savings, previous.savings),
        investments_delta=delta(current.investments, previous.investments),
        investments_delta_pct=delta_pct(current.investments, previous.investments),
        profit_delta=delta(current.profit, previous.profit),
        profit_delta_pct=delta_pct(current.profit, previous.profit),
        cashflow_delta=delta(current.cashflow, previous.cashflow),
        cashflow_delta_pct=delta_pct(current.cashflow, previous.cashflow)
    )

def _calculate_daily_spending_heatmap(df: pl.DataFrame) -> List[DailySpendingData]:
    """
    Calculate daily spending amounts for heatmap visualization.
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
    for row in daily_spending.iter_rows(named=True):
        if row['date_parsed']:
            result.append(
                DailySpendingData(
                    day=row['date_parsed'].isoformat(),
                    amount=round(row['abs_amount'], 2)
                )
            )
    return result



def _calculate_category_breakdown(df: pl.DataFrame, cat_type: str = 'expense') -> List[CategoryBreakdownData]:
    """
    Calculate spending/income breakdown by category.
    """
    if df.is_empty():
        return []

    category_data = (
        df.filter(pl.col('category_type') == cat_type)
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
    """
    if df.is_empty():
        return []

    breakdown = []
    
    configs = [
        ('Core', (pl.col('category_type') == 'expense') & (pl.col('spending_type') == 'Core')),
        ('Necessary', (pl.col('category_type') == 'expense') & (pl.col('spending_type') == 'Necessary')),
        ('Fun', (pl.col('category_type') == 'expense') & (pl.col('spending_type') == 'Fun')),
        ('Future', pl.col('spending_type') == 'Future'),
    ]
    
    for type_name, condition in configs:
        amount = df.filter(condition).select(pl.col('abs_amount').sum()).item()
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
    """
    # 1. Get dates for current month
    start_date, end_date = _get_month_date_range(year, month)
    
    # 2. Get dates for previous month
    prev_date = start_date - relativedelta(months=1)
    prev_year, prev_month = prev_date.year, prev_date.month
    prev_start_date, prev_end_date = _get_month_date_range(prev_year, prev_month)
    
    # 3. Fetch data
    current_transactions = _fetch_monthly_transactions(access_token, start_date, end_date)
    previous_transactions = _fetch_monthly_transactions(access_token, prev_start_date, prev_end_date)
    
    # 4. Prepare DFs
    current_df = _prepare_transactions_dataframe(current_transactions)
    previous_df = _prepare_transactions_dataframe(previous_transactions)
    
    # 5. Calculate Metrics
    totals = _calculate_monthly_totals(current_df)
    prev_totals = _calculate_monthly_totals(previous_df)
    
    run_rate = _calculate_run_rate(current_df, year, month)
    day_split = _calculate_day_split(current_df)
    concentration = _calculate_concentration(current_df)
    comparison = _calculate_comparison(totals, prev_totals)
    
    daily_heatmap = _calculate_daily_spending_heatmap(current_df)
    
    income_breakdown = _calculate_category_breakdown(current_df, 'income')
    expenses_breakdown = _calculate_category_breakdown(current_df, 'expense')
    
    spending_type_breakdown = _calculate_spending_type_breakdown(current_df)

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
        run_rate=run_rate,
        day_split=day_split,
        category_concentration=concentration,
        comparison=comparison,
        daily_spending_heatmap=daily_heatmap,
        income_breakdown=income_breakdown,
        expenses_breakdown=expenses_breakdown,
        spending_type_breakdown=spending_type_breakdown
    )
