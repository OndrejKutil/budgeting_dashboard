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

@router.get("/{year}")
async def get_year_data(
    year: int,
    access_token: str = Depends(get_supabase_access_token),
    refresh_token: str = Depends(get_supabase_refresh_token),
    api_key: str = Depends(api_key_auth)
):
    """
    Fetches data for a specific year.
    """
    # Initialize Supabase client
    supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)

    try:

        supabase_client.auth.set_session(access_token, refresh_token)

        # Query the database for the specified year
        response = supabase_client.table("transactions").select("*").gte("date", f"{year}-01-01").lte("date", f"{year}-12-31").execute()

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