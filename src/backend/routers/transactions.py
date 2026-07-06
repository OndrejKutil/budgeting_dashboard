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
from ..helper.columns import TRANSACTIONS_COLUMNS, TRANSACTION_TAGS_COLUMNS
from ..schemas.base import TransactionData, TagData
from ..schemas.requests import TransactionRequest
from ..schemas.responses import TransactionsResponse, TransactionSuccessResponse, TransactionSummaryResponse

# other
from datetime import date
from typing import Optional, List

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# Create logger for this module
logger = logging.getLogger(__name__)

# ================================================================================================
#                                   Router Configuration
# ================================================================================================

router = APIRouter()

#? This router prefix is /transactions


def _build_transaction_data(item: dict) -> TransactionData:
    """Flatten the nested fct_transaction_tags -> dim_tags structure into TransactionData.tags."""
    raw_junction = item.pop("fct_transaction_tags", None) or []
    tags = [TagData(**jt["dim_tags"]) for jt in raw_junction if jt.get("dim_tags")]
    return TransactionData(**item, tags=tags if tags else None)


def _apply_common_filters(query, start_date, end_date, category_id, account_id,
                          savings_fund_id, category_type, min_amount, max_amount,
                          search, tag_id):
    """Apply all shared filter conditions to a query builder."""
    if start_date:
        query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
    if end_date:
        query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
    if category_id:
        query = query.eq(TRANSACTIONS_COLUMNS.CATEGORY_ID.value, category_id)
    if account_id:
        query = query.eq(TRANSACTIONS_COLUMNS.ACCOUNT_ID.value, account_id)
    if savings_fund_id:
        if savings_fund_id.lower() == 'none':
            query = query.is_(TRANSACTIONS_COLUMNS.SAVINGS_FUND_ID.value, "null")
        else:
            query = query.eq(TRANSACTIONS_COLUMNS.SAVINGS_FUND_ID.value, savings_fund_id)
    if category_type:
        query = query.eq("dim_categories_users.type", category_type)
    if min_amount is not None:
        query = query.gte(TRANSACTIONS_COLUMNS.AMOUNT.value, min_amount)
    if max_amount is not None:
        query = query.lte(TRANSACTIONS_COLUMNS.AMOUNT.value, max_amount)
    if search:
        query = query.ilike(TRANSACTIONS_COLUMNS.NOTES.value, f"%{search}%")
    if tag_id:
        query = query.eq("fct_transaction_tags.tag_id_fk", tag_id)
    return query


