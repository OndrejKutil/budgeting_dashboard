# imports
import calendar
import logging
from datetime import date, datetime
from collections import defaultdict
from ..columns import TRANSACTIONS_COLUMNS
from ..environment import PROJECT_URL, ANON_KEY
from supabase import create_client, Client
import pandas as pd


# Create logger for this module
logger = logging.getLogger(__name__)



def _summary_calc(access_token: str, start_date: date, end_date: date) -> dict:
    """_summary_

    Args:
        access_token (str): User's access token for authentication
        start_date (date): Start date for the summary calculation
        end_date (date): End date for the summary calculation

    Returns:
        dict: Summary of financial data including totals by category
    """
    
    user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)

    user_supabase_client.postgrest.auth(access_token)

    # Query transactions with category and account joins
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
    transactions = response.data
    
    # Convert transactions to DataFrame for efficient aggregation
    if not transactions:
        # Handle empty transactions case
        df = pd.DataFrame()
    else:
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

    if not df.empty:
        # Create absolute amount column for expenses/savings/investments (they are stored as negative)
        df['abs_amount'] = df['amount'].abs()
        
        # Calculate totals using pandas aggregation - matching monthly_page_calc logic
        # Income: use original amount (positive)
        total_income = df[df['category_type'] == 'income']['amount'].sum()
        total_income_wo_savings_funds = total_income - df[(df['category_type'] == 'income') & (df['savings_funds'].notnull())]['amount'].sum()

        # Expenses, savings, investments: use absolute amounts for display
        # Note: These are stored as negative numbers, so we use abs() for totals
        total_expense = df[df['category_type'] == 'expense']['abs_amount'].sum()
        total_saving = df[df['category_type'] == 'saving']['abs_amount'].sum()
        total_saving_w_withdrawals = total_saving - df[(df['category_type'] == 'income') & (df['savings_funds'].notnull())]['amount'].sum()
        total_investment = df[df['category_type'] == 'investment']['abs_amount'].sum()
        
        # Calculate profit and cashflow - matching monthly_page_calc logic
        # Since expenses/savings/investments are stored as negative, we use simple addition
        # Profit = income - expenses - investments (using absolute amounts for expenses/investments)
        profit = total_income_wo_savings_funds - total_expense - total_investment
        
        # Net cash flow = income - expenses - investments - savings (using absolute amounts)
        net_cash_flow = total_income - total_expense - total_investment - total_saving
        
        # Group by category name using pandas aggregation
        category_totals = df.groupby(['category_name', 'category_type'])['amount'].sum().reset_index()
        
        # Separate categories by type for custom sorting
        expense_categories = category_totals[category_totals['category_type'] == 'expense'].copy()
        income_categories = category_totals[category_totals['category_type'] == 'income'].copy()
        saving_categories = category_totals[category_totals['category_type'] == 'saving'].copy()
        investment_categories = category_totals[category_totals['category_type'] == 'investment'].copy()
        
        # Sort each type descending by amount (using absolute value for proper sorting)
        expense_categories = expense_categories.reindex(expense_categories['amount'].abs().sort_values(ascending=False).index)
        income_categories = income_categories.reindex(income_categories['amount'].abs().sort_values(ascending=False).index)
        saving_categories = saving_categories.reindex(saving_categories['amount'].abs().sort_values(ascending=False).index)
        investment_categories = investment_categories.reindex(investment_categories['amount'].abs().sort_values(ascending=False).index)
        
        # Combine in desired order: income, expenses, then savings and investments at the end
        sorted_categories = pd.concat([
            income_categories,
            expense_categories,
            saving_categories,
            investment_categories
        ], ignore_index=True)
        
        # Convert to dictionary
        by_category = dict(zip(sorted_categories['category_name'], sorted_categories['amount']))
        
    else:
        # Handle empty DataFrame case
        total_income = 0.0
        total_income_wo_savings_funds = 0.0
        total_expense = 0.0
        total_saving = 0.0
        total_saving_w_withdrawals = 0.0
        total_investment = 0.0
        profit = 0.0
        net_cash_flow = 0.0
        by_category = {}
    
    # Round all values to 2 decimal places
    total_income_wo_savings_funds = round(total_income_wo_savings_funds, 2)
    total_expense = round(total_expense, 2)
    total_saving_w_withdrawals = round(total_saving_w_withdrawals, 2)
    total_investment = round(total_investment, 2)
    profit = round(profit, 2)
    net_cash_flow = round(net_cash_flow, 2)
    
    # Round grouped values
    by_category = {k: round(v, 2) for k, v in by_category.items()}
    
    summary_data = {
        "total_income": total_income_wo_savings_funds,
        "total_expense": total_expense,
        "total_saving": total_saving_w_withdrawals,
        "total_investment": total_investment,
        "profit": profit,
        "net_cash_flow": net_cash_flow,
        "by_category": by_category,
    }
    
    return summary_data