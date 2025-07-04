from fastapi import HTTPException, Depends, status, Request
from fastapi.security import APIKeyHeader

import os
from dotenv import load_dotenv

import logging

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# set up logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
API_KEY = os.getenv("API_KEY")
PROJECT_URL = os.getenv("PROJECT_URL")
ANON_KEY = os.getenv("ANON_KEY")

api_key_header = APIKeyHeader(name="X-API-KEY", auto_error=False)
supabase_token_header = APIKeyHeader(name="X-Access-Token", auto_error=False)
supabase_refresh_token_header = APIKeyHeader(name="X-Refresh-Token", auto_error=False)


# ================================================================================================
#                                   API key
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

async def get_supabase_access_token(
    authorization: str = Depends(supabase_token_header)
) -> str:
    """
    Dependency to check if Supabase access token is present in request headers.
    Just checks format, doesn't verify the token.
    Returns the token string if present and properly formatted.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token is missing",
        )
    
    # Check Bearer format
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token format. Use 'Bearer <token>'",
        )
    
    if access_token.startswith("Bearer "):
        token = access_token.split(" ")[1]
    else:
        # Direct token without Bearer prefix
        token = acess_token
    
    # Just check if token exists and has some content
    if not token or len(token.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty access token",
        )
    
    return token


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
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is missing",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Check if it's in Bearer format (optional, depends on your frontend implementation)
    if refresh_token.startswith("Bearer "):
        token = refresh_token.split(" ")[1]
    else:
        # Direct token without Bearer prefix
        token = refresh_token
    
    # Check if token exists and has some content
    if not token or len(token.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty refresh token"
        )
    
    return token
    
    
def get_current_user(request: Request):
    """Extract and decode JWT from Authorization header"""
    auth = request.headers.get("Authorization")
    
    if auth.startswith("Bearer "):
        token = auth.split(" ")[1]
    else:
        token = auth

    try:
        # Decode the JWT (optional: validate issuer, expiry, etc.)
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
        return {
            "user_id": payload["sub"],  # Supabase uses `sub` as the user ID
            "email": payload.get("email"),
            "access_token": token
        }
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired access token")