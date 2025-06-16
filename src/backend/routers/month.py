# fastapi
import fastapi
from fastapi import APIRouter, Depends

# auth dependencies
from auth import api_key_auth, get_supabase_access_token, get_supabase_refresh_token

# Load environment variables
import os
from dotenv import load_dotenv

# logging
import logging

# supabase client
from supabase import create_client, Client

# date handling
from datetime import datetime, date
from calendar import monthrange

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# Load environment variables
load_dotenv()
PROJECT_URL = os.getenv("PROJECT_URL")
ANON_KEY = os.getenv("ANON_KEY")

# Create logger for this module
logger = logging.getLogger(__name__)


# ================================================================================================
#                                   Helper Functions
# ================================================================================================


def get_month_number(month_input: str) -> int:
    """
    Convert month name or number string to integer.
    Handles both full names (case-insensitive) and numeric strings.
    """
    months_dict = {
        "january": 1, "february": 2, "march": 3, "april": 4,
        "may": 5, "june": 6, "july": 7, "august": 8,
        "september": 9, "october": 10, "november": 11, "december": 12
    }
    
    # Try to get month by name first (case-insensitive)
    month_lower = month_input.lower()
    if month_lower in months_dict:
        return months_dict[month_lower]
    
    # Try to parse as number
    try:
        month_num = int(month_input)
        if 1 <= month_num <= 12:
            return month_num
        else:
            raise ValueError(f"Month number must be between 1 and 12, got {month_num}")
    except ValueError:
        raise ValueError(f"Invalid month: {month_input}")

def get_month_date_range(year: int, month: int) -> tuple[str, str]:
    """
    Get the start and end dates for a given year and month.
    Returns (start_date, end_date) where end_date is the first day of next month.
    """
    # First day of the month
    start_date = f"{year:04d}-{month:02d}-01"
    
    # Calculate next month and year
    if month == 12:
        next_month = 1
        next_year = year + 1
    else:
        next_month = month + 1
        next_year = year
    
    # First day of next month (for less-than comparison)
    end_date = f"{next_year:04d}-{next_month:02d}-01"
    
    return start_date, end_date

# ================================================================================================
#                                   Router Configuration
# ================================================================================================

router = APIRouter()

@router.get("/{year}/{month}")
async def get_month_data(
    year: int,
    month: str,
    access_token: str = Depends(get_supabase_access_token),
    refresh_token: str = Depends(get_supabase_refresh_token),
    api_key: str = Depends(api_key_auth)
):
    """
    Fetches transaction data for a specific year and month.
    """
    # Initialize Supabase client
    supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)

    try:
        supabase_client.auth.set_session(access_token, refresh_token)
        
        # Convert month string to number and get date range
        month_num = get_month_number(month)
        start_date, end_date = get_month_date_range(year, month_num)
        
        # Query transactions within the date range
        response = supabase_client.table("transactions").select("*").gte("date", start_date).lt("date", end_date).execute()

        return {
            "data": response.data,
            "count": len(response.data)
        }
    
    except Exception as e:
        logger.error(f"Error fetching data: {e}")
        logger.error(f"Access token (first 20 chars): {access_token[:20]}...")
        logger.error(f"Error type: {type(e).__name__}")

        
        raise fastapi.HTTPException(
            status_code=500, 
            detail=f"Database query failed: {str(e)}"
        )
    
    finally:
        try:
            supabase_client.auth.sign_out()
        except:
            pass  # Ignore errors in cleanup
