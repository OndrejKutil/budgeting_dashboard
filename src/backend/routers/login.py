# fastapi
import fastapi
from fastapi import APIRouter, Depends, status

# auth dependencies
from auth.auth import api_key_auth, login_key_auth

# Load environment variables
import helper.environment as env

# logging
import logging

# supabase client
from supabase import create_client, Client

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

#? /login

@router.post("/login")
async def login(
    api_key: str = Depends(api_key_auth),
    login: dict[str, str] = Depends(login_key_auth)
):
    
    try:
        supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)

        response = supabase_client.auth.sign_in_with_password(
            {"email": login["email"],
            "password": login["password"]}
        )

        return {
            "data": response
        }
    
    except Exception as e:
        logger.error(f"Login failed")
        logger.info(f"Login failed with error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server error: {str(e)}"
        )

@router.post("/register")
async def register(
    api_key: str = Depends(api_key_auth),
    register: dict[str, str] = Depends(login_key_auth)
):
    
    try:
        supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)

        if register.get("full_name") == "None":
            full_name = None
        else:
            full_name = register.get("full_name")

        response = supabase_client.auth.sign_up(
            {"email": register.get("email"),
            "password": register.get("password"),
            "options": {
                "data": {
                    "full_name": full_name
                }
            }}
        )

        return {
            "data": response
        }
    
    except Exception as e:
        logger.error(f"Registration failed")
        logger.info(f"Registration failed with error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server error"
        )
