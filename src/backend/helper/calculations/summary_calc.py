
# imports
import calendar
import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, cast

# from data.database import get_db_client # Moved inside function
import polars as pl
from dateutil.relativedelta import relativedelta
from pydantic import BaseModel, Field

# schemas
from ...schemas.base import CategoryInsight, PeriodComparison, SixMonthAverage, SummaryData, TransactionData
from ..columns import TRANSACTIONS_COLUMNS

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

def _get_previous_period_dates(start_date: date | None, end_date: date | None) -> tuple[date, date]:
    """
    Calculate the start and end dates for the previous period.
    Defaults to previous month if dates are not provided.
    
    Args:
        start_date: Current period start date
        end_date: Current period end date
        
    Returns:
        Tuple of (prev_start_date, prev_end_date)
    """
    today = date.today()
    
    # Default to current month if no dates provided
    if not start_date:
        start_date = today.replace(day=1)
    if not end_date:
        # End of current month
        next_month = start_date + relativedelta(months=1)
        end_date = next_month - timedelta(days=1)
        
    # Calculate duration
    duration = (end_date - start_date).days + 1
    
    # Logic for "previous period"
    # If it looks like a full month (approx 28-31 days), compare to previous month
    # Otherwise compare to immediate previous timeframe of same duration
    
    is_full_month = False
    if start_date.day == 1:
        # Check if end_date is last day of month
        next_month_of_start = start_date + relativedelta(months=1)
        last_day = next_month_of_start - timedelta(days=1)
        if end_date == last_day:
            is_full_month = True
            
    if is_full_month:
        # Previous month
        prev_start = start_date - relativedelta(months=1)
        # End of previous month
        prev_end = start_date - timedelta(days=1)
        return prev_start, prev_end
    else:
        # Shift back by duration
        prev_end = start_date - timedelta(days=1)
        prev_start = prev_end - timedelta(days=duration - 1)
        return prev_start, prev_end


_FETCH_PAGE_SIZE = 1000
_AVERAGE_WINDOW_MONTHS = 6


def _fetch_first_transaction_date(access_token: str) -> date | None:
    """Date of the user's earliest transaction, or None when they have none."""
    from ...data.database import get_db_client
    try:
        client = get_db_client(access_token)
        response = (
            client.table("fct_transactions")
            .select(TRANSACTIONS_COLUMNS.DATE.value)
            .order(TRANSACTIONS_COLUMNS.DATE.value, desc=False)
            .limit(1)
            .execute()
        )
        rows = cast(list[dict[Any, Any]], response.data or [])
        if not rows or not rows[0].get(TRANSACTIONS_COLUMNS.DATE.value):
            return None
        return date.fromisoformat(str(rows[0][TRANSACTIONS_COLUMNS.DATE.value]))
    except Exception as e:
        logger.error(f'Database query failed for first transaction date: {str(e)}')
        raise ConnectionError('Failed to fetch transactions from database. Please check your connection or try again later.')


