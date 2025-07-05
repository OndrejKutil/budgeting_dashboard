# fastapi
import fastapi
from fastapi import APIRouter, Depends, status

# auth dependencies
from auth.auth import api_key_auth, get_current_user

# Load environment variables
import os
from dotenv import load_dotenv

# logging
import logging

# supabase client
from supabase import create_client, Client


# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# Load environment variables
load_dotenv()
PROJECT_URL: str = os.getenv("PROJECT_URL")
ANON_KEY: str = os.getenv("ANON_KEY")

# Create logger for this module
logger = logging.getLogger(__name__)


# ================================================================================================
#                                   Router Configuration
# ================================================================================================

router = APIRouter()

#? This router prefix is /profile

@router.get("/me")
async def get_my_profile(
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user)
):
    """
    Get the current user's profile information.
    """
    try:
        user_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
        
        user_supabase_client.postgrest.auth(user["access_token"])
        
        # Get user information from the JWT token and Supabase auth
        # We'll use the user info already available from the token
        user_profile = user_supabase_client.auth.get_user(user["access_token"])
        
        if not user_profile.user:
            logger.warning(f"User profile not found for user_id: {user['user_id']}")
            raise fastapi.HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="User profile not found"
            )
        
        user_data = user_profile.user
        
        # Format the response with comprehensive user data
        profile_data = {
            # Core identity
            "id": user_data.id,
            "aud": user_data.aud,
            "role": user_data.role,
            "is_anonymous": user_data.is_anonymous,
            
            # Email information
            "email": user_data.email,
            "email_confirmed_at": user_data.email_confirmed_at,
            "email_change_sent_at": user_data.email_change_sent_at,
            "new_email": user_data.new_email,
            
            # Phone information
            "phone": user_data.phone,
            "phone_confirmed_at": user_data.phone_confirmed_at,
            "new_phone": user_data.new_phone,
            
            # Authentication timestamps
            "created_at": user_data.created_at,
            "updated_at": user_data.updated_at,
            "last_sign_in_at": user_data.last_sign_in_at,
            "confirmed_at": user_data.confirmed_at,
            "confirmation_sent_at": user_data.confirmation_sent_at,
            "recovery_sent_at": user_data.recovery_sent_at,
            "invited_at": user_data.invited_at,
            
            # Metadata
            "app_metadata": user_data.app_metadata,
            "user_metadata": user_data.user_metadata,
            
            # Identity and security
            "identities": [
                {
                    "id": identity.id,
                    "identity_id": identity.identity_id,
                    "user_id": identity.user_id,
                    "provider": identity.provider,
                    "identity_data": identity.identity_data,
                    "created_at": identity.created_at,
                    "last_sign_in_at": identity.last_sign_in_at,
                    "updated_at": identity.updated_at
                } for identity in (user_data.identities or [])
            ],
            "factors": user_data.factors,
            "action_link": user_data.action_link,
        }
        
        return {
            "data": profile_data
        }
    
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
