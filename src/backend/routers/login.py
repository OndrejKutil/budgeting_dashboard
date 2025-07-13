# fastapi
import fastapi
from fastapi import APIRouter, Depends, Query, status

# auth dependencies
from auth.auth import api_key_auth, get_current_user, login_key_auth

# Load environment variables
import os
from dotenv import load_dotenv

# logging
import logging

# supabase client
from supabase import create_client, Client

# other
from typing import Optional

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

        response = supabase_client.auth.sign_up(
            {"email": register["email"],
            "password": register["password"]}
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
