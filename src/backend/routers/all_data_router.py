# fastapi
import fastapi
from fastapi import APIRouter, Depends, Query

# auth dependencies
from auth.auth import api_key_auth, get_current_user, get_supabase_refresh_token

# Load environment variables
import os
from dotenv import load_dotenv

# logging
import logging

# supabase client
from supabase import create_client, Client

# helper
from helper.columns import COLUMNS
# TODO from backend.schemas.endpoint_schemas import 

# other
from datetime import date
from typing import Optional

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
    user: dict[str, str] = Depends(get_current_user),
    start_date: Optional[date] = Query(None, description="starting date for filtering transactions"),
    end_date: Optional[date] = Query(None, description="ending date for filtering transactions"),
    category: Optional[str] = Query(None, description="category for filtering transactions"),
    account: Optional[str] = Query(None, description="account for filtering transactions")
) -> dict:

    try:
        # Create Supabase client with user's access token
        user_supabase_client: Client = create_client(
            PROJECT_URL, 
            ANON_KEY
        )
        
        # Set the user's access token for authentication
        user_supabase_client.postgrest.auth(user["access_token"])
        

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
        logger.critical(f"Error type: {type(e).__name__}")
        logger.critical(f"Error fetching data: {e}")
        
        raise fastapi.HTTPException(
            status_code=500, 
            detail=f"Database query failed: {str(e)}"
        )
