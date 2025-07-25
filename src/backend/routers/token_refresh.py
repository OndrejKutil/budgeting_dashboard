# fastapi
import fastapi
from fastapi import APIRouter, Depends, status

# auth dependencies
from auth.auth import api_key_auth, get_supabase_refresh_token

# Load environment variables
import helper.environment as env

# logging
import logging

# supabase client
from supabase import create_client, Client

# helper
from schemas.endpoint_schemas import RefreshTokenResponse


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

#? This router prefix is /refresh

@router.post("/", response_model=RefreshTokenResponse)
async def refresh_access_token(
    api_key: str = Depends(api_key_auth),
    refresh_token: str = Depends(get_supabase_refresh_token)
):
    """
    Endpoint to refresh the access token using refresh token.
    Frontend should call this when access token expires.
    """
    
    # Create a fresh client for token refresh
    refresh_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
    
    try:
        # Use the refresh token to get new tokens
        response = refresh_supabase_client.auth.refresh_session(refresh_token)
        
        if response:
            logger.info("Successfully refreshed user session")
            
            # Convert Supabase objects to dictionaries for JSON serialization
            user_dict = response.user.model_dump() if response.user else None
            session_dict = response.session.model_dump() if response.session else None
            
            return {
                "user": user_dict,
                "session": session_dict
            }
        else:
            logger.warning("Failed to refresh session - no session returned")
            raise fastapi.HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to refresh session. Please log in again."
            )
    
    except Exception as e:
        logger.info(f"Token refresh failed with detailed error: {str(e)}")
        logger.error(f"Token refresh failed: {e}")
        
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
        # Clean up the refresh client
        try:
            refresh_supabase_client.auth.sign_out()
        except:
            pass