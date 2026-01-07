# fastapi
import fastapi
from fastapi import APIRouter, Depends, status, Request

# auth dependencies
from ..auth.auth import api_key_auth
from ..schemas.endpoint_schemas import LoginResponse, UserData, LoginRequest

# rate limiting
from ..helper.rate_limiter import limiter, RATE_LIMITS

# Load environment variables
from ..helper import environment as env

# logging
import logging

# supabase client
from supabase.client import create_client, Client

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

#? /auth

@router.post("/login", response_model=LoginResponse)
@limiter.limit(RATE_LIMITS["login"])
async def login(
    request: Request,
    credentials: LoginRequest,
    api_key: str = Depends(api_key_auth)
) -> LoginResponse:

    try:
        supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)

        response = supabase_client.auth.sign_in_with_password(
            {"email": credentials.email,
            "password": credentials.password}
        )

        if response.session is None or response.user is None:
            raise fastapi.HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        return LoginResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            user_id=response.user.id,
            data=dict(response)
        )
            
    except Exception as e:
        logger.error(f"Login failed")
        logger.info(f"Login failed with error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server error: {str(e)}"
        )

@router.post("/register", response_model=LoginResponse)
@limiter.limit(RATE_LIMITS["auth"])
async def register(
    request: Request,
    user_data: UserData,
    api_key: str = Depends(api_key_auth)
) -> LoginResponse:

    try:
        supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)

        if user_data.full_name == None:
            full_name = None
        else:
            full_name = user_data.full_name

        response = supabase_client.auth.sign_up(
            {"email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "full_name": full_name
                }
            }}
        )

        if response.session is None or response.user is None:
            raise fastapi.HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        return LoginResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            user_id=response.user.id,
            data=dict(response)
        )
    
    except Exception as e:
        logger.error(f"Registration failed")
        logger.info(f"Registration failed with error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server error"
        )
