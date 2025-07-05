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
from helper.columns import TRANSACTIONS_COLUMNS
from schemas.endpoint_schemas import AllDataResponse, TransactionRequest

# other
from datetime import date
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

#? This router prefix is /all

@router.get("/", response_model=AllDataResponse)
async def get_all_data(
    api_key: str = Depends(api_key_auth), 
    user: dict[str, str] = Depends(get_current_user),
    start_date: Optional[date] = Query(None, description="starting date for filtering transactions"),
    end_date: Optional[date] = Query(None, description="ending date for filtering transactions"),
    category_id: Optional[str] = Query(None, description="category for filtering transactions"),
    account_id: Optional[str] = Query(None, description="account for filtering transactions")
) -> AllDataResponse:

    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        
        user_supabase_client.postgrest.auth(user["access_token"])
        

        query = user_supabase_client.table("transactions").select("*")
        
        if start_date:
            query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
        if end_date:
            query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
        if category_id:
            query = query.eq(TRANSACTIONS_COLUMNS.CATEGORY_ID.value, category_id)
        if account_id:
            query = query.eq(TRANSACTIONS_COLUMNS.ACCOUNT_ID.value, account_id)
            
        query = query.order(TRANSACTIONS_COLUMNS.DATE.value, desc=False)
        
        response = query.execute()
        
        return {
            "data": response.data,
            "count": len(response.data)
        }
    
    except Exception as e:
        logger.info(f"Database query failed for get_all_data: {str(e)}")
        logger.info(f"Query parameters - start_date: {start_date}, end_date: {end_date}, category_id: {category_id}, account_id: {account_id}")
        logger.error("Failed to fetch transactions from database")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Database query failed"
        )


@router.get("/{transaction_id}", response_model=AllDataResponse)
async def get_transaction_by_id(
    transaction_id: str,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> AllDataResponse:
    """
    Fetch a specific transaction by its ID.
    """
    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        
        user_supabase_client.postgrest.auth(user["access_token"])
        
        response = user_supabase_client.table("transactions").select("*").eq("id", transaction_id).execute()
        
        if not response.data:
            raise fastapi.HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
        
        return {
            "data": response.data,
            "count": len(response.data)
        }
    
    except Exception as e:
        logger.info(f"Transaction fetch by ID failed for transaction_id: {transaction_id}")
        logger.info(f"Full error details: {str(e)}")
        logger.error(f"Failed to fetch transaction {transaction_id}")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to fetch transaction"
        )
    

@router.post("/")
async def create_transaction(
    transaction_data: TransactionRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
):
    """
    Create a new transaction record.
    """
    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        
        user_supabase_client.postgrest.auth(user["access_token"])
        
        data = transaction_data.model_dump()
        data["user_id"] = user["user_id"]
        
        # Convert Decimal to float for JSON serialization
        if data.get("amount") is not None:
            data["amount"] = float(data["amount"])
        
        # Convert date to ISO string for JSON serialization
        if data.get("date") is not None:
            data["date"] = data["date"].isoformat()
            
        # Convert datetime to ISO string for JSON serialization
        if data.get("created_at") is not None:
            data["created_at"] = data["created_at"].isoformat()
        
        response = user_supabase_client.table("transactions").insert(data).execute()
        
        return {
            "data": response.data,
            "count": len(response.data)
        }
    
    except Exception as e:
        logger.info(f"Transaction creation failed with data: {data}")
        logger.info(f"Full error details: {str(e)}")
        logger.error("Transaction creation failed")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to create transaction"
        )
    

@router.put("/{transaction_id}")
async def update_transaction(
    transaction_id: str,
    transaction_data: TransactionRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
):
    """
    Update an existing transaction record by its ID.
    """
    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        
        user_supabase_client.postgrest.auth(user["access_token"])
        
        data = transaction_data.model_dump()
        data["user_id"] = user["user_id"]
        
        # Convert Decimal to float for JSON serialization
        if data.get("amount") is not None:
            data["amount"] = float(data["amount"])
        
        # Convert date to ISO string for JSON serialization
        if data.get("date") is not None:
            data["date"] = data["date"].isoformat()
            
        # Convert datetime to ISO string for JSON serialization
        if data.get("created_at") is not None:
            data["created_at"] = data["created_at"].isoformat()
        
        response = user_supabase_client.table("transactions").update(data).eq("id", transaction_id).execute()
        
        return {
            "data": response.data,
            "count": len(response.data)
        }
    
    except Exception as e:
        logger.info(f"Transaction update failed for transaction_id: {transaction_id}")
        logger.info(f"Update data: {data}")
        logger.info(f"Full error details: {str(e)}")
        logger.error(f"Transaction update failed for transaction {transaction_id}")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to update transaction"
        )
    

@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
):
    """
    Delete a transaction record by its ID.
    """
    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        
        user_supabase_client.postgrest.auth(user["access_token"])
        
        response = user_supabase_client.table("transactions").delete().eq("id", transaction_id).execute()
        
        return {"message": "Transaction deleted successfully"}
    
    except Exception as e:
        logger.info(f"Transaction deletion failed for transaction_id: {transaction_id}")
        logger.info(f"Full error details: {str(e)}")
        logger.error(f"Transaction deletion failed for transaction {transaction_id}")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to delete transaction"
        )