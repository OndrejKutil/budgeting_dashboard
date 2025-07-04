# fastapi
import fastapi
from fastapi import APIRouter, Depends, Query

# auth dependencies
from backend.auth.auth import api_key_auth, get_current_user

# Load environment variables
import os
from dotenv import load_dotenv

# logging
import logging

# supabase client
from supabase import create_client, Client

# other
from datetime import date
from typing import Optional

from backend.helper.columns import COLUMNS

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
#                                   Router Configuration
# ================================================================================================

router = APIRouter()

#? This router prefix is /all

@router.get("/")
async def get_all_data(
    api_key: str = Depends(api_key_auth), 
    user = Depends(get_current_user),
    start_date: Optional[date] = Query(None, description="start"),
    end_date: Optional[date] = Query(None),
    category: Optional[str] = Query(None),
    account: Optional[str] = Query(None)
):
    """
    Endpoint to fetch all data from the database.
    Requires API key authentication and Supabase access token.
    """

    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY, options={"headers": {"Authorization": f"Bearer {user["access_token"]}"}})
        
        # Fetch all data from the 'transactions' table using the user's session
        query = user_supabase_client.table("transactions").select("*")
        
        if start_date:
            query = query.gte(COLUMNS.DATE.value, start_date)
        if end_date:
            query = query.lte(COLUMNS.DATE.value, end_date)
        if category:
            query = query.eq(COLUMNS.CATEGORY.value, category)
        if account:
            query = query.eq(COLUMNS.ACCOUNT.value, account)
            
        query = query.order(COLUMNS.DATE.value, desc=False)
        
        response = query.execute()
        
        return {
            "data": response.data,
            "count": len(response.data)
        }
    
    except Exception as e:
        logger.error(f"Error fetching data: {e}")
        logger.error(f"Access token (first 20 chars): {user["access_token"][:20]}...")
        logger.error(f"Error type: {type(e).__name__}")

        
        raise fastapi.HTTPException(
            status_code=500, 
            detail=f"Database query failed: {str(e)}"
        )