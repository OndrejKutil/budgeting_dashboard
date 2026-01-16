
# imports
import calendar
from datetime import date
from typing import List, Dict, Optional, Any, cast
from pydantic import BaseModel, Field
import statistics

from ..columns import TRANSACTIONS_COLUMNS
from ...data.database import get_db_client
import logging
import polars as pl

# schemas
from ...schemas.base import (
    YearlyAnalyticsData, 
    EmergencyFundData,
    YearlyHighlights,
    VolatilityMetrics,
    YearlySpendingBalance,
    MonthMetric
)


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
    """Get the start and end dates for a specific year."""
    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)
    return start_date, end_date


def _fetch_yearly_transactions(access_token: str, start_date: date, end_date: date) -> List[dict]:
    """Fetch transactions from the database for a specific date range."""
    try:
        user_supabase_client = get_db_client(access_token)
        query = user_supabase_client.table('fct_transactions').select('*, dim_categories(*)')
        query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
        query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
        query = query.order(TRANSACTIONS_COLUMNS.DATE.value, desc=False)
        response = query.execute()
        return cast(List[dict[Any, Any]], response.data)
    except Exception as e:
        logger.error(f'Database query failed for yearly transactions: {str(e)}')
        logger.info(f'Query parameters - start_date: {start_date}, end_date: {end_date}')
        raise ConnectionError('Failed to fetch transactions from database.')


def _prepare_transactions_dataframe(transactions: List[dict]) -> pl.DataFrame:
    """Convert raw transaction data to a prepared polars DataFrame."""
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
    if 'type' in df.columns and 'category_type' not in df.columns:
        rename_map['type'] = 'category_type'
    if 'savings_fund_id_fk' in df.columns: rename_map['savings_fund_id_fk'] = 'savings_funds'
    elif 'savings_fund_id' in df.columns: rename_map['savings_fund_id'] = 'savings_funds'
    
    df = df.rename(rename_map)
    df = safe_with_column(df, 'savings_funds', None, pl.Utf8)
    
    df = df.with_columns([
        pl.col('category_type').fill_null(''),
        pl.col('category_name').fill_null('Unknown Category'),
        pl.col('spending_type').fill_null(''),
        pl.col('amount').cast(pl.Float64).fill_null(0.0)
    ])
    
    df = df.with_columns([
        pl.col('date').str.to_date().alias('date_parsed'),
        pl.col('amount').abs().alias('abs_amount')
    ])
    
    df = df.with_columns([
        pl.col('date_parsed').dt.strftime('%b').alias('month_name')
    ])

    return cast(pl.DataFrame, df)


def _initialize_monthly_data() -> Dict[str, MonthlyDataPoint]:
    """Initialize the monthly data structure for all 12 months."""
    monthly_data = {}
    for month in range(1, 13):
        month_name = calendar.month_abbr[month]
        monthly_data[month_name] = MonthlyDataPoint()
    return monthly_data


