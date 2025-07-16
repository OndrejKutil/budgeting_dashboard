# fastapi
import fastapi
from fastapi import APIRouter, Depends, Query, status

# auth dependencies
from auth.auth import api_key_auth, get_current_user

# Load environment variables
import os
from dotenv import load_dotenv

# logging
import logging

# supabase client
from supabase import create_client, Client

# helper
from helper.columns import TRANSACTIONS_COLUMNS, CATEGORIES_COLUMNS, ACCOUNTS_COLUMNS
from schemas.endpoint_schemas import SummaryResponse

# other
from datetime import date
from typing import Optional
from collections import defaultdict

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# Load environment variables
load_dotenv()
PROJECT_URL: str = os.getenv("PROJECT_URL")
ANON_KEY: str = os.getenv("ANON_KEY")

# Create logger for this module
logger = logging.getLogger(__name__)

# ================================================================================================
#                                   Router Configuration
# ================================================================================================

router = APIRouter()

#? prefix - /summary

@router.get("/", response_model=SummaryResponse)
async def get_financial_summary(
    api_key: str = Depends(api_key_auth), 
    user: dict[str, str] = Depends(get_current_user),
    start_date: Optional[date] = Query(None, description="Start date for filtering transactions"),
    end_date: Optional[date] = Query(None, description="End date for filtering transactions")
) -> SummaryResponse:
    """
    Get financial summary including totals by category type and account.
    """
    
    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        
        user_supabase_client.postgrest.auth(user["access_token"])
        
        # Query transactions with category and account joins
        query = user_supabase_client.table("transactions").select("*, categories(*)")
        
        # Apply date filters if provided
        if start_date:
            query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
        if end_date:
            query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
            
        # Order by date for consistency
        query = query.order(TRANSACTIONS_COLUMNS.DATE.value, desc=False)
        
        response = query.execute()
        transactions = response.data
        
        # Initialize summary totals
        total_income = 0.0
        total_expense = 0.0
        total_saving = 0.0
        total_investment = 0.0
        
        # Initialize grouping dictionaries
        by_category = defaultdict(float)
        
        # Process each transaction
        for transaction in transactions:
            amount = float(transaction.get("amount", 0))
            category = transaction.get("categories", {})
            
            category_type = category.get("type", "").lower() if category else ""
            category_name = category.get("name", "Unknown Category") if category else "Unknown Category"
            
            # Sum by category type (expenses, savings, and investments are negative)
            if category_type == "income":
                total_income += amount
            elif category_type == "expense":
                total_expense += amount  # amount is already negative
            elif category_type == "saving":
                total_saving += amount  # amount is already negative
            elif category_type == "investment":
                total_investment += amount  # amount is already negative
            
            # Group by category name
            by_category[category_name] += amount
        
        # Calculate profit and net cash flow
        # Convert total_expense to positive for display (abs of negative sum)
        total_expense_positive = abs(total_expense)
        total_saving_positive = abs(total_saving)
        total_investment_positive = abs(total_investment)
        
        # Profit = income + expenses (since expenses are negative, we add them directly)
        profit = total_income + total_expense
        
        # Net cash flow = income + expenses + savings + investments (all negatives are added)
        net_cash_flow = total_income + total_expense + total_saving + total_investment
        
        # Round all values to 2 decimal places
        total_income = round(total_income, 2)
        total_expense_positive = round(total_expense_positive, 2)
        total_saving_positive = round(total_saving_positive, 2)
        total_investment_positive = round(total_investment_positive, 2)
        profit = round(profit, 2)
        net_cash_flow = round(net_cash_flow, 2)
        
        # Round grouped values
        by_category = {k: round(v, 2) for k, v in by_category.items()}
        
        summary_data = {
            "total_income": total_income,
            "total_expense": total_expense_positive,
            "total_saving": total_saving_positive,
            "total_investment": total_investment_positive,
            "profit": profit,
            "net_cash_flow": net_cash_flow,
            "by_category": dict(by_category),
        }
        
        return {"data": summary_data}
    
    except Exception as e:
        logger.info(f"Database query failed for get_financial_summary: {str(e)}")
        logger.info(f"Query parameters - start_date: {start_date}, end_date: {end_date}")
        logger.error("Failed to fetch financial summary from database")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to generate financial summary"
        )