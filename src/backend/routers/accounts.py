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
from ..helper.columns import ACCOUNTS_COLUMNS, TRANSACTIONS_COLUMNS
from ..schemas.base import AccountData
from ..schemas.requests import AccountRequest
from ..schemas.responses import AccountsResponse, AccountSuccessResponse
from ..helper.calculations import accounts_calc

# other
import polars as pl
from typing import Optional, Dict, List

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

#? prefix - /accounts

@router.get("/", response_model=AccountsResponse)
@limiter.limit(RATE_LIMITS["read_only"])
async def get_all_accounts(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    account_id: Optional[int] = Query(None, description="Optional filtering for only the given account for getting its name"),
    account_name: Optional[str] = Query(None, description="Optional filtering for only the given account for getting its name")
) -> AccountsResponse:
    
    try:
        user_supabase_client = get_db_client(user["access_token"])

        query = user_supabase_client.table("dim_accounts").select("*")

        if account_id:
            query = query.eq(ACCOUNTS_COLUMNS.ID.value, account_id)
        if account_name:
            query = query.eq(ACCOUNTS_COLUMNS.NAME.value, account_name)
        
        response = query.execute()

        # Fetch transactions for metrics calculation
        transactions_query = user_supabase_client.table("fct_transactions").select(f"{TRANSACTIONS_COLUMNS.ACCOUNT_ID.value},{TRANSACTIONS_COLUMNS.AMOUNT.value},{TRANSACTIONS_COLUMNS.DATE.value}")
        transactions_response = transactions_query.execute()
        
        metrics = {}
        if transactions_response.data:
            transactions_df = pl.from_dicts(transactions_response.data)
            metrics = accounts_calc.calculate_account_metrics(transactions_df)

        # Merge metrics
        data = []
        for item in response.data:
            acc_id = str(item.get(ACCOUNTS_COLUMNS.ID.value))
            if acc_id in metrics:
                acc_metrics = metrics[acc_id]
                item['current_balance'] = acc_metrics["current_balance"]
                item['net_flow_30d'] = acc_metrics["net_flow_30d"]
            else:
                # Default values if no transactions
                item['current_balance'] = 0.0
                item['net_flow_30d'] = 0.0
            data.append(AccountData(**item))

        return AccountsResponse(
            data=data,
            count=len(response.data),
            success=True,
            message="Accounts fetched successfully"
        )

    except Exception as e:
        logger.info(f"Database query failed for get_all_accounts: {str(e)}")
        logger.info(f"Query parameters - account_id: {account_id}, account_name: {account_name}")
        logger.error("Failed to fetch accounts from database")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Database query failed"
        )
    

@router.post("/", response_model=AccountSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def create_account(
    request: Request,
    account_data: AccountRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> AccountSuccessResponse:

    try:
        user_supabase_client = get_db_client(user["access_token"])

        data : Dict = account_data.model_dump()

        # user_id is optional and will not really be provided, as we can easily get it from the user object from the access token
        if not data.get("user_id"):
            data[ACCOUNTS_COLUMNS.USER_ID.value] = user["user_id"]

        
        # Convert datetime to ISO string for JSON serialization
        if data.get(ACCOUNTS_COLUMNS.CREATED_AT.value) is not None:
            data[ACCOUNTS_COLUMNS.CREATED_AT.value] = data[ACCOUNTS_COLUMNS.CREATED_AT.value].isoformat()

        response = user_supabase_client.table("dim_accounts").insert(data).execute()

        return AccountSuccessResponse(
            success=True,
            message="Account created successfully"
        )

    except Exception as e:
        logger.info(f"Full error details: {str(e)}")
        logger.error("Account creation failed")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to create account"
        )
    


@router.put("/{account_id}", response_model=AccountSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def update_account(
    request: Request,
    account_id: str,
    account_data: AccountRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> AccountSuccessResponse:

    try:
        user_supabase_client = get_db_client(user["access_token"])

        data = account_data.model_dump()

        # user_id is optional and will not really be provided, as we can easily get it from the user object from the access token
        if not data.get(ACCOUNTS_COLUMNS.USER_ID.value):
            data[ACCOUNTS_COLUMNS.USER_ID.value] = user["user_id"]
        
        # Convert datetime to ISO string for JSON serialization
        if data.get(ACCOUNTS_COLUMNS.CREATED_AT.value) is not None:
            data[ACCOUNTS_COLUMNS.CREATED_AT.value] = data[ACCOUNTS_COLUMNS.CREATED_AT.value].isoformat()
            
        response = user_supabase_client.table("dim_accounts").update(data).eq(ACCOUNTS_COLUMNS.ID.value, account_id).execute()

        return AccountSuccessResponse(
            success=True,
            message="Account updated successfully"
        )

    except Exception as e:
        logger.info(f"Account update failed for account_id: {account_id}")
        logger.info(f"Full error details: {str(e)}")
        logger.error(f"Account update failed for account {account_id}")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to update account"
        )
    

@router.delete("/{account_id}", response_model=AccountSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def delete_account(
    request: Request,
    account_id: str,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> AccountSuccessResponse:

    try:
        user_supabase_client = get_db_client(user["access_token"])

        response = user_supabase_client.table("dim_accounts").delete().eq(ACCOUNTS_COLUMNS.ID.value, account_id).execute()

        return AccountSuccessResponse(
            success=True,
            message="Account deleted successfully"
        )

    except Exception as e:
        logger.info(f"Account deletion failed for account_id: {account_id}")
        logger.info(f"Full error details: {str(e)}")
        logger.error(f"Account deletion failed for account {account_id}")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to delete account"
        )