def _calculate_monthly_aggregations(df: pl.DataFrame, monthly_data: Dict[str, MonthlyDataPoint]) -> Dict[str, MonthlyDataPoint]:
    """Calculate monthly aggregations from the transactions DataFrame."""
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
    
    # 1. Income (total)
    income_rows = monthly_groups.filter(pl.col('category_type') == 'income')
    for row in income_rows.iter_rows(named=True):
        if row['month_name'] in monthly_data:
            monthly_data[row['month_name']].income = row['amount']
    
    # 2. Income wo savings funds
    income_wo_savings = (
        df.filter(pl.col('category_type') == 'income')
          .group_by('month_name')
          .agg([
              (pl.col('amount').sum() - 
               pl.col('amount').filter(pl.col('category_name') == 'Savings Funds Withdrawal').sum().fill_null(0.0)
              ).alias('income_wo_savings_funds')
          ])
    )
    for row in income_wo_savings.iter_rows(named=True):
        if row['month_name'] in monthly_data:
            monthly_data[row['month_name']].income_wo_savings_funds = row['income_wo_savings_funds']
            
    # 3. Expenses
    expense_rows = monthly_groups.filter(pl.col('category_type') == 'expense')
    for row in expense_rows.iter_rows(named=True):
        if row['month_name'] in monthly_data:
            monthly_data[row['month_name']].expense = row['abs_amount']
            
    # 4. Savings
    saving_rows = monthly_groups.filter(pl.col('category_type') == 'saving')
    for row in saving_rows.iter_rows(named=True):
        if row['month_name'] in monthly_data:
            monthly_data[row['month_name']].saving = row['abs_amount']
            
    # 5. Withdrawals
    savings_withdrawals = (
        df.filter((pl.col('category_type') == 'income') & (pl.col('category_name') == 'Savings Funds Withdrawal'))
          .group_by('month_name')
          .agg(pl.col('amount').sum().alias('amount'))
    )
    withdrawals_map = {row['month_name']: row['amount'] for row in savings_withdrawals.iter_rows(named=True)}
    for month in monthly_data.keys():
        monthly_data[month].savings_w_withdrawals = monthly_data[month].saving - withdrawals_map.get(month, 0.0)
        
    # 6. Investment
    investment_rows = monthly_groups.filter(pl.col('category_type') == 'investment')
    for row in investment_rows.iter_rows(named=True):
        if row['month_name'] in monthly_data:
            monthly_data[row['month_name']].investment = row['abs_amount']
            
    # 7. Core/Fun
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
                
    # 8. Future
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
    """Calculate yearly totals from the transactions DataFrame."""
    if df.is_empty():
        return YearlyTotals()

    def get_sum(cond, col='abs_amount'):
        res = df.filter(cond).select(pl.col(col).sum()).item()
        return res if res else 0.0

    total_income = get_sum(pl.col('category_type') == 'income', 'abs_amount') # Using abs since income is positive
    savings_fund_income = get_sum((pl.col('category_type') == 'income') & (pl.col('category_name') == 'Savings Funds Withdrawal'), 'abs_amount')
    total_income_wo_savings_funds = total_income - savings_fund_income
    
    total_expense = get_sum(pl.col('category_type') == 'expense')
    total_saving = get_sum(pl.col('category_type') == 'saving')
    total_savings_w_withdrawals = total_saving - savings_fund_income
    total_investment = get_sum(pl.col('category_type') == 'investment')
    
    total_core_expense = get_sum((pl.col('category_type') == 'expense') & (pl.col('spending_type') == 'Core'))
    total_fun_expense = get_sum((pl.col('category_type') == 'expense') & (pl.col('spending_type') == 'Fun'))
    total_future_expense = get_sum(pl.col('category_type').is_in(['saving', 'investment']) & (pl.col('spending_type') == 'Future'))

    profit = total_income_wo_savings_funds - total_expense - total_investment
    
    # Net Cash Flow = Clean Income - Expenses - Investments - Net Savings
    net_cash_flow = total_income_wo_savings_funds - total_expense - total_investment - total_savings_w_withdrawals
    
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
    """Calculate category breakdowns."""
    if df.is_empty():
        return CategoryBreakdowns()

    def group_to_dict(cond, col='amount'):
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
    """Prepare monthly data arrays for chart visualization."""
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

def _calculate_highlights(monthly_data: Dict[str, MonthlyDataPoint]) -> YearlyHighlights:
    """Calculate best/worst months highlights."""
    
    best_cashflow = MonthMetric(month="N/A", value=0.0)
    highest_expenses = MonthMetric(month="N/A", value=0.0)
    best_savings_rate = MonthMetric(month="N/A", value=0.0)
    
    max_cf = -float('inf')
    max_exp = -float('inf')
    max_sr = -float('inf')
    
    for month, data in monthly_data.items():
        # Cashflow: Income - Expense - Invest - Saving (roughly)
        # Using pre-calculated components for simplicity.
        # Cashflow = Income (net) - Expenses - Investments - Savings (net)
        cf = data.income_wo_savings_funds - data.expense - data.investment - data.savings_w_withdrawals
        if cf > max_cf:
            max_cf = cf
            best_cashflow = MonthMetric(month=month, value=round(cf, 2))
            
        if data.expense > max_exp:
            max_exp = data.expense
            highest_expenses = MonthMetric(month=month, value=round(data.expense, 2))
            
        sr = 0.0
        if data.income_wo_savings_funds > 0:
            sr = (data.savings_w_withdrawals / data.income_wo_savings_funds) * 100
        if sr > max_sr:
            max_sr = sr
            best_savings_rate = MonthMetric(month=month, value=round(sr, 1))
            
    return YearlyHighlights(
        highest_cashflow_month=best_cashflow,
        highest_expense_month=highest_expenses,
        highest_savings_rate_month=best_savings_rate
    )

