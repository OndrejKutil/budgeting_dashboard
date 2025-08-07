# imports
import calendar
from datetime import date, datetime
from collections import defaultdict
from helper.columns import TRANSACTIONS_COLUMNS
from helper.environment import PROJECT_URL, ANON_KEY
from supabase import create_client, Client
import logging
import pandas as pd


# Create logger for this module
logger = logging.getLogger(__name__)


# ================================================================================================
#                                   Yearly Analytics Calculation
# ================================================================================================

def _yearly_analytics(access_token: str, year: int) -> dict:

    # Fetch transactions for the specified year
    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        user_supabase_client.postgrest.auth(access_token)
        
        # Date range for the year
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        
        # Query transactions with category joins for the year
        query = user_supabase_client.table('transactions').select('*, categories(*)')
        query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
        query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
        query = query.order(TRANSACTIONS_COLUMNS.DATE.value, desc=False)
        
        response = query.execute()
        transactions = response.data
    except Exception as e:
        logger.error(f'Database query failed for get_yearly_analytics: {str(e)}')
        logger.info(f'Query parameters - year: {year}')
        raise ConnectionError('Failed to fetch transactions from database. Please check your connection or try again later.')


    # Convert transactions to DataFrame for efficient aggregation
    if not transactions:
        # Handle empty transactions case
        df = pd.DataFrame()
    else:
        # Flatten the nested structure
        flattened_transactions = []
        for transaction in transactions:
            category = transaction.get('categories', {})
            flattened_transaction = {
                'amount': float(transaction.get('amount', 0)),
                'date': transaction.get('date', ''),
                'category_type': category.get('type', '') if category else '',
                'category_name': category.get('name', 'Unknown Category') if category else 'Unknown Category',
                'spending_type': category.get('spending_type', '') if category else ''
            }
            flattened_transactions.append(flattened_transaction)
        
        df = pd.DataFrame(flattened_transactions)
    
    # Initialize monthly data structure
    monthly_data = {}
    for month in range(1, 13):
        month_name = calendar.month_abbr[month]
        monthly_data[month_name] = {
            'income': 0.0,
            'expense': 0.0,
            'saving': 0.0,
            'investment': 0.0,
            'core_expense': 0.0,
            'fun_expense': 0.0,
            'future_expense': 0.0
        }
    
    if not df.empty:
        # Add month column for grouping
        df['date_parsed'] = pd.to_datetime(df['date']).dt.date
        df['month_name'] = df['date_parsed'].apply(lambda x: calendar.month_abbr[x.month])
        
        # Create absolute amount column for expenses/savings/investments
        df['abs_amount'] = df['amount'].abs()
        
        # Group by month and category type for monthly aggregations
        monthly_groups = df.groupby(['month_name', 'category_type'])['amount'].sum().reset_index()
        monthly_groups_abs = df.groupby(['month_name', 'category_type'])['abs_amount'].sum().reset_index()
        
        # Fill monthly data for income (use original amount)
        income_monthly = monthly_groups[monthly_groups['category_type'] == 'income']
        for _, row in income_monthly.iterrows():
            monthly_data[row['month_name']]['income'] = row['amount']
        
        # Fill monthly data for expenses (use absolute amount)
        expense_monthly = monthly_groups_abs[monthly_groups_abs['category_type'] == 'expense']
        for _, row in expense_monthly.iterrows():
            monthly_data[row['month_name']]['expense'] = row['abs_amount']
        
        # Fill monthly data for saving and investment (use absolute amount)
        saving_monthly = monthly_groups_abs[monthly_groups_abs['category_type'] == 'saving']
        for _, row in saving_monthly.iterrows():
            monthly_data[row['month_name']]['saving'] = row['abs_amount']
        
        investment_monthly = monthly_groups_abs[monthly_groups_abs['category_type'] == 'investment']
        for _, row in investment_monthly.iterrows():
            monthly_data[row['month_name']]['investment'] = row['abs_amount']
        
        # Handle core and fun expenses
        expense_df = df[df['category_type'] == 'expense']
        if not expense_df.empty:
            core_expense_monthly = expense_df[expense_df['spending_type'] == 'Core'].groupby('month_name')['abs_amount'].sum()
            for month, amount in core_expense_monthly.items():
                monthly_data[month]['core_expense'] = amount
            
            fun_expense_monthly = expense_df[expense_df['spending_type'] == 'Fun'].groupby('month_name')['abs_amount'].sum()
            for month, amount in fun_expense_monthly.items():
                monthly_data[month]['fun_expense'] = amount
        
        # Handle future expenses (from saving and investment with Future spending_type)
        future_df = df[(df['category_type'].isin(['saving', 'investment'])) & (df['spending_type'] == 'Future')]
        if not future_df.empty:
            future_expense_monthly = future_df.groupby('month_name')['abs_amount'].sum()
            for month, amount in future_expense_monthly.items():
                monthly_data[month]['future_expense'] = amount
        
        # Calculate totals using pandas aggregation
        total_income = df[df['category_type'] == 'income']['amount'].sum()
        total_expense = df[df['category_type'] == 'expense']['abs_amount'].sum()
        total_saving = df[df['category_type'] == 'saving']['abs_amount'].sum()
        total_investment = df[df['category_type'] == 'investment']['abs_amount'].sum()
        total_core_expense = df[(df['category_type'] == 'expense') & (df['spending_type'] == 'Core')]['abs_amount'].sum()
        total_fun_expense = df[(df['category_type'] == 'expense') & (df['spending_type'] == 'Fun')]['abs_amount'].sum()
        total_future_expense = df[(df['category_type'].isin(['saving', 'investment'])) & (df['spending_type'] == 'Future')]['abs_amount'].sum()
        
        # Category breakdowns using pandas
        by_category = df.groupby('category_name')['amount'].sum().to_dict()
        core_categories = df[(df['category_type'] == 'expense') & (df['spending_type'] == 'Core')].groupby('category_name')['abs_amount'].sum().to_dict()
        income_by_category = df[df['category_type'] == 'income'].groupby('category_name')['amount'].sum().to_dict()
        expense_by_category = df[df['category_type'] == 'expense'].groupby('category_name')['abs_amount'].sum().to_dict()
        
    else:
        # Handle empty DataFrame case
        total_income = 0.0
        total_expense = 0.0
        total_saving = 0.0
        total_investment = 0.0
        total_core_expense = 0.0
        total_fun_expense = 0.0
        total_future_expense = 0.0
        by_category = {}
        core_categories = {}
        income_by_category = {}
        expense_by_category = {}


    # Calculate derived metrics
    profit = total_income - total_expense - total_investment
    net_cash_flow = total_income - total_expense - total_saving - total_investment
    savings_rate = (total_saving / total_income * 100) if total_income > 0 else 0
    investment_rate = (total_investment / total_income * 100) if total_income > 0 else 0

 
    # Prepare monthly arrays for charts
    months = list(monthly_data.keys())
    monthly_income = [round(monthly_data[month]['income'], 2) for month in months]
    monthly_expense = [round(monthly_data[month]['expense'], 2) for month in months]
    monthly_saving = [round(monthly_data[month]['saving'], 2) for month in months]
    monthly_investment = [round(monthly_data[month]['investment'], 2) for month in months]
    monthly_core_expense = [round(monthly_data[month]['core_expense'], 2) for month in months]
    monthly_fun_expense = [round(monthly_data[month]['fun_expense'], 2) for month in months]
    monthly_future_expense = [round(monthly_data[month]['future_expense'], 2) for month in months]
    monthly_savings_rate = [round((monthly_data[month]['saving'] / monthly_data[month]['income'] * 100) if monthly_data[month]['income'] > 0 else 0, 2) for month in months]
    monthly_investment_rate = [round((monthly_data[month]['investment'] / monthly_data[month]['income'] * 100) if monthly_data[month]['income'] > 0 else 0, 2) for month in months]


    # Round all values to 2 decimal places
    total_income = round(total_income, 2)
    total_expense = round(total_expense, 2)
    total_saving = round(total_saving, 2)
    total_investment = round(total_investment, 2)
    total_core_expense = round(total_core_expense, 2)
    total_fun_expense = round(total_fun_expense, 2)
    profit = round(profit, 2)
    net_cash_flow = round(net_cash_flow, 2)
    savings_rate = round(savings_rate, 2)
    investment_rate = round(investment_rate, 2)

    # Round category values
    by_category = {k: round(v, 2) for k, v in by_category.items()}
    core_categories = {k: round(v, 2) for k, v in core_categories.items()}
    # NEW: Round the new breakdown values
    income_by_category = {k: round(v, 2) for k, v in income_by_category.items()}
    expense_by_category = {k: round(v, 2) for k, v in expense_by_category.items()}


    analytics_data = {
        'year': year,
        'total_income': total_income,
        'total_expense': total_expense,
        'total_saving': total_saving,
        'total_investment': total_investment,
        'total_core_expense': total_core_expense,
        'total_fun_expense': total_fun_expense,
        'total_future_expense': total_future_expense,
        'profit': profit,
        'net_cash_flow': net_cash_flow,
        'savings_rate': savings_rate,
        'investment_rate': investment_rate,
        'months': months,
        'monthly_income': monthly_income,
        'monthly_expense': monthly_expense,
        'monthly_saving': monthly_saving,
        'monthly_investment': monthly_investment,
        'monthly_core_expense': monthly_core_expense,
        'monthly_fun_expense': monthly_fun_expense,
        'monthly_future_expense': monthly_future_expense,
        'monthly_savings_rate': monthly_savings_rate,
        'monthly_investment_rate': monthly_investment_rate,
        'by_category': dict(by_category),
        'core_categories': dict(core_categories),
        'income_by_category': dict(income_by_category),
        'expense_by_category': dict(expense_by_category)
    }

    return analytics_data