def _fetch_summary_transactions(
    access_token: str, 
    start_date: date | None, 
    end_date: date | None
) -> list[dict]:
    """
    Fetch transactions from the database with optional date filtering.
    """
    from ...data.database import get_db_client
    try:
        user_supabase_client = get_db_client(access_token)
        
        summary_fields = ",".join([
            TRANSACTIONS_COLUMNS.ID.value,
            TRANSACTIONS_COLUMNS.USER_ID.value,
            TRANSACTIONS_COLUMNS.ACCOUNT_ID.value,
            TRANSACTIONS_COLUMNS.CATEGORY_ID.value,
            TRANSACTIONS_COLUMNS.AMOUNT.value,
            TRANSACTIONS_COLUMNS.DATE.value,
            TRANSACTIONS_COLUMNS.NOTES.value,
            TRANSACTIONS_COLUMNS.SAVINGS_FUND_ID.value
        ])
        query = user_supabase_client.table("fct_transactions").select(
            f"{summary_fields}, dim_categories_users(type, category_name, spending_type), dim_accounts(currency)"
        )

        # Apply date filters if provided
        if start_date:
            query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
        if end_date:
            query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
            
        # Stable order (date, then id) so pages never overlap or skip rows
        query = query.order(TRANSACTIONS_COLUMNS.DATE.value, desc=False).order(TRANSACTIONS_COLUMNS.ID.value, desc=False)

        # The summary now reads up to seven months at once; PostgREST caps one response at
        # 1000 rows, so page through the result.
        rows: list[dict[Any, Any]] = []
        offset = 0
        while True:
            response = query.range(offset, offset + _FETCH_PAGE_SIZE - 1).execute()
            batch = cast(list[dict[Any, Any]], response.data or [])
            rows.extend(batch)
            if len(batch) < _FETCH_PAGE_SIZE:
                break
            offset += _FETCH_PAGE_SIZE
        return rows

    except Exception as e:
        logger.error(f'Database query failed for summary transactions: {str(e)}')
        logger.info(f'Query parameters - start_date: {start_date}, end_date: {end_date}')
        raise ConnectionError('Failed to fetch transactions from database. Please check your connection or try again later.')


def _prepare_transactions_dataframe(transactions: list[dict]) -> pl.DataFrame:
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
            'abs_amount': pl.Series(dtype=pl.Float64),
            'notes': pl.Series(dtype=pl.Utf8),
            'account_id_fk': pl.Series(dtype=pl.Utf8),
            'currency': pl.Series(dtype=pl.Utf8),
        })

    # Polars unnest logic
    df = pl.from_dicts(transactions)
    
    struct_col = None
    if 'dim_categories_users' in df.columns:
        struct_col = 'dim_categories_users'
    elif 'dim_categories' in df.columns:
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

    # Extract account currency from the dim_accounts join (many-to-one → single struct)
    if 'dim_accounts' in df.columns:
        df = df.with_columns(
            pl.col('dim_accounts').struct.field('currency').alias('currency')
        ).drop('dim_accounts')

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
    df = safe_with_column(df, 'notes', '', pl.Utf8)
    df = safe_with_column(df, 'account_id_fk', '', pl.Utf8)
    df = safe_with_column(df, 'currency', None, pl.Utf8)
    
    rename_map = {}
    if 'type' in df.columns and 'category_type' not in df.columns:
        rename_map['type'] = 'category_type'
    if 'savings_fund_id' in df.columns:
        rename_map['savings_fund_id'] = 'savings_funds'
    
    df = df.rename(rename_map)
    
    # Fill nulls and types
    df = df.with_columns([
        pl.col('category_type').fill_null(''),
        pl.col('category_name').fill_null('Unknown Category'),
        pl.col('spending_type').fill_null(''),
        pl.col('amount').cast(pl.Float64).fill_null(0.0),
        pl.col('notes').fill_null('')
    ])
    
    # Derived column
    df = df.with_columns([
        pl.col('amount').abs().alias('abs_amount'),
        pl.col('date').str.to_date().alias('date_parsed')
    ])

    return cast(pl.DataFrame, df)


def _apply_currency_conversion(df: pl.DataFrame, base_currency: str) -> pl.DataFrame:
    """Multiply amount and abs_amount by exchange rates so all values are in base_currency."""
    if df.is_empty() or 'currency' not in df.columns:
        return df
    from ..exchange_rates import get_rate
    currencies = df['currency'].fill_null(base_currency).to_list()
    rates = pl.Series('_rate', [get_rate(c, base_currency) for c in currencies], dtype=pl.Float64)
    return df.with_columns([
        (pl.col('amount') * rates).alias('amount'),
        (pl.col('abs_amount') * rates).alias('abs_amount'),
    ])


