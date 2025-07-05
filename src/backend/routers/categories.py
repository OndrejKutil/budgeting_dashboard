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
from helper.columns import CATEGORIES_COLUMNS
from schemas.endpoint_schemas import CategoriesResponse

# other
from typing import Optional

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

#? prefix - /categories

@router.get("/", response_model=CategoriesResponse,)
async def get_all_categories(
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    category_id: Optional[int] = Query(None, description="Optional filtering for only the given category for getting its name"),
    category_name: Optional[str] = Query(None, description="Optional filtering for only the given category for getting its name")
):
    
    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        
        user_supabase_client.postgrest.auth(user["access_token"])

        query = user_supabase_client.table("categories").select("*")

        if category_id:
            query = query.eq(CATEGORIES_COLUMNS.ID.value, category_id)
        if category_name:
            query = query.eq(CATEGORIES_COLUMNS.NAME.value, category_name)
        
        response = query.execute()

        return {
            "data": response.data,
            "count": len(response.data)
        }

    except Exception as e:
        logger.info(f"Database query failed for get_all_categories: {str(e)}")
        logger.info(f"Query parameters - category_id: {category_id}, category_name: {category_name}")
        logger.error("Failed to fetch categories from database")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Database query failed"
        )