def _emergency_fund_analysis(access_token: str, year: int) -> dict:

    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        user_supabase_client.postgrest.auth(access_token)
        
        # Date range for the year
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        
        # Query transactions with category joins for core expenses only
        query = user_supabase_client.table('transactions').select('*, categories(*)')
        query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
        query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
        query = query.order(TRANSACTIONS_COLUMNS.DATE.value, desc=False)
        
        response = query.execute()
        transactions = response.data

    except Exception as e:
        logger.error(f'Database query failed for get_emergency_fund_analysis: {str(e)}')
        logger.info(f'Query parameters - year: {year}')
        raise ConnectionError('Failed to fetch transactions from database. Please check your connection or try again later.')
    

    # Convert transactions to DataFrame for efficient aggregation
    if not transactions:
        df = pd.DataFrame()
    else:
        # Flatten the nested structure
        flattened_transactions = []
        for transaction in transactions:
            category = transaction.get('categories', {})
            transaction_date = datetime.fromisoformat(transaction.get(TRANSACTIONS_COLUMNS.DATE.value, '')).date()
            flattened_transaction = {
                'amount': float(transaction.get(TRANSACTIONS_COLUMNS.AMOUNT.value, 0)),
                'date': transaction_date,
                'month_key': f'{transaction_date.year}-{transaction_date.month:02d}',
                'category_type': category.get('type', '') if category else '',
                'category_name': category.get('name', 'Unknown Category') if category else 'Unknown Category',
                'spending_type': category.get('spending_type', '') if category else ''
            }
            flattened_transactions.append(flattened_transaction)
        
        df = pd.DataFrame(flattened_transactions)
    
    # Calculate monthly core expenses using pandas
    if not df.empty:
        # Filter for core expenses only
        core_expenses_df = df[(df['category_type'] == 'expense') & (df['spending_type'] == 'Core')]
        
        if not core_expenses_df.empty:
            # Calculate absolute amounts
            core_expenses_df = core_expenses_df.copy()
            core_expenses_df['abs_amount'] = core_expenses_df['amount'].abs()
            
            # Group by month
            monthly_core_expenses = core_expenses_df.groupby('month_key')['abs_amount'].sum().to_dict()
            
            # Group by category
            core_category_breakdown = core_expenses_df.groupby('category_name')['abs_amount'].sum().to_dict()
        else:
            monthly_core_expenses = {}
            core_category_breakdown = {}
    else:
        monthly_core_expenses = {}
        core_category_breakdown = {}
    
    # Calculate average monthly core expenses
    if monthly_core_expenses:
        total_core_expenses = sum(monthly_core_expenses.values())
        months_with_data = len(monthly_core_expenses)
        average_monthly_core = total_core_expenses / months_with_data if months_with_data > 0 else 0
    else:
        average_monthly_core = 0
        total_core_expenses = 0
    
    # Calculate emergency fund requirements
    three_month_fund = average_monthly_core * 3
    six_month_fund = average_monthly_core * 6
    
    
    
    # Round all values
    average_monthly_core = round(average_monthly_core, 2)
    three_month_fund = round(three_month_fund, 2)
    six_month_fund = round(six_month_fund, 2)
    total_core_expenses = round(total_core_expenses, 2)
    
    # Round category breakdown
    core_category_breakdown = {k: round(v, 2) for k, v in core_category_breakdown.items()}
    
    emergency_fund_data = {
        'year': year,
        'average_monthly_core_expenses': average_monthly_core,
        'total_core_expenses': total_core_expenses,
        'three_month_fund_target': three_month_fund,
        'six_month_fund_target': six_month_fund,
        'core_category_breakdown': core_category_breakdown,
        'months_analyzed': len(monthly_core_expenses)
    }
    
    return emergency_fund_data