def _calculate_summary_totals(df: pl.DataFrame) -> SummaryTotals:
    """
    Calculate financial summary totals from the transactions DataFrame.
    """
    if df.is_empty():
        return SummaryTotals()

    # Income
    income_df = df.filter(pl.col('category_type') == 'income')
    total_income = income_df.select(pl.col('amount').sum()).item() or 0.0
    
    savings_fund_income = income_df.filter(pl.col('category_name') == 'Savings Funds Withdrawal').select(pl.col('amount').sum()).item() or 0.0
    total_income_wo_savings_funds = total_income - savings_fund_income

    # Expenses, savings, investments (absolute)
    total_expense = df.filter(pl.col('category_type') == 'expense').select(pl.col('abs_amount').sum()).item() or 0.0
    total_saving = df.filter(pl.col('category_type') == 'saving').select(pl.col('abs_amount').sum()).item() or 0.0
    total_saving_w_withdrawals = total_saving - savings_fund_income
    total_investment = df.filter(pl.col('category_type') == 'investment').select(pl.col('abs_amount').sum()).item() or 0.0
    
    # Calculate profit and cashflow
    profit = total_income_wo_savings_funds - total_expense - total_investment
    
    # Net Cash Flow = Clean Income - Expenses - Investments - Net Savings
    net_cash_flow = total_income_wo_savings_funds - total_expense - total_investment - total_saving_w_withdrawals

    return SummaryTotals(
        income=round(total_income_wo_savings_funds, 2),
        expense=round(total_expense, 2),
        saving=round(total_saving_w_withdrawals, 2),
        investment=round(total_investment, 2),
        profit=round(profit, 2),
        net_cash_flow=round(net_cash_flow, 2)
    )

def _calculate_period_comparison(current: SummaryTotals, previous: SummaryTotals) -> PeriodComparison:
    """
    Calculate period-over-period comparison metrics.
    """
    def calc_delta(curr, prev):
        return round(curr - prev, 2)
        
    def calc_pct(curr, prev):
        if prev == 0:
            return 0.0 if curr == 0 else 100.0 # or some other indicator for infinite growth
        return round(((curr - prev) / abs(prev)) * 100, 1)

    return PeriodComparison(
        income_delta=calc_delta(current.income, previous.income),
        income_delta_pct=calc_pct(current.income, previous.income),
        expense_delta=calc_delta(current.expense, previous.expense),
        expense_delta_pct=calc_pct(current.expense, previous.expense),
        saving_delta_pct=calc_pct(current.saving, previous.saving),
        investment_delta_pct=calc_pct(current.investment, previous.investment),
        profit_delta_pct=calc_pct(current.profit, previous.profit),
        cashflow_delta_pct=calc_pct(current.net_cash_flow, previous.net_cash_flow)
    )

def _get_expense_categories(df: pl.DataFrame) -> list[CategoryInsight]:
    """
    All expense categories by total amount, largest first.
    """
    if df.is_empty():
        return []

    expense_df = df.filter(pl.col('category_type') == 'expense')
    if expense_df.is_empty():
        return []

    total_expense = expense_df.select(pl.col('abs_amount').sum()).item() or 0.0
    if total_expense == 0:
        return []

    categories = (
        expense_df.group_by('category_name')
        .agg(pl.col('abs_amount').sum().alias('total'))
        .sort(['total', 'category_name'], descending=[True, False])
    )

    return [
        CategoryInsight(
            name=row['category_name'],
            total=round(row['total'], 2),
            share_of_total=round((row['total'] / total_expense) * 100, 1),
        )
        for row in categories.iter_rows(named=True)
    ]


def _get_top_expenses(df: pl.DataFrame) -> list[CategoryInsight]:
    """
    Get top 3 expense categories by total amount.
    """
    return _get_expense_categories(df)[:3]


# ================================================================================================
#                          Spending pace and six-month average (Overview)
# ================================================================================================

