# fastapi
import fastapi
from fastapi import APIRouter, Depends, Query, status

# auth dependencies
from auth.auth import api_key_auth, get_current_user

# Load environment variables
import helper.environment as env

# logging
import logging

# supabase client
from supabase import create_client, Client

# helper
from helper.columns import TRANSACTIONS_COLUMNS, CATEGORIES_COLUMNS
from schemas.yearly_schemas import YearlyAnalyticsResponse, MonthlyBreakdownResponse, EmergencyFundResponse

# other
from datetime import date, datetime
from typing import Optional
from collections import defaultdict
import calendar

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# Load environment variables
PROJECT_URL: str = env.PROJECT_URL
ANON_KEY: str = env.ANON_KEY

# Create logger for this module
logger = logging.getLogger(__name__)

# ================================================================================================
#                                   Router Configuration
# ================================================================================================

router = APIRouter()

#? prefix - /yearly

@router.get("/analytics", response_model=YearlyAnalyticsResponse)
async def get_yearly_analytics(
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    year: int = Query(datetime.now().year, description="Year for analytics")
) -> YearlyAnalyticsResponse:
    """
    Get comprehensive yearly analytics including totals, monthly breakdown, and trends.
    """
    
    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        user_supabase_client.postgrest.auth(user["access_token"])
        
        # Date range for the year
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        
        # Query transactions with category joins for the year
        query = user_supabase_client.table("transactions").select("*, categories(*)")
        query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
        query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
        query = query.order(TRANSACTIONS_COLUMNS.DATE.value, desc=False)
        
        response = query.execute()
        transactions = response.data
        
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
                'fun_expense': 0.0
            }
        
        # Initialize totals and category breakdowns
        total_income = 0.0
        total_expense = 0.0
        total_saving = 0.0
        total_investment = 0.0
        total_core_expense = 0.0
        total_fun_expense = 0.0
        
        by_category = defaultdict(float)
        core_categories = defaultdict(float)
        
        # Process each transaction
        for transaction in transactions:
            amount = float(transaction.get("amount", 0))
            transaction_date = datetime.fromisoformat(transaction.get("date", "")).date()
            month_name = calendar.month_abbr[transaction_date.month]
            
            category = transaction.get("categories", {})
            category_type = category.get("type", "").lower() if category else ""
            category_name = category.get("name", "Unknown Category") if category else "Unknown Category"
            category_category = category.get("category_category", "").lower() if category else ""
            
            # Update monthly data and totals based on category type
            if category_type == "income":
                monthly_data[month_name]['income'] += amount
                total_income += amount
            elif category_type == "expense":
                monthly_data[month_name]['expense'] += abs(amount)  # Store as positive for display
                total_expense += abs(amount)
                
                # Check if it's a core expense
                if category_category == "core":
                    monthly_data[month_name]['core_expense'] += abs(amount)
                    total_core_expense += abs(amount)
                    core_categories[category_name] += abs(amount)
                else:
                    monthly_data[month_name]['fun_expense'] += abs(amount)
                    total_fun_expense += abs(amount)
                    
            elif category_type == "saving":
                monthly_data[month_name]['saving'] += abs(amount)
                total_saving += abs(amount)
            elif category_type == "investment":
                monthly_data[month_name]['investment'] += abs(amount)
                total_investment += abs(amount)
            
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
        
        # Calculate monthly net cash flow
        monthly_net_flow = []
        for month in months:
            month_data = monthly_data[month]
            net_flow = month_data['income'] - month_data['expense'] - month_data['saving'] - month_data['investment']
            monthly_net_flow.append(round(net_flow, 2))
        
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
        
        analytics_data = {
            "year": year,
            "total_income": total_income,
            "total_expense": total_expense,
            "total_saving": total_saving,
            "total_investment": total_investment,
            "total_core_expense": total_core_expense,
            "total_fun_expense": total_fun_expense,
            "profit": profit,
            "net_cash_flow": net_cash_flow,
            "savings_rate": savings_rate,
            "investment_rate": investment_rate,
            "months": months,
            "monthly_income": monthly_income,
            "monthly_expense": monthly_expense,
            "monthly_saving": monthly_saving,
            "monthly_investment": monthly_investment,
            "monthly_core_expense": monthly_core_expense,
            "monthly_fun_expense": monthly_fun_expense,
            "monthly_net_flow": monthly_net_flow,
            "by_category": dict(by_category),
            "core_categories": dict(core_categories)
        }
        
        return {"data": analytics_data}
    
    except Exception as e:
        logger.info(f"Database query failed for get_yearly_analytics: {str(e)}")
        logger.info(f"Query parameters - year: {year}")
        logger.error("Failed to fetch yearly analytics from database")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to generate yearly analytics"
        )


