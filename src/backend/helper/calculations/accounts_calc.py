
import polars as pl
from datetime import date, timedelta
from typing import Dict, TypedDict
from ..columns import TRANSACTIONS_COLUMNS

class AccountMetrics(TypedDict):
    current_balance: float
    net_flow_30d: float

def calculate_account_metrics(transactions_df: pl.DataFrame) -> Dict[str, AccountMetrics]:
    """
    Calculate current balance and 30-day net flow for each account.
    
    Args:
        transactions_df: Polars DataFrame containing transaction data.
                         Expected columns: 'account_id_fk', 'amount', 'date'
    
    Returns:
        Dictionary mapping account_id to AccountMetrics (current_balance, net_flow_30d)
    """
    if transactions_df.is_empty():
        return {}

    # Ensure date column is Date type
    if TRANSACTIONS_COLUMNS.DATE.value in transactions_df.columns and transactions_df[TRANSACTIONS_COLUMNS.DATE.value].dtype == pl.Utf8:
         transactions_df = transactions_df.with_columns(pl.col(TRANSACTIONS_COLUMNS.DATE.value).str.to_date())

    # 1. Calculate Current Balance (Total Sum per Account)
    balance_df = (
        transactions_df
        .group_by(TRANSACTIONS_COLUMNS.ACCOUNT_ID.value)
        .agg(pl.col(TRANSACTIONS_COLUMNS.AMOUNT.value).sum().alias("current_balance"))
    )

    # 2. Calculate 30-Day Net Flow
    cutoff_date = date.today() - timedelta(days=30)
    
    flow_df = (
        transactions_df
        .filter(pl.col(TRANSACTIONS_COLUMNS.DATE.value) >= cutoff_date)
        .group_by(TRANSACTIONS_COLUMNS.ACCOUNT_ID.value)
        .agg(pl.col(TRANSACTIONS_COLUMNS.AMOUNT.value).sum().alias("net_flow_30d"))
    )

    # 3. Join and format results
    # We want all accounts that have transactions. 
    # Accounts with no transactions in last 30 days should have 0 flow.
    result_df = (
        balance_df
        .join(flow_df, on=TRANSACTIONS_COLUMNS.ACCOUNT_ID.value, how="left")
        .fill_null(0.0)
    )

    metrics: Dict[str, AccountMetrics] = {}
    
    for row in result_df.iter_rows(named=True):
        account_id = row[TRANSACTIONS_COLUMNS.ACCOUNT_ID.value]
        if account_id: # Ensure valid account ID
            metrics[account_id] = {
                "current_balance": round(row['current_balance'], 2),
                "net_flow_30d": round(row['net_flow_30d'], 2)
            }
            
    return metrics
