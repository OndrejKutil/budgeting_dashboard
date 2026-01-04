from fastapi import HTTPException, Depends, status
from fastapi.security import APIKeyHeader

from ..schemas.endpoint_schemas import UserData

from typing import Dict

import logging

import jwt
from jwt import PyJWTError

import pprint

from ..helper import environment as env

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# set up logging
logger = logging.getLogger(__name__)

# Ensure logger inherits from root logger configuration
# This will be configured by backend_server.py
logger.setLevel(logging.INFO)



API_KEY: str | None = env.API_KEY
PROJECT_URL: str | None = env.PROJECT_URL
ANON_KEY: str | None = env.ANON_KEY
SUPABASE_JWT_SECRET: str | None = env.SUPABASE_JWT_SECRET
ADMIN_KEY: str | None = env.ADMIN_KEY

api_key_header = APIKeyHeader(name="X-API-KEY", auto_error=False, scheme_name="API Key")
supabase_refresh_token_header = APIKeyHeader(name="X-Refresh-Token", auto_error=False, scheme_name="Refresh Token")
authorization_header = APIKeyHeader(name="Authorization", auto_error=False, scheme_name="Bearer Token")
admin_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False, scheme_name="Admin Key")
login_header = APIKeyHeader(name="X-Login", auto_error=False, scheme_name="Login Key")


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
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="API key is missing",
        )
    
    if api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
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

    except jwt.ExpiredSignatureError as e:
        logger.error(f"JWT token expired")
        logger.info(f"Error details: {e}")
        raise HTTPException(
            status_code=498,  # Custom status code for token expired
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer", "X-Token-Status": "expired"}
        )
    except (PyJWTError, jwt.InvalidTokenError) as e:
        logger.error(f"JWT validation error")
        logger.info(f"Error details: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:        
        return {
            "user_id": payload["sub"], 
            "email": payload.get("email"),
            "access_token": access_token
        }
    except Exception as e:
        logger.error(f"Error decoding JWT payload")
        logger.info(f"Error details: {e}\n Payload: {pprint.pformat(payload)}")
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
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Admin key is missing",
        )
    
    if admin_key != ADMIN_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid Admin key"
        )

    return admin_key


# ================================================================================================
#                                   Login Key Authentication
# ================================================================================================

async def login_key_auth(login_key: str = Depends(login_header)) -> UserData:
    """
    Dependency to check for Login key in request headers.
    Raises HTTPException if Login key is missing or invalid.
    Returns the validated Login key.
    """
    if not login_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Login key is missing",
        )

    email, password, full_name = login_key.split("&&&")

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid Login key format. Expected 'email&&&password&&&full_name'."
        )
    
    return UserData(
        email=email,
        password=password,
        full_name=full_name
    )