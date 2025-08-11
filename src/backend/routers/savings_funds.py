# fastapi
from typing import Optional
from fastapi import APIRouter, Depends, status, Query

# auth dependencies
from auth.auth import api_key_auth, get_current_user

# Load environment variables
import helper.environment as env

# logging
import logging

# supabase client
from supabase import create_client, Client

from helper.columns import SAVINGS_FUNDS_COLUMNS
from schemas.endpoint_schemas import SavingsFundsData, SavingsFundsRequest
from typing import List


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

#? This router prefix is /funds

@router.get("/", response_model=List[SavingsFundsData])
def get_savings_funds(
    api_key: str = Depends(api_key_auth),
    user: dict = Depends(get_current_user),
    fund_id: Optional[str] = Query(None, description="ID of the savings fund to retrieve"),
    fund_name: Optional[str] = Query(None, description="Name of the savings fund to retrieve")
):

    try:

        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        
        user_supabase_client.postgrest.auth(user["access_token"])

        query = user_supabase_client.table("savings_funds").select("*")

        if fund_id:
            query = query.eq(SAVINGS_FUNDS_COLUMNS.ID.value, fund_id)

        if fund_name:
            query = query.eq(SAVINGS_FUNDS_COLUMNS.NAME.value, fund_name)

        response = query.execute()

        return response.data

    except Exception as e:
        logger.error(f"Exception occurred: {e}")
        return {"error": "Internal Server Error"}, status.HTTP_500_INTERNAL_SERVER_ERROR
    


@router.post("/", response_model=List[SavingsFundsData])
def create_savings_fund(
    fund: SavingsFundsRequest,
    api_key: str = Depends(api_key_auth),
    user: dict = Depends(get_current_user)
):
    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        user_supabase_client.postgrest.auth(user["access_token"])

        response = user_supabase_client.table("savings_funds").insert(fund).execute()

        return response.data

    except Exception as e:
        logger.error(f"Exception occurred: {e}")
        return {"error": "Internal Server Error"}, status.HTTP_500_INTERNAL_SERVER_ERROR
    

@router.put("/{fund_id}", response_model=List[SavingsFundsData])
def update_savings_fund(
    fund_id: str,
    fund: SavingsFundsRequest,
    api_key: str = Depends(api_key_auth),
    user: dict = Depends(get_current_user)
):
    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        user_supabase_client.postgrest.auth(user["access_token"])

        response = user_supabase_client.table("savings_funds").update(fund).eq(SAVINGS_FUNDS_COLUMNS.ID.value, fund_id).execute()

        return response.data

    except Exception as e:
        logger.error(f"Exception occurred: {e}")
        return {"error": "Internal Server Error"}, status.HTTP_500_INTERNAL_SERVER_ERROR
    

@router.delete("/{fund_id}")
def delete_savings_fund(
    fund_id: str,
    api_key: str = Depends(api_key_auth),
    user: dict = Depends(get_current_user)
):
    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        user_supabase_client.postgrest.auth(user["access_token"])

        response = user_supabase_client.table("savings_funds").delete().eq(SAVINGS_FUNDS_COLUMNS.ID.value, fund_id).execute()

        return {"message": "Savings fund deleted successfully"}
    
    except Exception as e:
        logger.error(f"Exception occurred: {e}")
        return {"error": "Internal Server Error"}, status.HTTP_500_INTERNAL_SERVER_ERROR