@router.get("/emergency-fund", response_model=EmergencyFundResponse)
async def get_emergency_fund_analysis(
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    year: int = Query(datetime.now().year, description="Year for emergency fund calculation")
) -> EmergencyFundResponse:
    """
    Calculate emergency fund requirements based on core expenses.
    """
    
    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        user_supabase_client.postgrest.auth(user["access_token"])
        
        # Date range for the year
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        
        # Query transactions with category joins for core expenses only
        query = user_supabase_client.table("transactions").select("*, categories(*)")
        query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
        query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
        query = query.order(TRANSACTIONS_COLUMNS.DATE.value, desc=False)
        
        response = query.execute()
        transactions = response.data
        
        # Calculate monthly core expenses
        monthly_core_expenses = defaultdict(float)
        core_category_breakdown = defaultdict(float)
        
        for transaction in transactions:
            amount = float(transaction.get("amount", 0))
            transaction_date = datetime.fromisoformat(transaction.get("date", "")).date()
            month_key = f"{transaction_date.year}-{transaction_date.month:02d}"
            
            category = transaction.get("categories", {})
            category_type = category.get("type", "").lower() if category else ""
            category_category = category.get("category_category", "").lower() if category else ""
            category_name = category.get("name", "Unknown Category") if category else "Unknown Category"
            
            # Only consider core expenses
            if category_type == "expense" and category_category == "core":
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
        
        # Get current savings (simplified - you might want to query actual account balances)
        # For now, we'll calculate total savings from the year
        savings_query = user_supabase_client.table("transactions").select("*, categories(*)")
        savings_query = savings_query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
        savings_query = savings_query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
        
        savings_response = savings_query.execute()
        savings_transactions = savings_response.data
        
        current_savings = 0.0
        for transaction in savings_transactions:
            amount = float(transaction.get("amount", 0))
            category = transaction.get("categories", {})
            category_type = category.get("type", "").lower() if category else ""
            
            if category_type == "saving":
                current_savings += abs(amount)
        
        # Calculate coverage and recommendations
        three_month_coverage = (current_savings / three_month_fund * 100) if three_month_fund > 0 else 0
        six_month_coverage = (current_savings / six_month_fund * 100) if six_month_fund > 0 else 0
        
        # Determine recommendation
        if current_savings >= six_month_fund:
            recommendation = "Excellent! You have a robust emergency fund covering 6+ months of core expenses."
            priority = "low"
        elif current_savings >= three_month_fund:
            recommendation = "Good! You have a solid 3-month emergency fund. Consider building towards 6 months."
            priority = "medium"
        elif current_savings >= (three_month_fund * 0.5):
            recommendation = "You're halfway to a 3-month emergency fund. Keep building your savings!"
            priority = "high"
        else:
            recommendation = "Priority: Build your emergency fund! Start with a goal of 3 months of core expenses."
            priority = "critical"
        
        # Round all values
        average_monthly_core = round(average_monthly_core, 2)
        three_month_fund = round(three_month_fund, 2)
        six_month_fund = round(six_month_fund, 2)
        current_savings = round(current_savings, 2)
        three_month_coverage = round(three_month_coverage, 2)
        six_month_coverage = round(six_month_coverage, 2)
        total_core_expenses = round(total_core_expenses, 2)
        
        # Round category breakdown
        core_category_breakdown = {k: round(v, 2) for k, v in core_category_breakdown.items()}
        
        emergency_fund_data = {
            "year": year,
            "average_monthly_core_expenses": average_monthly_core,
            "total_core_expenses": total_core_expenses,
            "three_month_fund_target": three_month_fund,
            "six_month_fund_target": six_month_fund,
            "current_savings": current_savings,
            "three_month_coverage_percent": three_month_coverage,
            "six_month_coverage_percent": six_month_coverage,
            "recommendation": recommendation,
            "priority": priority,
            "core_category_breakdown": dict(core_category_breakdown),
            "months_analyzed": len(monthly_core_expenses)
        }
        
        return {"data": emergency_fund_data}
    
    except Exception as e:
        logger.info(f"Database query failed for get_emergency_fund_analysis: {str(e)}")
        logger.info(f"Query parameters - year: {year}")
        logger.error("Failed to fetch emergency fund analysis from database")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to generate emergency fund analysis"
        )