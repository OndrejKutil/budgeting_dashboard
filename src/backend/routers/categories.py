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
from ..schemas.requests import CategoryRequest, CategoryUpdateRequest
from ..schemas.responses import CategoriesResponse, CategorySuccessResponse

# other
from typing import Optional

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# Create logger for this module
logger = logging.getLogger(__name__)

# Table name for per-user categories
TABLE_NAME = "dim_categories_users"

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

        query = user_supabase_client.table(TABLE_NAME).select("*")

        if category_id:
            query = query.eq(CATEGORIES_COLUMNS.ID.value, category_id)
        if category_name:
            query = query.eq(CATEGORIES_COLUMNS.NAME.value, category_name)
        
        response = query.execute()

        return CategoriesResponse(
            data=[CategoryData(**item) for item in response.data],
            count=len(response.data),
            success=True,
            message="Categories retrieved successfully"
        )

    except Exception as e:
        logger.info(f"Database query failed for get_all_categories: {str(e)}")
        logger.info(f"Query parameters - category_id: {category_id}, category_name: {category_name}")
        logger.error("Failed to fetch categories from database")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Database query failed"
        )


@router.post("/", response_model=CategorySuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def create_category(
    request: Request,
    category_data: CategoryRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> CategorySuccessResponse:
    """
    Create a new category for the authenticated user.
    """
    try:
        user_supabase_client = get_db_client(user["access_token"])
        
        data = category_data.model_dump(exclude_none=True)
        data[CATEGORIES_COLUMNS.USER_ID.value] = user["user_id"]
        
        response = user_supabase_client.table(TABLE_NAME).insert(data).execute()
        
        return CategorySuccessResponse(
            success=True,
            message="Category created successfully",
            data=[CategoryData(**item) for item in response.data] if response.data else None
        )
    
    except Exception as e:
        logger.error(f"Category creation failed: {str(e)}")
        logger.info(f"Category data: {category_data}")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to create category"
        )


@router.put("/{category_id}", response_model=CategorySuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def update_category(
    request: Request,
    category_id: int,
    category_data: CategoryUpdateRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> CategorySuccessResponse:
    """
    Update an existing category by its ID.
    """
    try:
        user_supabase_client = get_db_client(user["access_token"])
        
        data = category_data.model_dump(exclude_none=True)
        
        if not data:
            raise fastapi.HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        response = (
            user_supabase_client.table(TABLE_NAME)
            .update(data)
            .eq(CATEGORIES_COLUMNS.ID.value, category_id)
            .execute()
        )

        if not response.data:
            raise fastapi.HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category {category_id} not found"
            )

        return CategorySuccessResponse(
            success=True,
            message=f"Category {category_id} updated successfully",
            data=[CategoryData(**item) for item in response.data]
        )
    
    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error(f"Category update failed for category_id: {category_id}")
        logger.info(f"Update data: {category_data}, Error: {str(e)}")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to update category"
        )


@router.delete("/{category_id}", response_model=CategorySuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def delete_category(
    request: Request,
    category_id: int,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> CategorySuccessResponse:
    """
    Delete a category by its ID.
    
    If the category has associated transactions, it will be soft-deleted
    (is_active set to false) instead of hard-deleted.
    """
    try:
        user_supabase_client = get_db_client(user["access_token"])
        
        # Check if any transactions reference this category
        tx_check = (
            user_supabase_client.table("fct_transactions")
            .select("id_pk", count="exact")
            .eq("category_id_fk", category_id)
            .limit(1)
            .execute()
        )
        
        has_transactions = tx_check.count and tx_check.count > 0
        
        if has_transactions:
            # Soft delete: set is_active to false
            response = (
                user_supabase_client.table(TABLE_NAME)
                .update({CATEGORIES_COLUMNS.IS_ACTIVE.value: False})
                .eq(CATEGORIES_COLUMNS.ID.value, category_id)
                .execute()
            )
            
            return CategorySuccessResponse(
                success=True,
                message=f"Category {category_id} has existing transactions and was deactivated instead of deleted",
                data=[CategoryData(**item) for item in response.data] if response.data else None
            )
        else:
            # Hard delete: no transactions reference this category
            response = (
                user_supabase_client.table(TABLE_NAME)
                .delete()
                .eq(CATEGORIES_COLUMNS.ID.value, category_id)
                .execute()
            )
            
            return CategorySuccessResponse(
                success=True,
                message=f"Category {category_id} deleted successfully",
                data=None
            )
    
    except Exception as e:
        logger.error(f"Category deletion failed for category_id: {category_id}")
        logger.info(f"Full error details: {str(e)}")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to delete category"
        )