@router.get("/summary", response_model=TransactionSummaryResponse)
@limiter.limit(RATE_LIMITS["read_only"])
async def get_transactions_summary(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category_id: Optional[str] = Query(None),
    account_id: Optional[str] = Query(None),
    savings_fund_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    category_type: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    tag_id: Optional[str] = Query(None),
) -> TransactionSummaryResponse:
    """
    Return count and total_amount for all transactions matching the given filters.
    No pagination — covers the full filtered set.
    """
    try:
        client = get_db_client(user["access_token"])

        needs_tag_filter = bool(tag_id)
        needs_type_filter = bool(category_type)

        select_parts = [TRANSACTIONS_COLUMNS.AMOUNT.value]
        if needs_type_filter:
            select_parts.append("dim_categories_users!inner(type)")
        if needs_tag_filter:
            select_parts.append("fct_transaction_tags!inner(tag_id_fk)")

        query = client.table("fct_transactions").select(",".join(select_parts))

        query = _apply_common_filters(
            query, start_date, end_date, category_id, account_id,
            savings_fund_id, category_type, min_amount, max_amount, search, tag_id
        )

        response = query.execute()
        rows = response.data or []
        total = sum(float(r[TRANSACTIONS_COLUMNS.AMOUNT.value]) for r in rows)

        return TransactionSummaryResponse(
            success=True,
            message="Transaction summary retrieved successfully",
            count=len(rows),
            total_amount=total,
        )

    except Exception as e:
        logger.error(f"Transaction summary query failed: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve transaction summary",
        )


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
    savings_fund_id: Optional[str] = Query(None, description="Savings Fund ID for filtering transactions"),
    search: Optional[str] = Query(None, description="Search term for filtering transactions by notes"),
    category_type: Optional[str] = Query(None, description="Filter by category type (income, expense, etc)"),
    min_amount: Optional[float] = Query(None, description="Filter by minimum amount value"),
    max_amount: Optional[float] = Query(None, description="Filter by maximum amount value"),
    tag_id: Optional[str] = Query(None, description="Filter by tag ID"),
    limit: Optional[int] = Query(100, ge=1, le=1000, description="Number of items to return (max 1000)"),
    offset: Optional[int] = Query(0, ge=0, description="Number of items to skip")
) -> TransactionsResponse:
    """
    Get all transactions with optional filtering and pagination.

    Returns transactions ordered by date (most recent first).
    """

    try:
        user_supabase_client = get_db_client(user["access_token"])

        transaction_fields = ",".join([
            TRANSACTIONS_COLUMNS.ID.value,
            TRANSACTIONS_COLUMNS.USER_ID.value,
            TRANSACTIONS_COLUMNS.ACCOUNT_ID.value,
            TRANSACTIONS_COLUMNS.CATEGORY_ID.value,
            TRANSACTIONS_COLUMNS.AMOUNT.value,
            TRANSACTIONS_COLUMNS.DATE.value,
            TRANSACTIONS_COLUMNS.NOTES.value,
            TRANSACTIONS_COLUMNS.CREATED_AT.value,
            TRANSACTIONS_COLUMNS.SAVINGS_FUND_ID.value
        ])

        # Always embed tags (left join — returns [] when none)
        tags_embed = "fct_transaction_tags(tag_id_fk,dim_tags(tags_id_pk,tag_name))"

        needs_type_filter = bool(category_type)
        needs_tag_filter = bool(tag_id)

        if needs_type_filter and needs_tag_filter:
            select_str = f"{transaction_fields}, dim_categories_users!inner(type), fct_transaction_tags!inner(tag_id_fk,dim_tags(tags_id_pk,tag_name))"
        elif needs_type_filter:
            select_str = f"{transaction_fields}, dim_categories_users!inner(type), {tags_embed}"
        elif needs_tag_filter:
            select_str = f"{transaction_fields}, fct_transaction_tags!inner(tag_id_fk,dim_tags(tags_id_pk,tag_name))"
        else:
            select_str = f"{transaction_fields}, {tags_embed}"

        query = user_supabase_client.table("fct_transactions").select(select_str)

        if transaction_id:
            query = query.eq(TRANSACTIONS_COLUMNS.ID.value, transaction_id)

        query = _apply_common_filters(
            query, start_date, end_date, category_id, account_id,
            savings_fund_id, category_type, min_amount, max_amount, search, tag_id
        )

        query = query.order(TRANSACTIONS_COLUMNS.DATE.value, desc=True)

        if limit is not None and offset is not None:
            query = query.range(offset, offset + limit)

        response = query.execute()
        response_data = response.data or []

        return TransactionsResponse(
            data=[_build_transaction_data(item) for item in response_data],
            count=len(response_data),
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


def _sync_transaction_tags(client, transaction_id: str, tag_ids: List[int], user_id: str) -> None:
    """Replace junction rows for a transaction with the given tag_ids."""
    client.table("fct_transaction_tags").delete().eq(
        TRANSACTION_TAGS_COLUMNS.TRANSACTION_ID.value, transaction_id
    ).execute()

    if tag_ids:
        rows = [
            {
                TRANSACTION_TAGS_COLUMNS.TRANSACTION_ID.value: transaction_id,
                TRANSACTION_TAGS_COLUMNS.TAG_ID.value: tid,
                TRANSACTION_TAGS_COLUMNS.USER_ID.value: user_id,
            }
            for tid in tag_ids
        ]
        client.table("fct_transaction_tags").insert(rows).execute()


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
        tag_ids: List[int] = data.pop("tags") or []
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

        if response.data and tag_ids:
            new_id = response.data[0][TRANSACTIONS_COLUMNS.ID.value]
            _sync_transaction_tags(user_supabase_client, new_id, tag_ids, user["user_id"])

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
        tag_ids: List[int] = data.pop("tags") or []
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

        _sync_transaction_tags(user_supabase_client, transaction_id, tag_ids, user["user_id"])

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

        user_supabase_client.table("fct_transactions").delete().eq(TRANSACTIONS_COLUMNS.ID.value, transaction_id).execute()

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
