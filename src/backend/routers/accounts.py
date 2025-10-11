# fastapi
import fastapi
from fastapi import APIRouter, Depends, Query, status

# auth dependencies
from auth.auth import api_key_auth, get_current_user

# Load environment variables
import helper.environment as env

# logging
import logging

# supabase client
from supabase import create_client, Client

# helper
from helper.columns import ACCOUNTS_COLUMNS
from schemas.endpoint_schemas import AccountsResponse, AccountRequest

# other
from typing import Optional

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# Load environment variables
PROJECT_URL: str = env.PROJECT_URL
ANON_KEY: str = env.ANON_KEY

# Create logger for this module
logger = logging.getLogger(__name__)

# ================================================================================================
#                                   Router Configuration
# ================================================================================================

router = APIRouter()

#? prefix - /accounts

@router.get("/", response_model=AccountsResponse)
async def get_all_accounts(
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    account_id: Optional[int] = Query(None, description="Optional filtering for only the given account for getting its name"),
    account_name: Optional[str] = Query(None, description="Optional filtering for only the given account for getting its name")
):
    
    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        
        user_supabase_client.postgrest.auth(user["access_token"])

        query = user_supabase_client.table("dim_accounts").select("*")

        if account_id:
            query = query.eq(ACCOUNTS_COLUMNS.ID.value, account_id)
        if account_name:
            query = query.eq(ACCOUNTS_COLUMNS.NAME.value, account_name)
        
        response = query.execute()

        return {
            "data": response.data,
            "count": len(response.data)
        }

    except Exception as e:
        logger.info(f"Database query failed for get_all_accounts: {str(e)}")
        logger.info(f"Query parameters - account_id: {account_id}, account_name: {account_name}")
        logger.error("Failed to fetch accounts from database")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Database query failed"
        )
    

@router.post("/")
async def create_account(
    account_data: AccountRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
):
    
    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        
        user_supabase_client.postgrest.auth(user["access_token"])

        data = account_data.model_dump()

        # user_id is optional and will not really be provided, as we can easily get it from the user object from the access token
        if not data.get("user_id"):
            data["user_id"] = user["user_id"]

        # Convert Decimal to float for JSON serialization
        if data.get("starting_balance") is not None:
            data["starting_balance"] = float(data["starting_balance"])
        
        # Convert datetime to ISO string for JSON serialization
        if data.get("created_at") is not None:
            data["created_at"] = data["created_at"].isoformat()

        response = user_supabase_client.table("dim_accounts").insert(data).execute()

        return {"message": "Account created successfully", "data": response.data}

    except Exception as e:
        logger.info(f"Account creation failed with data: {data}")
        logger.info(f"Full error details: {str(e)}")
        logger.error("Account creation failed")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to create account"
        )
    


@router.put("/{account_id}")
async def update_account(
    account_id: str,
    account_data: AccountRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
):
    
    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        
        user_supabase_client.postgrest.auth(user["access_token"])

        data = account_data.model_dump()

        # user_id is optional and will not really be provided, as we can easily get it from the user object from the access token
        if not data.get("user_id"):
            data["user_id"] = user["user_id"]

        # Convert Decimal to float for JSON serialization
        if data.get("starting_balance") is not None:
            data["starting_balance"] = float(data["starting_balance"])
        
        # Convert datetime to ISO string for JSON serialization
        if data.get("created_at") is not None:
            data["created_at"] = data["created_at"].isoformat()

        response = user_supabase_client.table("dim_accounts").update(data).eq(ACCOUNTS_COLUMNS.ID.value, account_id).execute()

        return {"message": "Account updated successfully", "data": response.data}

    except Exception as e:
        logger.info(f"Account update failed for account_id: {account_id}")
        logger.info(f"Update data: {data}")
        logger.info(f"Full error details: {str(e)}")
        logger.error(f"Account update failed for account {account_id}")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to update account"
        )
    

@router.delete("/{account_id}")
async def delete_account(
    account_id: str,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
):
    
    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        
        user_supabase_client.postgrest.auth(user["access_token"])

        response = user_supabase_client.table("dim_accounts").delete().eq(ACCOUNTS_COLUMNS.ID.value, account_id).execute()

        return {"message": "Account deleted successfully", "data": response.data}

    except Exception as e:
        logger.info(f"Account deletion failed for account_id: {account_id}")
        logger.info(f"Full error details: {str(e)}")
        logger.error(f"Account deletion failed for account {account_id}")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to delete account"
        )

