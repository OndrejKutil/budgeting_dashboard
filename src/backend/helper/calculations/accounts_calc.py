
import polars as pl
from datetime import date, timedelta
from typing import Dict, TypedDict
from ..columns import TRANSACTIONS_COLUMNS

class AccountMetrics(TypedDict):
    current_balance: float
    net_flow_30d: float
    history_30d: list[dict]

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

    # 2. Calculate 30-Day Net Flow and Daily Balances
    cutoff_date = date.today() - timedelta(days=30)
    
    # Filter transactions for the last 30 days
    recent_transactions = transactions_df.filter(pl.col(TRANSACTIONS_COLUMNS.DATE.value) >= cutoff_date)

    # Calculate net flow for the last 30 days
    flow_df = (
        recent_transactions
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
    
    # Pre-calculate history for all accounts
    # This loop might differ based on performance needs, but per-account filtering is clear.
    for row in result_df.iter_rows(named=True):
        account_id = row[TRANSACTIONS_COLUMNS.ACCOUNT_ID.value]
        if account_id: # Ensure valid account ID
            current_balance = row['current_balance']
            
            # Calculate daily history
            # Start from current balance and work backwards
            history = []
            running_balance = current_balance
            
            # Sort transactions for this account by date descending
            acc_txs = recent_transactions.filter(
                pl.col(TRANSACTIONS_COLUMNS.ACCOUNT_ID.value) == account_id
            ).sort(TRANSACTIONS_COLUMNS.DATE.value, descending=True)
            
            # Create a map of date -> daily change
            daily_changes = {}
            if not acc_txs.is_empty():
                daily_changes_df = (
                    acc_txs.group_by(TRANSACTIONS_COLUMNS.DATE.value)
                    .agg(pl.col(TRANSACTIONS_COLUMNS.AMOUNT.value).sum())
                )
                for tx_row in daily_changes_df.iter_rows(named=True):
                    daily_changes[tx_row[TRANSACTIONS_COLUMNS.DATE.value]] = tx_row[TRANSACTIONS_COLUMNS.AMOUNT.value]

            # Generate last 30 days
            today = date.today()
            # We want history from T-30 to T-0 (today)
            # Working backwards from today is easier for subtracting changes
            
            daily_balances = []
            temp_balance = running_balance
            
            # Pass 1: Work backwards to find balances
            # Today's balance is current_balance.
            # Yesterday's balance = Today's balance - Today's transactions
            
            for i in range(30):
                d = today - timedelta(days=i)
                change = daily_changes.get(d, 0.0)
                
                daily_balances.append({
                    "date": d.isoformat(),
                    "balance": round(temp_balance, 2)
                })
                
                temp_balance -= change
            
            # Restore chronological order
            daily_balances.reverse()

            metrics[account_id] = {
                "current_balance": round(current_balance, 2),
                "net_flow_30d": round(row['net_flow_30d'], 2),
                "history_30d": daily_balances
            }
            
    return metrics
