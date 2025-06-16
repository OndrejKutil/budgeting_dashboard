from fastapi import HTTPException, Depends, status
from fastapi.security import APIKeyHeader

import os
from dotenv import load_dotenv

import logging

# set up logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv("src/.env")
API_KEY = os.getenv("API_KEY")
PROJECT_URL = os.getenv("PROJECT_URL")
ANON_KEY = os.getenv("ANON_KEY")

api_key_header = APIKeyHeader(name="X-API-KEY", auto_error=False)
supabase_token_header = APIKeyHeader(name="Authorization", auto_error=False)


async def api_key_auth(api_key: str = Depends(api_key_header)) -> str:
    """
    Dependency to check for API key in request headers.
    Raises HTTPException if API key is missing or invalid.
    Returns the validated API key.
    """
    if not api_key:
        logger.warning("API key authentication failed: missing key")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="API key is missing",
        )
    
    if api_key != API_KEY:
        logger.warning("API key authentication failed: invalid key")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Invalid API key"
        )
    
    logger.info("API key authentication successful")
    return api_key
    

async def get_supabase_access_token(
    authorization: str = Depends(supabase_token_header)
) -> str:
    """
    Dependency to check if Supabase access token is present in request headers.
    Just checks format, doesn't verify the token.
    Returns the token string if present and properly formatted.
    """
    if not authorization:
        logger.warning("Supabase token authentication failed: missing token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token is missing",
        )
    
    # Check Bearer format
    if not authorization.startswith("Bearer "):
        logger.warning("Supabase token authentication failed: invalid format")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token format. Use 'Bearer <token>'",
        )
    
    token = authorization.split(" ")[1]
    
    # Just check if token exists and has some content
    if not token or len(token.strip()) == 0:
        logger.warning("Supabase token authentication failed: empty token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty access token",
        )
    
    logger.info("Supabase token present and formatted correctly")
    return token