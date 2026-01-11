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

from ..data.database import get_db_client

# helper
from ..helper.columns import TRANSACTIONS_COLUMNS
from ..schemas.base import TransactionData
from ..schemas.requests import TransactionRequest
from ..schemas.responses import TransactionsResponse, TransactionSuccessResponse

# other
from datetime import date
from typing import Optional, List

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# Load environment variables
# Create logger for this module

# Create logger for this module
logger = logging.getLogger(__name__)

# ================================================================================================
#                                   Router Configuration
# ================================================================================================

router = APIRouter()

#? This router prefix is /all

@router.get("/", response_model=TransactionsResponse)
@limiter.limit(RATE_LIMITS["read_only"])
async def get_all_data(
    request: Request,
    api_key: str = Depends(api_key_auth), 
    user: dict[str, str] = Depends(get_current_user),
    start_date: Optional[date] = Query(None, description="Starting date for filtering transactions"),
    end_date: Optional[date] = Query(None, description="Ending date for filtering transactions"),
    category_id: Optional[str] = Query(None, description="Category for filtering transactions"),
    account_id: Optional[str] = Query(None, description="Account for filtering transactions"),
    transaction_id: Optional[str] = Query(None, description="Transaction ID for filtering transactions"),
    search: Optional[str] = Query(None, description="Search term for filtering transactions by notes"),
    limit: Optional[int] = Query(100, ge=1, le=1000, description="Number of items to return (max 1000)"),
    offset: Optional[int] = Query(0, ge=0, description="Number of items to skip")
) -> TransactionsResponse:
    """
    Get all transactions with optional filtering and pagination.
    
    Returns transactions ordered by date (most recent first).
    """

    try:
        user_supabase_client = get_db_client(user["access_token"])
        
        query = user_supabase_client.table("fct_transactions").select("*", count="exact")
        
        if start_date:
            query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
        if end_date:
            query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
        if category_id:
            query = query.eq(TRANSACTIONS_COLUMNS.CATEGORY_ID.value, category_id)
        if account_id:
            query = query.eq(TRANSACTIONS_COLUMNS.ACCOUNT_ID.value, account_id)
        if transaction_id:
            query = query.eq(TRANSACTIONS_COLUMNS.ID.value, transaction_id)
        if search:
            query = query.ilike(TRANSACTIONS_COLUMNS.NOTES.value, f"%{search}%")
            
        # Reverse the order: most recent transactions first
        query = query.order(TRANSACTIONS_COLUMNS.DATE.value, desc=True)
        
        # Apply pagination
        if limit is not None and offset is not None:
            query = query.range(offset, offset + limit)
        
        response = query.execute()
        
        return TransactionsResponse(
            data=[TransactionData(**item) for item in response.data],
            count=response.count,
            success=True,
            message="Transactions retrieved successfully"
        )
    
    except Exception as e:
        logger.error(f"Database query failed for get_all_data: {str(e)}")
        logger.info(f"Query parameters - start_date: {start_date}, end_date: {end_date}, category_id: {category_id}, account_id: {account_id}, limit: {limit}, offset: {offset}")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Database query failed"
        )


@router.post("/", response_model=TransactionSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def create_transaction(
    request: Request,
    transaction_data: TransactionRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> TransactionSuccessResponse:
    """
    Create a new transaction record.
    """

    try:
        user_supabase_client = get_db_client(user["access_token"])
        
        data = transaction_data.model_dump()
        data[TRANSACTIONS_COLUMNS.USER_ID.value] = user["user_id"]
        
        # Convert Decimal to float for JSON serialization
        if data.get(TRANSACTIONS_COLUMNS.AMOUNT.value) is not None:
            data[TRANSACTIONS_COLUMNS.AMOUNT.value] = float(data[TRANSACTIONS_COLUMNS.AMOUNT.value])
        
        # Convert date to ISO string for JSON serialization
        if data.get(TRANSACTIONS_COLUMNS.DATE.value) is not None:
            data[TRANSACTIONS_COLUMNS.DATE.value] = data[TRANSACTIONS_COLUMNS.DATE.value].isoformat()
            
        # Convert datetime to ISO string for JSON serialization
        if data.get(TRANSACTIONS_COLUMNS.CREATED_AT.value) is not None:
            data[TRANSACTIONS_COLUMNS.CREATED_AT.value] = data[TRANSACTIONS_COLUMNS.CREATED_AT.value].isoformat()
        
        response = user_supabase_client.table("fct_transactions").insert(data).execute()
        
        return TransactionSuccessResponse(
            success=True,
            message="Transaction created successfully",
            data=[TransactionData(**item) for item in response.data] if response.data else None
        )
    
    except Exception as e:
        logger.error(f"Transaction creation failed: {str(e)}")
        logger.info(f"Transaction data: {transaction_data}")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to create transaction"
        )
    

@router.put("/{transaction_id}", response_model=TransactionSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def update_transaction(
    request: Request,
    transaction_id: str,
    transaction_data: TransactionRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> TransactionSuccessResponse:
    """
    Update an existing transaction record by its ID.
    """

    try:
        user_supabase_client = get_db_client(user["access_token"])
        
        data = transaction_data.model_dump()
        data[TRANSACTIONS_COLUMNS.USER_ID.value] = user["user_id"]
        
        # Convert Decimal to float for JSON serialization
        if data.get(TRANSACTIONS_COLUMNS.AMOUNT.value) is not None:
            data[TRANSACTIONS_COLUMNS.AMOUNT.value] = float(data[TRANSACTIONS_COLUMNS.AMOUNT.value])
        
        # Convert date to ISO string for JSON serialization
        if data.get(TRANSACTIONS_COLUMNS.DATE.value) is not None:
            data[TRANSACTIONS_COLUMNS.DATE.value] = data[TRANSACTIONS_COLUMNS.DATE.value].isoformat()
            
        # Convert datetime to ISO string for JSON serialization
        if data.get(TRANSACTIONS_COLUMNS.CREATED_AT.value) is not None:
            data[TRANSACTIONS_COLUMNS.CREATED_AT.value] = data[TRANSACTIONS_COLUMNS.CREATED_AT.value].isoformat()

        response = user_supabase_client.table("fct_transactions").update(data).eq(TRANSACTIONS_COLUMNS.ID.value, transaction_id).execute()

        return TransactionSuccessResponse(
            success=True,
            message=f"Transaction {transaction_id} updated successfully",
            data=[TransactionData(**item) for item in response.data] if response.data else None
        )
    
    except Exception as e:
        logger.error(f"Transaction update failed for transaction_id: {transaction_id}")
        logger.info(f"Update data: {transaction_data}, Error: {str(e)}")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to update transaction"
        )
    

@router.delete("/{transaction_id}", response_model=TransactionSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def delete_transaction(
    request: Request,
    transaction_id: str,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> TransactionSuccessResponse:
    """
    Delete a transaction record by its ID.
    """
    try:
        user_supabase_client = get_db_client(user["access_token"])
        
        response = user_supabase_client.table("fct_transactions").delete().eq(TRANSACTIONS_COLUMNS.ID.value, transaction_id).execute()
        
        return TransactionSuccessResponse(
            success=True,
            message=f"Transaction {transaction_id} deleted successfully",
            data=None
        )
    
    except Exception as e:
        logger.error(f"Transaction deletion failed for transaction_id: {transaction_id}")
        logger.info(f"Full error details: {str(e)}")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to delete transaction"
        )