# fastapi
import fastapi
from fastapi import APIRouter, Depends, status, Request

# auth dependencies
from ..auth.auth import api_key_auth, get_supabase_refresh_token

# rate limiting
from ..helper.rate_limiter import limiter, RATE_LIMITS

# Load environment variables
from ..helper import environment as env

# logging
import logging

# supabase client
from ..data.database import get_db_client, Client

# schemas
from ..schemas.responses import RefreshTokenResponse
from ..schemas.base import TokenData


# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# Load environment variables
# Load environment variables

# Create logger for this module
logger = logging.getLogger(__name__)

# ================================================================================================
#                                   Router Configuration
# ================================================================================================

router = APIRouter()

#? This router prefix is /refresh

@router.post("/", response_model=RefreshTokenResponse)
@limiter.limit(RATE_LIMITS["auth"])
async def refresh_access_token(
    request: Request,
    api_key: str = Depends(api_key_auth),
    refresh_token: str = Depends(get_supabase_refresh_token)
) -> RefreshTokenResponse:
    """
    Refresh the access token using the refresh token.
    
    Frontend should call this endpoint when the access token expires.
    Returns new user and session information.
    """
    
    # Create a fresh client for token refresh
    refresh_supabase_client: Client = get_db_client()
    
    try:
        # Use the refresh token to get new tokens
        response = refresh_supabase_client.auth.refresh_session(refresh_token)
        
        if response:
            logger.info("Successfully refreshed user session")
            
            # Convert Supabase objects to dictionaries for JSON serialization
            user_dict = response.user.model_dump() if response.user else None
            session_dict = response.session.model_dump() if response.session else None
            
            # Create TokenData object
            token_data = TokenData(
                access_token=session_dict["access_token"],
                refresh_token=session_dict["refresh_token"],
                user_id=user_dict["id"]
            )

            return RefreshTokenResponse(
                data=token_data,
                user=user_dict,
                session=session_dict,
                success=True,
                message="Token refresh successful"
            )

        else:
            logger.warning("Failed to refresh session - no session returned")
            raise fastapi.HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to refresh session. Please log in again."
            )
    
    except fastapi.HTTPException:
        # Re-raise HTTP exceptions
        raise
    
    except Exception as e:
        logger.error(f"Token refresh failed: {str(e)}")
        
        # Handle specific refresh errors
        if "refresh_token_not_found" in str(e) or "Invalid refresh token" in str(e):
            logger.warning("Invalid refresh token provided")
            raise fastapi.HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token. Please log in again."
            )
        
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed. Please try again."
        )
    
    finally:
        # Client cleanup is handled by Python garbage collection
        # Do NOT call sign_out() here as it invalidates the session we just created
        pass