def _calculate_volatility(monthly_metrics: dict) -> VolatilityMetrics:
    """Calculate standard deviation for consistency metrics."""
    # monthly_metrics comes from _prepare_monthly_arrays output keys
    expenses = monthly_metrics['monthly_expense']
    incomes = monthly_metrics['monthly_income']
    
    def calc_std(data):
        if len(data) < 2: return 0.0
        # Filter out zero months if we only want active months? 
        # Usually variability includes zeros if the year isn't full, but standard deviation over 12 months 
        # where some are 0 is technically correct for "yearly variability".
        # Let's keep it simple: stdev of the array.
        return round(statistics.stdev(data), 2)
        
    return VolatilityMetrics(
        expense_volatility=calc_std(expenses),
        income_volatility=calc_std(incomes)
    )

def _calculate_spending_balance(totals: YearlyTotals) -> YearlySpendingBalance:
    """Calculate share of Core, Fun, Future spending."""
    # Total managed spend = Core + Fun + Future
    total = totals.core_expense + totals.fun_expense + totals.future_expense
    
    if total == 0:
        return YearlySpendingBalance(core_share_pct=0.0, fun_share_pct=0.0, future_share_pct=0.0)
        
    return YearlySpendingBalance(
        core_share_pct=round((totals.core_expense / total) * 100, 1),
        fun_share_pct=round((totals.fun_expense / total) * 100, 1),
        future_share_pct=round((totals.future_expense / total) * 100, 1)
    )

# ================================================================================================
#                                   Main Analytics Functions
# ================================================================================================

def _yearly_analytics(access_token: str, year: int) -> YearlyAnalyticsData:
    """Calculate comprehensive yearly analytics for a specific year."""
    start_date, end_date = _get_year_date_range(year)
    transactions = _fetch_yearly_transactions(access_token, start_date, end_date)
    df = _prepare_transactions_dataframe(transactions)
    
    monthly_data = _initialize_monthly_data()
    monthly_data = _calculate_monthly_aggregations(df, monthly_data)
    
    totals = _calculate_yearly_totals(df)
    breakdowns = _calculate_category_breakdowns(df)
    monthly_arrays = _prepare_monthly_arrays(monthly_data)
    
    # New Calculations
    highlights = _calculate_highlights(monthly_data)
    volatility = _calculate_volatility(monthly_arrays)
    balance = _calculate_spending_balance(totals)

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
        
        # New Fields
        highlights=highlights,
        volatility=volatility,
        spending_balance=balance,
        
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
    """Fetch transactions for emergency fund analysis."""
    try:
        user_supabase_client = get_db_client(access_token)
        query = user_supabase_client.table('fct_transactions').select('*, dim_categories(*), dim_savings_funds(*)')
        query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
        query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
        query = query.order(TRANSACTIONS_COLUMNS.DATE.value, desc=False)
        response = query.execute()
        return cast(List[dict[Any, Any]], response.data)
    except Exception as e:
        logger.error(f'Database query failed for emergency fund analysis: {str(e)}')
        logger.info(f'Query parameters - start_date: {start_date}, end_date: {end_date}')
        raise ConnectionError('Failed to fetch transactions from database.')