def _average_window_months(target_month: date) -> list[date]:
    """First days of the six calendar months before target_month, oldest first."""
    first = target_month.replace(day=1)
    return [first - relativedelta(months=n) for n in range(_AVERAGE_WINDOW_MONTHS, 0, -1)]


def _days_in_month(month_start: date) -> int:
    return calendar.monthrange(month_start.year, month_start.month)[1]


def _month_rows(df: pl.DataFrame, month_start: date) -> pl.DataFrame:
    """Rows of df dated inside the calendar month starting at month_start (ISO date strings)."""
    if df.is_empty():
        return df
    prefix = f'{month_start.year:04d}-{month_start.month:02d}'
    return df.filter(pl.col('date').str.slice(0, 7) == prefix)


def _months_with_history(months: list[date], first_data_date: date | None) -> list[date]:
    """
    Months that count towards the average: those that end on or after the user's first
    transaction. A month before the user started has no history and must not drag the
    average down; a month after they started with no transactions counts as zero.
    """
    if first_data_date is None:
        return []
    return [m for m in months if first_data_date <= m.replace(day=_days_in_month(m))]


def _elapsed_days(month_start: date, today: date) -> int:
    """How many days of the month are in the past or today (0 for a future month)."""
    length = _days_in_month(month_start)
    if today < month_start:
        return 0
    if today.year == month_start.year and today.month == month_start.month:
        return min(today.day, length)
    return length


def _cumulative_expense_by_day(df: pl.DataFrame, month_start: date, days: int | None = None) -> list[float]:
    """
    Cumulative expenses (same definition as the expense total: category type 'expense',
    absolute converted amount) for days 1..days of the month; days defaults to the whole month.
    """
    length = _days_in_month(month_start)
    n = length if days is None else max(0, min(days, length))
    daily = [0.0] * n
    month_df = _month_rows(df, month_start)
    if n and not month_df.is_empty():
        expenses = month_df.filter(pl.col('category_type') == 'expense')
        for iso_date, amount in expenses.select(['date', 'abs_amount']).iter_rows():
            day = int(str(iso_date)[8:10])
            if 1 <= day <= n:
                daily[day - 1] += float(amount)
    running = 0.0
    cumulative: list[float] = []
    for value in daily:
        running += value
        cumulative.append(round(running, 2))
    return cumulative


def _average_cumulative_expense(df: pl.DataFrame, months: list[date], target_days: int) -> list[float]:
    """
    Average cumulative expenses by day of month across `months`. A month shorter than the day
    index does not contribute to that day. Empty when there are no months.
    """
    if not months:
        return []
    per_month = [_cumulative_expense_by_day(df, m) for m in months]
    result: list[float] = []
    for day in range(1, target_days + 1):
        values = [series[day - 1] for series in per_month if len(series) >= day]
        result.append(round(sum(values) / len(values), 2) if values else 0.0)
    return result


def _calculate_six_month_average(df: pl.DataFrame, months: list[date]) -> SixMonthAverage | None:
    """
    Average of the monthly totals (computed exactly like the current-period totals) over months.
    """
    if not months:
        return None
    totals = [_calculate_summary_totals(_month_rows(df, m)) for m in months]
    count = len(totals)

    def avg(values: list[float]) -> float:
        return round(sum(values) / count, 2)

    return SixMonthAverage(
        months_counted=count,
        income=avg([t.income for t in totals]),
        expense=avg([t.expense for t in totals]),
        saving=avg([t.saving for t in totals]),
        investment=avg([t.investment for t in totals]),
        profit=avg([t.profit for t in totals]),
        net_cash_flow=avg([t.net_cash_flow for t in totals]),
    )


