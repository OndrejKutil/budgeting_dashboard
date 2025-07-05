from fastapi import HTTPException, Depends, status
from fastapi.security import APIKeyHeader

import os
from dotenv import load_dotenv

import logging

import jwt
from jwt import PyJWTError

import pprint

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# set up logging
logger = logging.getLogger(__name__)

# Ensure logger inherits from root logger configuration
# This will be configured by backend_server.py
logger.setLevel(logging.INFO)

# Load environment variables
load_dotenv()
API_KEY: str = os.getenv("API_KEY")
PROJECT_URL: str = os.getenv("PROJECT_URL")
ANON_KEY: str = os.getenv("ANON_KEY")
SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET")
ADMIN_KEY: str = os.getenv("ADMIN_KEY")

api_key_header = APIKeyHeader(name="X-API-KEY", auto_error=False, scheme_name="API Key")
supabase_refresh_token_header = APIKeyHeader(name="X-Refresh-Token", auto_error=False, scheme_name="Refresh Token")
authorization_header = APIKeyHeader(name="Authorization", auto_error=False, scheme_name="Bearer Token")
admin_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False, scheme_name="Admin Key")


# ================================================================================================
#                                       API key
# ================================================================================================


async def api_key_auth(api_key: str = Depends(api_key_header)) -> str:
    """
    Dependency to check for API key in request headers.
    Raises HTTPException if API key is missing or invalid.
    Returns the validated API key.
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="API key is missing",
        )
    
    if api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Invalid API key"
        )

    return api_key

# ================================================================================================
#                                   SUPABASE keys
# ================================================================================================


async def get_supabase_refresh_token(
    refresh_token: str = Depends(supabase_refresh_token_header)
) -> str:
    """
    Dependency to retrieve Supabase refresh token from request headers.
    Just checks format, doesn't verify the token.
    Returns the token string if present and properly formatted.
    """

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty refresh token"
        )
    
    if refresh_token.startswith("Bearer "):
        token = refresh_token.split(" ")[1]
    else:
        # Direct token without Bearer prefix
        token = refresh_token
    
    return token
    

# ================================================================================================
#                                   JWT Authentication
# ================================================================================================

    
async def get_current_user(
        authorization: str = Depends(authorization_header)
):
    """Extract and decode JWT from Authorization header"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization header is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    

    if authorization.startswith("Bearer "):
        access_token = authorization.split(" ")[1]
    else:
        access_token = authorization

    try:
        # leeway allows for 30 seconds of clock difference between systems
        # options parameter disables audience verification since Supabase handles this
        payload = jwt.decode(
            access_token, 
            SUPABASE_JWT_SECRET, 
            algorithms=["HS256"],
            leeway=30,
            options={"verify_aud": False}
        )

        pprint.pprint(payload)

    except (PyJWTError, jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        logger.error(f"JWT validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    try:        
        return {
            "user_id": payload["sub"], 
            "email": payload.get("email"),
            "access_token": access_token
        }
    except PyJWTError:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error decoding supabase JWT payload")
    

# ================================================================================================
#                                   Admin Key Authentication
# ================================================================================================

async def admin_key_auth(admin_key: str = Depends(admin_key_header)) -> str:
    """
    Dependency to check for Admin key in request headers.
    Raises HTTPException if Admin key is missing or invalid.
    Returns the validated Admin key.
    """
    if not admin_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Admin key is missing",
        )
    
    if admin_key != ADMIN_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Invalid Admin key"
        )

    return admin_key