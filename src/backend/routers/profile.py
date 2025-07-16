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
            "id": getattr(user_data, 'id', None),
            "aud": getattr(user_data, 'aud', None),
            "role": getattr(user_data, 'role', None),
            "is_anonymous": getattr(user_data, 'is_anonymous', False),
            
            # Email information
            "email": getattr(user_data, 'email', None),
            "email_confirmed_at": getattr(user_data, 'email_confirmed_at', None),
            "email_change_sent_at": getattr(user_data, 'email_change_sent_at', None),
            "new_email": getattr(user_data, 'new_email', None),
            
            # Phone information
            "phone": getattr(user_data, 'phone', ""),
            "phone_confirmed_at": getattr(user_data, 'phone_confirmed_at', None),
            "new_phone": getattr(user_data, 'new_phone', None),
            
            # Authentication timestamps
            "created_at": getattr(user_data, 'created_at', None),
            "updated_at": getattr(user_data, 'updated_at', None),
            "last_sign_in_at": getattr(user_data, 'last_sign_in_at', None),
            "confirmed_at": getattr(user_data, 'confirmed_at', None),
            "confirmation_sent_at": getattr(user_data, 'confirmation_sent_at', None),
            "recovery_sent_at": getattr(user_data, 'recovery_sent_at', None),
            "invited_at": getattr(user_data, 'invited_at', None),
            
            # Metadata
            "app_metadata": getattr(user_data, 'app_metadata', {}),
            "user_metadata": getattr(user_data, 'user_metadata', {}),
            
            # Identity and security
            "identities": [
                {
                    "id": getattr(identity, 'id', None),
                    "identity_id": getattr(identity, 'identity_id', None),
                    "user_id": getattr(identity, 'user_id', None),
                    "provider": getattr(identity, 'provider', None),
                    "identity_data": getattr(identity, 'identity_data', {}),
                    "created_at": getattr(identity, 'created_at', None),
                    "last_sign_in_at": getattr(identity, 'last_sign_in_at', None),
                    "updated_at": getattr(identity, 'updated_at', None)
                } for identity in (getattr(user_data, 'identities', []) or [])
            ],
            "factors": getattr(user_data, 'factors', None),
            "action_link": getattr(user_data, 'action_link', None),
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