def _get_biggest_mover(current_df: pl.DataFrame, previous_df: pl.DataFrame) -> CategoryInsight | None:
    """
    Identify the category with the largest absolute change in spending (increase or decrease).
    """
    # Helper to aggregate expenses by category
    def agg_expenses(df):
        if df.is_empty(): 
            return pl.DataFrame(
                schema={'category_name': pl.Utf8, 'total': pl.Float64}
            )
        return (
            df.filter(pl.col('category_type') == 'expense')
            .group_by('category_name')
            .agg(pl.col('abs_amount').sum().alias('total'))
        )

    curr_agg = agg_expenses(current_df)
    prev_agg = agg_expenses(previous_df)
    
    if curr_agg.is_empty() and prev_agg.is_empty():
        return None
        
    # Join on category name. We need outer join to capture new categories or dropped ones.
    # Polars join only supports left, right, inner, outer, cross, anti, semi, asof
    
    # Simple approach: convert to dicts and compare in python or use join
    # Using join for robustness
    
    # Rename for join
    curr_agg = curr_agg.rename({'total': 'curr_total'})
    prev_agg = prev_agg.rename({'total': 'prev_total'})
    
    joined = curr_agg.join(prev_agg, on='category_name', how='full', coalesce=True)
    
    # Fill nulls
    joined = joined.with_columns([
        pl.col('curr_total').fill_null(0.0),
        pl.col('prev_total').fill_null(0.0)
    ])

    # Calculate delta
    joined = joined.with_columns(
        (pl.col('curr_total') - pl.col('prev_total')).alias('delta')
    )

    # Only consider categories with actual spending this month
    joined = joined.filter(pl.col('curr_total') > 0)

    if joined.is_empty():
        return None

    # Find max absolute delta
    # Sort by absolute delta desc
    biggest = joined.sort(pl.col('delta').abs(), descending=True).row(0, named=True)
    
    # Should we return the details of the 'current' period for this category?
    # The requirement says: "name + total + share of total expenses" (implied format for insights, though 'biggest mover' might just need name & delta)
    # The schema for CategoryInsight has name, total, share.
    # Let's interpret: Total = current total, Share = current share.
    
    current_total_expenses = current_df.filter(pl.col('category_type') == 'expense').select(pl.col('abs_amount').sum()).item() or 0.0
    
    share = 0.0
    if current_total_expenses > 0:
        share = (biggest['curr_total'] / current_total_expenses) * 100
        
    return CategoryInsight(
        name=biggest['category_name'],
        total=round(biggest['curr_total'], 2), # Showing current spending
        share_of_total=round(share, 1)
    )

def _get_largest_transactions(df: pl.DataFrame, limit: int = 5) -> list[TransactionData]:
    """
    Get list of largest transactions by amount.
    """
    if df.is_empty():
        return []
        
    # Filter out income? Typically largest transactions of interest are expenses.
    outgoing = df.filter(pl.col('category_type').is_in(['expense', 'investment']))
    
    if outgoing.is_empty():
        return []
        
    top_tx = outgoing.sort(pl.col('abs_amount'), descending=True).head(limit)
    
    results = []
    for row in top_tx.iter_rows(named=True):
        tx_data = TransactionData(
            id_pk=str(row.get('id_pk', '')) if row.get('id_pk') else None,
            user_id_fk=str(row.get('user_id_fk', '')) if row.get('user_id_fk') else None,
            account_id_fk=str(row.get('account_id_fk', '')),
            category_id_fk=int(row.get('category_id_fk', 0)),
            amount=Decimal(str(row.get('amount', 0))), # Original signed amount
            date=date.fromisoformat(row['date']) if row.get('date') else date.today(),
            notes=row.get('notes'),
            created_at=None, # Optional
            savings_fund_id_fk=row.get('savings_funds')
        )
        results.append(tx_data)
        
    return results