def _prepare_emergency_fund_dataframe(transactions: List[dict]) -> pl.DataFrame:
    """Prepare DataFrame for emergency fund analysis."""
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

    df = pl.from_dicts(transactions)
    
    if 'dim_categories' in df.columns:
        existing_cols = set(df.columns)
        struct_dtype = df.schema['dim_categories']
        field_names = []
        if hasattr(struct_dtype, 'fields'):
             field_names = [f.name for f in struct_dtype.fields]
        elif hasattr(struct_dtype, 'to_schema'):
             field_names = list(struct_dtype.to_schema().keys())
             
        if field_names:
            new_names = [f"dim_categories_{x}" if x in existing_cols else x for x in field_names]
            df = df.with_columns(
                pl.col('dim_categories').struct.rename_fields(new_names)
            )
        df = df.unnest('dim_categories')
    
    if 'dim_savings_funds' in df.columns:
        existing_cols = set(df.columns)
        struct_dtype = df.schema['dim_savings_funds']
        field_names = []
        if hasattr(struct_dtype, 'fields'):
             field_names = [f.name for f in struct_dtype.fields]
        elif hasattr(struct_dtype, 'to_schema'):
             field_names = list(struct_dtype.to_schema().keys())

        if field_names:
            new_names = [f"dim_savings_funds_{x}" if x in existing_cols else x for x in field_names]
            df = df.with_columns(
                pl.col('dim_savings_funds').struct.rename_fields(new_names)
            )
        df = df.unnest('dim_savings_funds')
        
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
    if 'type' in df.columns and 'category_type' not in df.columns:
        rename_map['type'] = 'category_type'
    if 'fund_name' in df.columns: rename_map['fund_name'] = 'savings_funds'
    
    df = df.rename(rename_map)
    df = safe_with_column(df, 'savings_funds', None, pl.Utf8)
    
    df = df.with_columns([
        pl.col('category_type').fill_null(''),
        pl.col('category_name').fill_null('Unknown Category'),
        pl.col('spending_type').fill_null(''),
        pl.col('amount').cast(pl.Float64).fill_null(0.0)
    ])
    
    df = df.with_columns([
        pl.col('date').str.to_date().alias('date_parsed'),
        pl.col('amount').abs().alias('abs_amount')
    ])
    
    df = df.with_columns([
        pl.col('date_parsed').dt.strftime('%Y-%m').alias('month_key')
    ])

    return cast(pl.DataFrame, df)


def _calculate_core_expenses(df: pl.DataFrame) -> tuple[Dict[str, float], Dict[str, float]]:
    """Calculate core expenses by month and category."""
    if df.is_empty():
        return {}, {}

    core_expenses_df = df.filter((pl.col('category_type') == 'expense') & (pl.col('spending_type') == 'Core'))
    
    if core_expenses_df.is_empty():
        return {}, {}

    monthly_agg = core_expenses_df.group_by('month_key').agg(pl.col('abs_amount').sum())
    monthly_core_expenses = {row['month_key']: row['abs_amount'] for row in monthly_agg.iter_rows(named=True)}
    
    category_agg = core_expenses_df.group_by('category_name').agg(pl.col('abs_amount').sum())
    core_category_breakdown = {row['category_name']: row['abs_amount'] for row in category_agg.iter_rows(named=True)}

    return monthly_core_expenses, core_category_breakdown


def _fetch_savings_funds_balance(access_token: str) -> float:
    """
    Fetch current total balance of proper emergency funds.
    Criteria:
    1. Fund name must contain "emergency fund" (case-insensitive, space-insensitive).
    2. Sum of all transactions linked to matching funds.
    """
    try:
        user_supabase_client = get_db_client(access_token)
        
        # 1. Get all savings funds to check names in Python (for better fuzzy matching)
        # or use ILIKE if simple enough. User asked for "space insensitive" which implies regex or normalization.
        # Let's fetch all and filter in python to be safe and precise with the logic requested.
        funds_response = user_supabase_client.table('dim_savings_funds').select('savings_funds_id_pk, fund_name').execute()
        
        if not funds_response.data:
            return 0.0
            
        matching_fund_ids = []
        for fund in funds_response.data:
            name = fund.get('fund_name', '').lower()
            # Normalize spaces: remove all spaces to check for "emergencyfund" sequence?
            # User said: "check for case and space insensitive match for Emergency fund"
            # "accept anything after" -> substring match
            # Let's normalize: reduce multiple spaces to one, then check "emergency fund"?
            # Or remove all spaces and check "emergencyfund"? 
            # "space insensitive" usually can mean "EmergencyFund" == "Emergency Fund".
            normalized_name = name.replace(" ", "")
            if "emergencyfund" in normalized_name:
                matching_fund_ids.append(fund['savings_funds_id_pk'])
                
        if not matching_fund_ids:
            return 0.0

        # 2. Fetch transactions for these specific funds
        query = user_supabase_client.table('fct_transactions')\
            .select('amount')\
            .in_('savings_fund_id_fk', matching_fund_ids)
        
        response = query.execute()
        
        if not response.data:
            return 0.0
            
        # Savings are stored as negative values (money leaving account to fund)
        total_balance = abs(sum(item.get('amount', 0.0) for item in response.data))
        return float(total_balance)
    except Exception as e:
        logger.error(f'Database query failed for emergency funds filters: {str(e)}')
        return 0.0


