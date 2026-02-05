# fastapi
import fastapi
from fastapi import APIRouter, Depends, status, Request

# auth dependencies
from ..auth.auth import api_key_auth, get_current_user
from ..schemas.base import UserData
from ..schemas.requests import LoginRequest, ForgotPasswordRequest, ResetPasswordRequest
from ..schemas.responses import LoginResponse, MessageResponse, OAuthUrlResponse

# rate limiting
from ..helper.rate_limiter import limiter, RATE_LIMITS

# Load environment variables
from ..helper import environment as env
from ..data.database import get_db_client

# logging
import logging

# supabase client
from supabase.client import create_client, Client

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# Load environment variables

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
        supabase_client: Client = get_db_client()

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
        supabase_client: Client = get_db_client()

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


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit(RATE_LIMITS["auth"])
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    api_key: str = Depends(api_key_auth)
) -> MessageResponse:
    """
    Send password reset email to user.
    Uses Supabase Auth to send a magic link for password reset.
    """
    try:
        supabase_client: Client = get_db_client()
        
        # Get the redirect URL from environment or use default
        redirect_url = env.FRONTEND_URL or "http://localhost:8081"
        reset_redirect = f"{redirect_url}/auth/reset-password"
        
        # Request password reset email from Supabase
        supabase_client.auth.reset_password_email(
            body.email,
            options={"redirect_to": reset_redirect}
        )
        
        # Always return success to prevent email enumeration attacks
        return MessageResponse(
            success=True,
            message="If an account with that email exists, a password reset link has been sent."
        )
        
    except Exception as e:
        logger.error(f"Forgot password request failed")
        logger.info(f"Forgot password failed with error: {str(e)}")
        # Still return success to prevent email enumeration
        return MessageResponse(
            success=True,
            message="If an account with that email exists, a password reset link has been sent."
        )


@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit(RATE_LIMITS["auth"])
async def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    api_key: str = Depends(api_key_auth)
) -> MessageResponse:
    """
    Reset user password using access token from the reset email link.
    The access token is provided in the URL fragment when user clicks the reset link.
    """
    try:
        supabase_client: Client = get_db_client()
        
        # Set the session using the access token from the reset link
        # This validates the token and sets up the session
        session = supabase_client.auth.set_session(body.access_token, body.access_token)
        
        if not session or not session.user:
            raise fastapi.HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired reset token"
            )
        
        # Update the user's password
        supabase_client.auth.update_user({"password": body.new_password})
        
        return MessageResponse(
            success=True,
            message="Password has been reset successfully. You can now log in with your new password."
        )
        
    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset failed")
        logger.info(f"Password reset failed with error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to reset password. The reset link may have expired."
        )


# ================================================================================================
#                                   OAuth Endpoints
# ================================================================================================

@router.get("/oauth/github", response_model=OAuthUrlResponse)
@limiter.limit(RATE_LIMITS["auth"])
async def get_github_oauth_url(
    request: Request,
    api_key: str = Depends(api_key_auth)
) -> OAuthUrlResponse:
    """
    Get GitHub OAuth authorization URL.
    Frontend should redirect the user to this URL to initiate OAuth flow.
    """
    try:
        supabase_client: Client = get_db_client()
        
        # Get the redirect URL from environment or use default
        redirect_url = env.FRONTEND_URL or "http://localhost:8080"
        callback_url = f"{redirect_url}/auth/callback"
        
        # Get the OAuth URL from Supabase
        response = supabase_client.auth.sign_in_with_oauth({
            "provider": "github",
            "options": {
                "redirect_to": callback_url
            }
        })
        
        return OAuthUrlResponse(
            url=response.url,
            provider="github"
        )
        
    except Exception as e:
        logger.error(f"Failed to get GitHub OAuth URL")
        logger.info(f"GitHub OAuth URL error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize GitHub login"
        )


@router.post("/oauth/link-github", response_model=OAuthUrlResponse)
@limiter.limit(RATE_LIMITS["auth"])
async def link_github_account(
    request: Request,
    api_key: str = Depends(api_key_auth),
    current_user: dict = Depends(get_current_user)
) -> OAuthUrlResponse:
    """
    Get GitHub OAuth URL for linking to an existing account.
    Requires user to be authenticated. After GitHub auth, account will be linked.
    """
    try:
        supabase_client: Client = get_db_client()
        
        # Set the session from the current user's token
        supabase_client.auth.set_session(
            current_user["access_token"],
            current_user["access_token"]
        )
        
        # Get the redirect URL from environment or use default
        redirect_url = env.FRONTEND_URL or "http://localhost:8080"
        callback_url = f"{redirect_url}/dashboard/profile?linked=github"
        
        # Link identity - this will associate GitHub with the current user
        response = supabase_client.auth.link_identity({
            "provider": "github",
            "options": {
                "redirect_to": callback_url
            }
        })
        
        return OAuthUrlResponse(
            url=response.url,
            provider="github"
        )
        
    except Exception as e:
        logger.error(f"Failed to get GitHub link URL")
        logger.info(f"GitHub link error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize GitHub account linking"
        )
