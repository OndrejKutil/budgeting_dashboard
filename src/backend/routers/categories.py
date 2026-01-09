# fastapi
import fastapi
from fastapi import APIRouter, Depends, Query, status, Request

# auth dependencies
from ..auth.auth import api_key_auth, get_current_user

# rate limiting
from ..helper.rate_limiter import limiter, RATE_LIMITS

# Load environment variables
from ..helper import environment as env

# logging
import logging

# supabase client
from ..data.database import get_db_client

# helper
from ..helper.columns import CATEGORIES_COLUMNS
from ..schemas.base import CategoryData
from ..schemas.responses import CategoriesResponse

# other
from typing import Optional

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# Load environment variables

# Create logger for this module
logger = logging.getLogger(__name__)

# ================================================================================================
#                                   Router Configuration
# ================================================================================================

router = APIRouter()

#? prefix - /categories

@router.get("/", response_model=CategoriesResponse)
@limiter.limit(RATE_LIMITS["read_only"])
async def get_all_categories(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    category_id: Optional[int] = Query(None, description="Optional filtering for only the given category for getting its name"),
    category_name: Optional[str] = Query(None, description="Optional filtering for only the given category for getting its name")
) -> CategoriesResponse:
    
    try:
        user_supabase_client = get_db_client(user["access_token"])

        query = user_supabase_client.table("dim_categories").select("*")

        if category_id:
            query = query.eq(CATEGORIES_COLUMNS.ID.value, category_id)
        if category_name:
            query = query.eq(CATEGORIES_COLUMNS.NAME.value, category_name)
        
        response = query.execute()

        return CategoriesResponse(
            data=[CategoryData(**item) for item in response.data],
            count=len(response.data)
        )

    except Exception as e:
        logger.info(f"Database query failed for get_all_categories: {str(e)}")
        logger.info(f"Query parameters - category_id: {category_id}, category_name: {category_name}")
        logger.error("Failed to fetch categories from database")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Database query failed"
        )