# imports
import calendar
import logging
from datetime import date
from ..columns import TRANSACTIONS_COLUMNS
from ..environment import PROJECT_URL, ANON_KEY
from supabase.client import create_client, Client
import pandas as pd


# Create logger for this module
logger = logging.getLogger(__name__)


# ================================================================================================
#                                   Monthly Analytics Calculation
# ================================================================================================

def _monthly_analytics(access_token: str, year: int, month: int) -> dict:
    """
    Calculate comprehensive monthly analytics for a specific month and year.
    
    Important: Expenses, savings, and investments are stored as negative numbers in the database.
    We use absolute values for display purposes and simple addition for calculations since 
    the negative signs are already embedded in the stored amounts.
    
    Args:
        access_token: User's access token for database authentication
        year: Year for the analysis
        month: Month for the analysis (1-12)
    
    Returns:
        Dictionary containing monthly analytics data
    """
    if PROJECT_URL is None or ANON_KEY is None:
        logger.error('Environment variables PROJECT_URL or ANON_KEY are not set.')
        raise EnvironmentError('Missing environment variables for database connection.')

    # Fetch transactions for the specified month
    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        user_supabase_client.postgrest.auth(access_token)
        
        # Date range for the month
        start_date = date(year, month, 1)
        # Get last day of month using calendar.monthrange
        last_day = calendar.monthrange(year, month)[1]
        end_date = date(year, month, last_day)
        
        # Query transactions with category joins for the month
        # Use explicit column selection to avoid conflicts
        query = user_supabase_client.table('fct_transactions').select(
            '*',
            'dim_categories(*)'

        )
        query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
        query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
        query = query.order(TRANSACTIONS_COLUMNS.DATE.value, desc=False)
        
        response = query.execute()
        transactions = response.data

    except Exception as e:
        logger.error(f'Database query failed for get_monthly_analytics: {str(e)}')
        logger.info(f'Query parameters - year: {year}, month: {month}')
        raise ConnectionError('Failed to fetch transactions from database. Please check your connection or try again later.')

    # Convert transactions to DataFrame for efficient aggregation
    if not transactions:
        # Handle empty transactions case
        df = pd.DataFrame()
    else:
        # Flatten the nested structure using pandas json_normalize without meta
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
        # Add date parsing for daily analysis
        df['date_parsed'] = pd.to_datetime(df['date']).dt.date
        
        # Create absolute amount column for expenses/savings/investments (they are stored as negative)
        df['abs_amount'] = df['amount'].abs()
        
        # Calculate totals using pandas aggregation
        # Income: use original amount (positive)
        total_income = df[df['category_type'] == 'income']['amount'].sum()
        total_income_wo_savings_funds = total_income - df[(df['category_type'] == 'income') & (df['savings_funds'].notnull())]['amount'].sum()

        # Expenses, savings, investments: use absolute amounts for display
        # Note: These are stored as negative numbers, so we use abs() for totals
        total_expenses = df[df['category_type'] == 'expense']['abs_amount'].sum()
        total_savings = df[df['category_type'] == 'saving']['abs_amount'].sum()
        total_savings_w_withdrawals = total_savings - df[(df['category_type'] == 'income') & (df['savings_funds'].notnull())]['amount'].sum()
        total_investments = df[df['category_type'] == 'investment']['abs_amount'].sum()
        
        # Calculate profit and cashflow
        # Since expenses/savings/investments are stored as negative, we use simple addition
        # Profit = income + expenses + investments (expenses and investments are negative)
        profit = total_income_wo_savings_funds - total_expenses - total_investments
        
        # Cashflow = income + expenses + investments + savings (all stored amounts with their signs)
        cashflow = total_income - total_expenses - total_investments - total_savings

        # Daily spending heatmap - sum absolute amounts by day
        daily_spending = df[df['category_type'] == 'expense'].groupby('date_parsed')['abs_amount'].sum().reset_index()
        daily_spending_heatmap = [
            {
                'day': row['date_parsed'].isoformat(),
                'amount': round(row['abs_amount'], 2)
            }
            for _, row in daily_spending.iterrows()
        ]
        
        # Category breakdown - exclude income, use absolute amounts for expenses/savings/investments
        category_breakdown = []
        for category_type in ['expense']:
            category_data = df[df['category_type'] == category_type]
            if not category_data.empty:
                # Expenses, savings, investments: use absolute amounts
                category_totals = category_data.groupby('category_name')['abs_amount'].sum()
                
                for category_name, total in category_totals.items():
                    category_breakdown.append({
                        'category': category_name,
                        'total': round(total, 2)
                    })
        
        # Spending type breakdown
        spending_type_breakdown = []
        
        # Core spending (expenses only)
        core_expenses = df[(df['category_type'] == 'expense') & (df['spending_type'] == 'Core')]['abs_amount'].sum()
        if core_expenses > 0:
            spending_type_breakdown.append({
                'type': 'Core',
                'amount': round(core_expenses, 2)
            })

        # Necessary spending (expenses only)
        necessary_expenses = df[(df['category_type'] == 'expense') & (df['spending_type'] == 'Necessary')]['abs_amount'].sum()
        if necessary_expenses > 0:
            spending_type_breakdown.append({
                'type': 'Necessary',
                'amount': round(necessary_expenses, 2)
            })
        
        # Fun spending (expenses only)
        fun_expenses = df[(df['category_type'] == 'expense') & (df['spending_type'] == 'Fun')]['abs_amount'].sum()
        if fun_expenses > 0:
            spending_type_breakdown.append({
                'type': 'Fun',
                'amount': round(fun_expenses, 2)
            })
        
        # Future spending (savings and investments with Future spending_type)
        future_amount = df[df['spending_type'] == 'Future']['abs_amount'].sum()
        if future_amount > 0:
            spending_type_breakdown.append({
                'type': 'Future',
                'amount': round(future_amount, 2)
            })
        
    else:
        # Handle empty DataFrame case
        total_income = 0.0
        total_income_wo_savings_funds = 0.0
        total_expenses = 0.0
        total_savings = 0.0
        total_savings_w_withdrawals = 0.0
        total_investments = 0.0
        profit = 0.0
        cashflow = 0.0
        daily_spending_heatmap = []
        category_breakdown = []
        spending_type_breakdown = []

    # Round all values to 2 decimal places
    total_income_wo_savings_funds = round(total_income_wo_savings_funds, 2)
    total_expenses = round(total_expenses, 2)
    total_savings_w_withdrawals = round(total_savings_w_withdrawals, 2)
    total_investments = round(total_investments, 2)
    profit = round(profit, 2)
    cashflow = round(cashflow, 2)

    analytics_data = {
        'year': year,
        'month': month,
        'month_name': calendar.month_name[month],
        'income': total_income_wo_savings_funds,
        'expenses': total_expenses,
        'savings': total_savings_w_withdrawals,
        'investments': total_investments,
        'profit': profit,
        'cashflow': cashflow,
        'daily_spending_heatmap': daily_spending_heatmap,
        'category_breakdown': category_breakdown,
        'spending_type_breakdown': spending_type_breakdown
    }

    return analytics_data
