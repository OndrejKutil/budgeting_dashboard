# fastapi
import fastapi
from fastapi import APIRouter, Depends, status, Query, Request

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

# schemas
from ..helper.columns import SAVINGS_FUNDS_COLUMNS, TRANSACTIONS_COLUMNS
from ..schemas.base import SavingsFundsData
from ..schemas.requests import SavingsFundsRequest
from ..schemas.responses import SavingsFundsResponse, SavingsFundSuccessResponse
from ..helper.calculations import savings_funds_calc

# other
import polars as pl
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

#? This router prefix is /funds

@router.get("/", response_model=SavingsFundsResponse)
@limiter.limit(RATE_LIMITS["read_only"])
async def get_savings_funds(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    fund_id: Optional[str] = Query(None, description="ID of the savings fund to retrieve"),
    fund_name: Optional[str] = Query(None, description="Name of the savings fund to retrieve")
) -> SavingsFundsResponse:
    """
    Get all savings funds for the current user with optional filtering.
    """
    
    try:
        user_supabase_client = get_db_client(user["access_token"])

        query = user_supabase_client.table("dim_savings_funds").select("*")

        if fund_id:
            query = query.eq(SAVINGS_FUNDS_COLUMNS.ID.value, fund_id)

        if fund_name:
            query = query.eq(SAVINGS_FUNDS_COLUMNS.NAME.value, fund_name)

        response = query.execute()

        # Fetch transactions for metrics
        # Filter for transactions that have a savings_fund_id_fk
        transactions_query = user_supabase_client.table("fct_transactions").select(f"{TRANSACTIONS_COLUMNS.SAVINGS_FUND_ID.value},{TRANSACTIONS_COLUMNS.AMOUNT.value},{TRANSACTIONS_COLUMNS.DATE.value}").not_.is_(TRANSACTIONS_COLUMNS.SAVINGS_FUND_ID.value, "null")
        transactions_response = transactions_query.execute()
        
        metrics = {}
        if transactions_response.data:
            funds_df = pl.from_dicts(transactions_response.data)
            metrics = savings_funds_calc.calculate_fund_metrics(funds_df)

        # Merge metrics
        data = []
        for item in response.data:
            fund_id = item.get(SAVINGS_FUNDS_COLUMNS.ID.value)
            # Find metrics for this fund
            if fund_id in metrics:
                fund_metrics = metrics[fund_id]
                item['current_amount'] = fund_metrics["current_amount"]
                item['net_flow_30d'] = fund_metrics["net_flow_30d"]
            else:
                item['current_amount'] = 0.0
                item['net_flow_30d'] = 0.0
            data.append(SavingsFundsData(**item))

        return SavingsFundsResponse(
            data=data,
            count=len(response.data),
            success=True,
            message="Savings funds retrieved successfully"
        )

    except Exception as e:
        logger.error(f"Failed to fetch savings funds: {str(e)}")
        logger.info(f"Query parameters - fund_id: {fund_id}, fund_name: {fund_name}")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch savings funds"
        )


@router.post("/", response_model=SavingsFundSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def create_savings_fund(
    request: Request,
    fund: SavingsFundsRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> SavingsFundSuccessResponse:
    """
    Create a new savings fund.
    """

    try:
        user_supabase_client = get_db_client(user["access_token"])

        data = fund.model_dump()
        
        # Convert datetime to ISO string for JSON serialization
        if data.get(SAVINGS_FUNDS_COLUMNS.CREATED_AT.value) is not None:
            data[SAVINGS_FUNDS_COLUMNS.CREATED_AT.value] = data[SAVINGS_FUNDS_COLUMNS.CREATED_AT.value].isoformat()
        else:
            # If created_at is missing, default to now (backend-side default)
            from datetime import datetime
            data[SAVINGS_FUNDS_COLUMNS.CREATED_AT.value] = datetime.now().isoformat()

        response = user_supabase_client.table("dim_savings_funds").insert(data).execute()

        return SavingsFundSuccessResponse(
            success=True,
            message="Savings fund created successfully",
            data=[SavingsFundsData(**item) for item in response.data] if response.data else None
        )

    except Exception as e:
        logger.error(f"Failed to create savings fund: {str(e)}")
        logger.info(f"Fund data: {fund}")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create savings fund"
        )


@router.put("/{fund_id}", response_model=SavingsFundSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def update_savings_fund(
    request: Request,
    fund_id: str,
    fund: SavingsFundsRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> SavingsFundSuccessResponse:
    """
    Update an existing savings fund by its ID.
    """
    try:
        user_supabase_client = get_db_client(user["access_token"])

        data = fund.model_dump()
        
        # Convert datetime to ISO string for JSON serialization
        if data.get(SAVINGS_FUNDS_COLUMNS.CREATED_AT.value) is not None:
            data[SAVINGS_FUNDS_COLUMNS.CREATED_AT.value] = data[SAVINGS_FUNDS_COLUMNS.CREATED_AT.value].isoformat()
        else:
            # For update, do not overwrite created_at with None if not provided
            if SAVINGS_FUNDS_COLUMNS.CREATED_AT.value in data:
                del data[SAVINGS_FUNDS_COLUMNS.CREATED_AT.value]

        response = user_supabase_client.table("dim_savings_funds").update(data).eq(SAVINGS_FUNDS_COLUMNS.ID.value, fund_id).execute()

        return SavingsFundSuccessResponse(
            success=True,
            message=f"Savings fund {fund_id} updated successfully",
            data=[SavingsFundsData(**item) for item in response.data] if response.data else None
        )

    except Exception as e:
        logger.error(f"Failed to update savings fund {fund_id}: {str(e)}")
        logger.info(f"Fund data: {fund}")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update savings fund"
        )


@router.delete("/{fund_id}", response_model=SavingsFundSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def delete_savings_fund(
    request: Request,
    fund_id: str,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> SavingsFundSuccessResponse:
    """
    Delete a savings fund by its ID.
    """
    try:
        user_supabase_client = get_db_client(user["access_token"])

        response = user_supabase_client.table("dim_savings_funds").delete().eq(SAVINGS_FUNDS_COLUMNS.ID.value, fund_id).execute()

        return SavingsFundSuccessResponse(
            success=True,
            message=f"Savings fund {fund_id} deleted successfully",
            data=None
        )
    
    except Exception as e:
        logger.error(f"Failed to delete savings fund {fund_id}: {str(e)}")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete savings fund"
        )