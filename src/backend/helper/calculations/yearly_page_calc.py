# imports
import calendar
from datetime import date, datetime
from collections import defaultdict
from helper.columns import TRANSACTIONS_COLUMNS
from helper.environment import PROJECT_URL, ANON_KEY
from supabase import create_client, Client
import logging


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
    
    # Initialize totals and category breakdowns
    total_income = 0.0
    total_expense = 0.0
    total_saving = 0.0
    total_investment = 0.0
    total_core_expense = 0.0
    total_fun_expense = 0.0
    total_future_expense = 0.0
    
    # Category breakdowns
    by_category = defaultdict(float)
    core_categories = defaultdict(float)
    # NEW: Separate income and expense category breakdowns
    income_by_category = defaultdict(float)
    expense_by_category = defaultdict(float)

    # Process each transaction
    for transaction in transactions:

        amount = float(transaction.get('amount', 0))
        transaction_date = datetime.fromisoformat(transaction.get('date', '')).date()
        month_name = calendar.month_abbr[transaction_date.month]
        
        category = transaction.get('categories', {})
        category_type = category.get('type', '') if category else ''
        category_name = category.get('name', 'Unknown Category') if category else 'Unknown Category'
        spending_type = category.get('spending_type', '') if category else ''
        
        # Update monthly data and totals based on category type
        if category_type == 'income':
            monthly_data[month_name]['income'] += amount
            total_income += amount
            # NEW: Add to income breakdown
            income_by_category[category_name] += amount
            
        elif category_type == 'expense':
            monthly_data[month_name]['expense'] += abs(amount)  # Store as positive for display
            total_expense += abs(amount)
            # NEW: Add to expense breakdown (as positive values)
            expense_by_category[category_name] += abs(amount)
            
            # Check if it's a core expense
            if spending_type == 'Core':
                monthly_data[month_name]['core_expense'] += abs(amount)
                total_core_expense += abs(amount)
                core_categories[category_name] += abs(amount)
            elif spending_type == 'Fun':
                monthly_data[month_name]['fun_expense'] += abs(amount)
                total_fun_expense += abs(amount)
                
                
        elif category_type == 'saving':
            monthly_data[month_name]['saving'] += abs(amount)
            total_saving += abs(amount)

            if spending_type == 'Future':
                monthly_data[month_name]['future_expense'] += abs(amount)
                total_future_expense += abs(amount)

        elif category_type == 'investment':
            monthly_data[month_name]['investment'] += abs(amount)
            total_investment += abs(amount)

            if spending_type == 'Future':
                monthly_data[month_name]['future_expense'] += abs(amount)
                total_future_expense += abs(amount)

        
        # Group by category name (keep original sign for category breakdown)
        by_category[category_name] += amount


    # Calculate derived metrics
    profit = total_income - total_expense
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
    

    # Calculate monthly core expenses
    monthly_core_expenses = defaultdict(float)
    core_category_breakdown = defaultdict(float)
    
    for transaction in transactions:
        amount = float(transaction.get(TRANSACTIONS_COLUMNS.AMOUNT.value, 0))
        transaction_date = datetime.fromisoformat(transaction.get(TRANSACTIONS_COLUMNS.DATE.value, '')).date()
        month_key = f'{transaction_date.year}-{transaction_date.month:02d}'
        
        category = transaction.get('categories', {})
        category_type = category.get('type', '') if category else ''
        spending_type = category.get('spending_type', '') if category else ''
        category_name = category.get('name', 'Unknown Category') if category else 'Unknown Category'
        
        # Only consider core expenses
        if category_type == 'expense' and spending_type == 'Core':
            monthly_core_expenses[month_key] += abs(amount)
            core_category_breakdown[category_name] += abs(amount)
    
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
        'core_category_breakdown': dict(core_category_breakdown),
        'months_analyzed': len(monthly_core_expenses)
    }
    
    return emergency_fund_data