def _calculate_enriched_summary(
    current_df: pl.DataFrame,
    previous_df: pl.DataFrame,
    history_df: pl.DataFrame | None = None,
    target_month: date | None = None,
    first_data_date: date | None = None,
    today: date | None = None,
) -> SummaryData:
    """
    Internal calculation logic separated from IO.

    history_df holds the previous six calendar months plus the target month (already converted
    to the base currency). Without it (or without target_month) the pace and average fields stay empty.
    """
    current_totals = _calculate_summary_totals(current_df)
    previous_totals = _calculate_summary_totals(previous_df)
    
    comparison = _calculate_period_comparison(current_totals, previous_totals)
    
    # Rates
    savings_rate = 0.0
    if current_totals.income > 0:
        savings_rate = round((current_totals.saving / current_totals.income), 4)
        
    investment_rate = 0.0
    if current_totals.income > 0:
        investment_rate = round((current_totals.investment / current_totals.income), 4)
        
    top_expenses = _get_top_expenses(current_df)
    biggest_mover = _get_biggest_mover(current_df, previous_df)
    largest_transactions = _get_largest_transactions(current_df)

    daily_cumulative: list[float] = []
    average_cumulative: list[float] = []
    six_month_average: SixMonthAverage | None = None
    if history_df is not None and target_month is not None:
        month_start = target_month.replace(day=1)
        window = _months_with_history(_average_window_months(month_start), first_data_date)
        daily_cumulative = _cumulative_expense_by_day(
            history_df, month_start, _elapsed_days(month_start, today or date.today())
        )
        average_cumulative = _average_cumulative_expense(history_df, window, _days_in_month(month_start))
        six_month_average = _calculate_six_month_average(history_df, window)

    return SummaryData(
        total_income=current_totals.income,
        total_expense=current_totals.expense,
        total_saving=current_totals.saving,
        total_investment=current_totals.investment,
        profit=current_totals.profit,
        net_cash_flow=current_totals.net_cash_flow,
        comparison=comparison,
        savings_rate=savings_rate,
        investment_rate=investment_rate,
        top_expenses=top_expenses,
        biggest_mover=biggest_mover,
        largest_transactions=largest_transactions,
        expense_categories=_get_expense_categories(current_df),
        daily_cumulative_expense=daily_cumulative,
        average_daily_cumulative_expense=average_cumulative,
        six_month_average=six_month_average,
        # by_category removed
    )


# ================================================================================================
#                                   Main Summary Function
# ================================================================================================

def _summary_calc(
    access_token: str,
    start_date: date | None,
    end_date: date | None,
    base_currency: str = 'CZK',
) -> SummaryData:
    """
    Calculate financial summary for the specified date range.
    """
    # 1. Determine date ranges
    # If no dates provided, use current month
    today = date.today()
    if not start_date:
        start_date = today.replace(day=1)
    if not end_date:
        # End of current month
        next_month = start_date + relativedelta(months=1)
        end_date = next_month - timedelta(days=1)

    prev_start_date, prev_end_date = _get_previous_period_dates(start_date, end_date)

    # 2. Fetch the previous period, the current one and the six months before the target
    #    month in one query, then split in memory. The average window is anchored on the
    #    calendar month of start_date.
    window_start = _average_window_months(start_date)[0]
    fetch_start = min(prev_start_date, window_start)
    all_transactions = _fetch_summary_transactions(access_token, fetch_start, end_date)
    all_df = _prepare_transactions_dataframe(all_transactions)
    all_df = _apply_currency_conversion(all_df, base_currency)
    first_data_date = _fetch_first_transaction_date(access_token)

    # 3. Split into current and previous periods
    if all_df.is_empty():
        current_df = all_df
        previous_df = all_df
    else:
        start_date_str = start_date.isoformat()
        end_date_str = end_date.isoformat()
        current_df = all_df.filter((pl.col('date') >= start_date_str) & (pl.col('date') <= end_date_str))
        previous_df = all_df.filter(
            (pl.col('date') >= prev_start_date.isoformat()) & (pl.col('date') < start_date_str)
        )

    return _calculate_enriched_summary(
        current_df,
        previous_df,
        history_df=all_df,
        target_month=start_date,
        first_data_date=first_data_date,
        today=date.today(),
    )
