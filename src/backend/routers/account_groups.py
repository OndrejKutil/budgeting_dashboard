# fastapi
# logging
import logging

import fastapi
from fastapi import APIRouter, Depends, Request, status

# auth dependencies
from ..auth.auth import api_key_auth, get_current_user

# supabase client
from ..data.database import get_db_client

# helper
from ..helper.columns import ACCOUNT_GROUPS_COLUMNS

# rate limiting
from ..helper.rate_limiter import RATE_LIMITS, limiter
from ..schemas.base import AccountGroupData
from ..schemas.requests import AccountGroupRequest
from ..schemas.responses import AccountGroupsResponse, AccountGroupSuccessResponse

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# Create logger for this module
logger = logging.getLogger(__name__)

# ================================================================================================
#                                   Router Configuration
# ================================================================================================

router = APIRouter()

#? prefix - /account-groups

@router.get("/", response_model=AccountGroupsResponse)
@limiter.limit(RATE_LIMITS["read_only"])
async def get_all_account_groups(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> AccountGroupsResponse:

    try:
        user_supabase_client = get_db_client(user["access_token"])

        group_fields = ",".join([
            ACCOUNT_GROUPS_COLUMNS.ID.value,
            ACCOUNT_GROUPS_COLUMNS.USER_ID.value,
            ACCOUNT_GROUPS_COLUMNS.NAME.value,
            ACCOUNT_GROUPS_COLUMNS.CREATED_AT.value
        ])
        response = user_supabase_client.table("dim_account_groups").select(group_fields).execute()

        data = [AccountGroupData(**item) for item in response.data]

        return AccountGroupsResponse(
            data=data,
            count=len(data),
            success=True,
            message="Account groups fetched successfully"
        )

    except Exception as e:
        logger.info(f"Full error details: {str(e)}")
        logger.error("Failed to fetch account groups from database")

        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database query failed"
        )


@router.post("/", response_model=AccountGroupSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def create_account_group(
    request: Request,
    group_data: AccountGroupRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> AccountGroupSuccessResponse:

    try:
        user_supabase_client = get_db_client(user["access_token"])

        data: dict = group_data.model_dump()
        data[ACCOUNT_GROUPS_COLUMNS.USER_ID.value] = user["user_id"]

        response = user_supabase_client.table("dim_account_groups").insert(data).execute()

        return AccountGroupSuccessResponse(
            success=True,
            message="Account group created successfully",
            data=AccountGroupData(**response.data[0]) if response.data else None
        )

    except Exception as e:
        logger.info(f"Full error details: {str(e)}")
        logger.error("Account group creation failed")

        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create account group"
        )


@router.put("/{group_id}", response_model=AccountGroupSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def update_account_group(
    request: Request,
    group_id: str,
    group_data: AccountGroupRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> AccountGroupSuccessResponse:

    try:
        user_supabase_client = get_db_client(user["access_token"])

        data = group_data.model_dump()

        response = user_supabase_client.table("dim_account_groups").update(data).eq(
            ACCOUNT_GROUPS_COLUMNS.ID.value, group_id
        ).execute()

        return AccountGroupSuccessResponse(
            success=True,
            message="Account group updated successfully",
            data=AccountGroupData(**response.data[0]) if response.data else None
        )

    except Exception as e:
        logger.info(f"Account group update failed for group_id: {group_id}")
        logger.info(f"Full error details: {str(e)}")
        logger.error(f"Account group update failed for group {group_id}")

        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update account group"
        )


@router.delete("/{group_id}", response_model=AccountGroupSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def delete_account_group(
    request: Request,
    group_id: str,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> AccountGroupSuccessResponse:
    """
    Delete an account group by its ID.

    Member accounts are not deleted -- dim_accounts.account_group_id_fk references this table
    ON DELETE SET NULL, so members simply become ungrouped.
    """
    try:
        user_supabase_client = get_db_client(user["access_token"])

        user_supabase_client.table("dim_account_groups").delete().eq(
            ACCOUNT_GROUPS_COLUMNS.ID.value, group_id
        ).execute()

        return AccountGroupSuccessResponse(
            success=True,
            message=f"Account group {group_id} deleted successfully"
        )

    except Exception as e:
        logger.info(f"Account group deletion failed for group_id: {group_id}")
        logger.info(f"Full error details: {str(e)}")
        logger.error(f"Account group deletion failed for group {group_id}")

        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account group"
        )