def _calculate_expense_stats(df: pl.DataFrame, spending_types: List[str]) -> tuple[float, float]:
    """Calculate average monthly and total expenses for given spending types."""
    if df.is_empty():
        return 0.0, 0.0

    target_expenses = df.filter(
        (pl.col('category_type') == 'expense') & 
        (pl.col('spending_type').is_in(spending_types))
    )
    
    if target_expenses.is_empty():
        return 0.0, 0.0

    monthly_agg = target_expenses.group_by('month_key').agg(pl.col('abs_amount').sum())
    
    total_expenses = monthly_agg.select(pl.col('abs_amount').sum()).item()
    months_with_data = monthly_agg.height
    
    average_monthly = total_expenses / months_with_data if months_with_data > 0 else 0.0
    
    return average_monthly, total_expenses


def _emergency_fund_analysis(access_token: str, year: int) -> EmergencyFundData:
    """Calculate emergency fund requirements based on core expenses."""
    start_date, end_date = _get_year_date_range(year)
    transactions = _fetch_emergency_fund_transactions(access_token, start_date, end_date)
    df = _prepare_emergency_fund_dataframe(transactions)
    
    # 1. Fetch Current Savings
    current_savings = _fetch_savings_funds_balance(access_token)
    
    # 2. Calculate Core Stats
    monthly_core_expenses, core_category_breakdown = _calculate_core_expenses(df)
    if monthly_core_expenses:
        total_core_expenses = sum(monthly_core_expenses.values())
        months_with_data = len(monthly_core_expenses)
        average_monthly_core = total_core_expenses / months_with_data if months_with_data > 0 else 0
    else:
        average_monthly_core = 0
        total_core_expenses = 0
        months_with_data = 0
        
    # 3. Calculate Core + Necessary Stats
    avg_core_nec, total_core_nec = _calculate_expense_stats(df, ['Core', 'Necessary'])
    
    # 4. Calculate All Expenses (Core + Necessary + Fun) Stats
    avg_all, total_all = _calculate_expense_stats(df, ['Core', 'Necessary', 'Fun'])

    return EmergencyFundData(
        year=year,
        
        # Core
        average_monthly_core_expenses=round(average_monthly_core, 2),
        total_core_expenses=round(total_core_expenses, 2),
        three_month_core_target=round(average_monthly_core * 3, 2),
        six_month_core_target=round(average_monthly_core * 6, 2),
        core_category_breakdown={k: round(v, 2) for k, v in core_category_breakdown.items()},
        
        # Core + Necessary
        average_monthly_core_necessary=round(avg_core_nec, 2),
        total_core_necessary=round(total_core_nec, 2),
        three_month_core_necessary_target=round(avg_core_nec * 3, 2),
        six_month_core_necessary_target=round(avg_core_nec * 6, 2),
        
        # All
        average_monthly_all_expenses=round(avg_all, 2),
        total_all_expenses=round(total_all, 2),
        three_month_all_target=round(avg_all * 3, 2),
        six_month_all_target=round(avg_all * 6, 2),
        
        # Current
        current_savings_amount=round(current_savings, 2),
        months_analyzed=months_with_data
    )