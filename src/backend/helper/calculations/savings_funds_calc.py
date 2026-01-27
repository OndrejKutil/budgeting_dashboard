
import polars as pl
from datetime import date, timedelta
from typing import Dict, TypedDict
from ..columns import TRANSACTIONS_COLUMNS

class FundMetrics(TypedDict):
    current_amount: float
    net_flow_30d: float

def calculate_fund_metrics(transactions_df: pl.DataFrame) -> Dict[str, FundMetrics]:
    """
    Calculate current amount and 30-day net flow for each savings fund.
    
    Args:
        transactions_df: Polars DataFrame containing transaction data.
                         Expected columns: 'savings_fund_id_fk', 'amount', 'date'
    
    Returns:
        Dictionary mapping savings_fund_id to FundMetrics (current_amount, net_flow_30d)
    """
    if transactions_df.is_empty():
        return {}
        
    # Filter for transactions that actually have a savings fund ID
    funds_df = transactions_df.filter(pl.col(TRANSACTIONS_COLUMNS.SAVINGS_FUND_ID.value).is_not_null())
    
    if funds_df.is_empty():
        return {}

    # Ensure date column is Date type
    if TRANSACTIONS_COLUMNS.DATE.value in funds_df.columns and funds_df[TRANSACTIONS_COLUMNS.DATE.value].dtype == pl.Utf8:
         funds_df = funds_df.with_columns(pl.col(TRANSACTIONS_COLUMNS.DATE.value).str.to_date())

    # 1. Calculate Current Amount (Total Sum per Fund)
    balance_df = (
        funds_df
        .group_by(TRANSACTIONS_COLUMNS.SAVINGS_FUND_ID.value)
        .agg((pl.col(TRANSACTIONS_COLUMNS.AMOUNT.value).sum() * -1).alias("current_amount"))
    )

    # 2. Calculate 30-Day Net Flow
    cutoff_date = date.today() - timedelta(days=30)
    
    flow_df = (
        funds_df
        .filter(pl.col(TRANSACTIONS_COLUMNS.DATE.value) >= cutoff_date)
        .group_by(TRANSACTIONS_COLUMNS.SAVINGS_FUND_ID.value)
        .agg((pl.col(TRANSACTIONS_COLUMNS.AMOUNT.value).sum() * -1).alias("net_flow_30d"))
    )

    # 3. Join and format results
    result_df = (
        balance_df
        .join(flow_df, on=TRANSACTIONS_COLUMNS.SAVINGS_FUND_ID.value, how="left")
        .fill_null(0.0)
    )

    metrics: Dict[str, FundMetrics] = {}
    
    for row in result_df.iter_rows(named=True):
        fund_id = row[TRANSACTIONS_COLUMNS.SAVINGS_FUND_ID.value]
        if fund_id:
            metrics[fund_id] = {
                "current_amount": round(row['current_amount'], 2),
                "net_flow_30d": round(row['net_flow_30d'], 2)
            }
            
    return metrics
