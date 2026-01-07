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
from supabase.client import create_client, Client

# schemas
from ..schemas.endpoint_schemas import (
    ProfileResponse,
    ProfileData
)

# helper
from ..helper.calculations.profile_page_calc import _build_profile_data

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
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        user_supabase_client.postgrest.auth(user["access_token"])
        
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
