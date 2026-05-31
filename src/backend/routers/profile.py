# fastapi
import fastapi
from fastapi import APIRouter, Depends, status, Request

# auth dependencies
from ..auth.auth import api_key_auth, get_current_user

# rate limiting
from ..helper.rate_limiter import limiter, RATE_LIMITS

# Load environment variables
from ..helper import environment as env

# logging
import logging
import httpx

# supabase client
from ..data.database import get_db_client, get_service_db_client

# schemas
from ..schemas.base import ProfileData
from ..schemas.responses import MessageResponse, ProfileResponse
from ..schemas.requests import UpdateProfileRequest

# helper
from ..helper.calculations.profile_page_calc import _build_profile_data

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

USER_DATA_TABLES: tuple[tuple[str, str], ...] = (
    ("fct_transactions", "user_id_fk"),
    ("fct_budgets", "user_id_fk"),
    ("fct_dividend_portfolios", "user_id_fk"),
    ("dim_accounts", "user_id_fk"),
    ("dim_categories_users", "user_id_fk"),
    ("dim_savings_funds", "user_id_fk"),
)

#? This router prefix is /profile

@router.get("/me", response_model=ProfileResponse)
@limiter.limit(RATE_LIMITS["standard"])
async def get_my_profile(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> ProfileResponse:
    """
    Get the current user's profile information.
    """

    try:
        user_supabase_client = get_db_client(user["access_token"])
        
        # Get user information from the JWT token and Supabase auth
        user_profile = user_supabase_client.auth.get_user(user["access_token"])
        
        if user_profile is None or user_profile.user is None:
            logger.warning(f"User profile fetch returned None for user_id: {user['user_id']}")
            raise fastapi.HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="User profile not found"
            )

        if not user_profile.user:
            logger.warning(f"User profile not found for user_id: {user['user_id']}")
            raise fastapi.HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="User profile not found"
            )
        
        profile_data : ProfileData = _build_profile_data(user_profile.user)
        
        
        return ProfileResponse(data=profile_data, success=True, message="User profile retrieved successfully")
    
    except fastapi.HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        error_str = str(e).lower()
        
        # Check if this is a token expiration/invalidation error from Supabase
        if "token is expired" in error_str or "invalid jwt" in error_str or "jwt expired" in error_str:
            logger.warning(f"Token expired/invalid for user_id: {user['user_id']}")
            raise fastapi.HTTPException(
                status_code=498,  # Token Expired - triggers frontend refresh
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer", "X-Token-Status": "expired"}
            )
        
        logger.info(f"Profile fetch failed for user_id: {user['user_id']}")
        logger.info(f"Full error details: {str(e)}")
        logger.error("Failed to fetch user profile")
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to fetch user profile"
        )


@router.put("/me", response_model=ProfileResponse)
@limiter.limit(RATE_LIMITS["standard"])
async def update_profile(
    request: Request,
    profile_update: UpdateProfileRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> ProfileResponse:
    """
    Update the current user's profile information.
    """
    try:
        # Import here to avoid circular dependency if placed at top
        from ..schemas.requests import UpdateProfileRequest
        
        if not isinstance(profile_update, UpdateProfileRequest):
             # This handle the pydantic validation error if passed directly
            pass

        user_supabase_client = get_db_client(user["access_token"])
        
        # Prepare metadata update
        metadata_update = {}
        if profile_update.full_name is not None:
            metadata_update["full_name"] = profile_update.full_name
        if profile_update.currency is not None:
            metadata_update["currency"] = profile_update.currency
        if profile_update.locale is not None:
            metadata_update["locale"] = profile_update.locale
            
        if not metadata_update:
             # Nothing to update, fetch current profile and return
            user_profile = user_supabase_client.auth.get_user(user["access_token"])
            if user_profile and user_profile.user:
                 return ProfileResponse(
                    data=_build_profile_data(user_profile.user), 
                    success=True, 
                    message="No changes provided"
                )

        user_profile = user_supabase_client.auth.get_user(user["access_token"])
        current_metadata = {}
        if user_profile and user_profile.user and user_profile.user.user_metadata:
            current_metadata = dict(user_profile.user.user_metadata)

        # Update user metadata in Supabase Auth. Use the REST endpoint directly because
        # supabase-py 1.0.4 requires internal session state for auth.update_user().
        update_attributes = {"data": {**current_metadata, **metadata_update}}
        async with httpx.AsyncClient(timeout=10.0) as client:
            update_response = await client.put(
                f"{env.PROJECT_URL}/auth/v1/user",
                json=update_attributes,
                headers={
                    "apikey": env.ANON_KEY,
                    "Authorization": f"Bearer {user['access_token']}",
                },
            )

        if update_response.status_code >= 400:
            raise RuntimeError(update_response.text)

        updated_user = user_supabase_client.auth.get_user(user["access_token"])
        
        if updated_user is None or updated_user.user is None:
             raise fastapi.HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user profile"
            )

        profile_data = _build_profile_data(updated_user.user)
        
        return ProfileResponse(
            data=profile_data, 
            success=True, 
            message="User profile updated successfully"
        )

    except fastapi.HTTPException:
        raise
    except Exception as e:
        error_str = str(e).lower()
        
        # Check if this is a token expiration/invalidation error from Supabase
        if "token is expired" in error_str or "invalid jwt" in error_str or "jwt expired" in error_str:
            logger.warning(f"Token expired/invalid for user_id: {user['user_id']}")
            raise fastapi.HTTPException(
                status_code=498,  # Token Expired - triggers frontend refresh
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer", "X-Token-Status": "expired"}
            )
        
        logger.error(f"Profile update failed for user_id: {user['user_id']}")
        logger.error(f"Full error details: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile"
        )


@router.delete("/me", response_model=MessageResponse)
@limiter.limit(RATE_LIMITS["write"])
async def delete_my_account(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
) -> MessageResponse:
    """
    Permanently delete the current user's application data and Supabase Auth account.
    Requires SERVICE_ROLE_KEY because Supabase Auth users cannot self-delete with an anon token.
    """
    try:
        service_client = get_service_db_client()
        user_id = user["user_id"]

        for table_name, user_column in USER_DATA_TABLES:
            service_client.table(table_name).delete().eq(user_column, user_id).execute()

        async with httpx.AsyncClient(timeout=10.0) as client:
            delete_response = await client.delete(
                f"{env.PROJECT_URL}/auth/v1/admin/users/{user_id}",
                headers={
                    "apikey": env.SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {env.SERVICE_ROLE_KEY}",
                },
            )

        if delete_response.status_code >= 400:
            raise RuntimeError(delete_response.text)

        return MessageResponse(
            success=True,
            message="Account and associated data deleted successfully"
        )

    except EnvironmentError:
        logger.error("Account deletion requested but SERVICE_ROLE_KEY is not configured")
        raise fastapi.HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Account deletion is not configured on this deployment"
        )
    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error(f"Account deletion failed for user_id: {user['user_id']}")
        logger.info(f"Full error details: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account"
        )
