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

# supabase client
from ..data.database import get_db_client

# schemas
from ..schemas.base import ProfileData
from ..schemas.responses import ProfileResponse
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
            
        if not metadata_update:
             # Nothing to update, fetch current profile and return
            user_profile = user_supabase_client.auth.get_user(user["access_token"])
            if user_profile and user_profile.user:
                 return ProfileResponse(
                    data=_build_profile_data(user_profile.user), 
                    success=True, 
                    message="No changes provided"
                )

        # Update user metadata in Supabase Auth
        update_attributes = {"data": metadata_update}
        updated_user = user_supabase_client.auth.update_user(update_attributes)
        
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
        logger.error(f"Profile update failed for user_id: {user['user_id']}")
        logger.error(f"Full error details: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile"
        )
