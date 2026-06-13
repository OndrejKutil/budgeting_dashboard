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
import httpx

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

    except fastapi.HTTPException:
        raise
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

        full_name = user_data.full_name or None

        response = supabase_client.auth.sign_up(
            {"email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "full_name": full_name
                }
            }}
        )

        if response.user is None:
            raise fastapi.HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed. Please try again."
            )

        # Supabase returns session=None when email confirmation is required
        if response.session is None:
            raise fastapi.HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Please check your email to confirm your account before signing in."
            )

        return LoginResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            user_id=response.user.id,
            data=dict(response)
        )

    except fastapi.HTTPException:
        raise
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
        
        reset_redirect = f"{_get_frontend_url()}/auth/reset-password"
        
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
        
        # Update the user's password using the access token from the reset link.
        # Supabase will validate the token; if it is invalid or expired, this call will fail.
        supabase_client.auth.update_user(
            {"password": body.new_password},
            access_token=body.access_token,
        )
        
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

def _get_frontend_url() -> str:
    urls = env.FRONTEND_URL
    return urls[0] if urls else "http://localhost:8080"


def _get_oauth_callback_url() -> str:
    return f"{_get_frontend_url()}/auth/callback"


def _get_link_callback_url(provider: str) -> str:
    return f"{_get_frontend_url()}/dashboard/profile?linked={provider}"


async def _get_link_identity_url(provider: str, access_token: str) -> str:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{env.PROJECT_URL}/auth/v1/user/identities/authorize",
            params={
                "provider": provider,
                "redirect_to": _get_link_callback_url(provider),
                "skip_http_redirect": "true",
            },
            headers={
                "apikey": env.ANON_KEY,
                "Authorization": f"Bearer {access_token}",
            },
        )

    try:
        data = response.json()
    except ValueError:
        data = {}

    if response.status_code >= 400:
        detail = data.get("msg") or data.get("message") or data.get("error_description") or data.get("error") or response.text
        raise fastapi.HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Supabase identity linking failed: {detail}"
        )

    link_url = data.get("url")
    if not isinstance(link_url, str) or not link_url:
        raise fastapi.HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Supabase identity linking did not return an OAuth URL"
        )

    return link_url


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
        
        # Get the OAuth URL from Supabase
        response = supabase_client.auth.sign_in_with_oauth({
            "provider": "github",
            "options": {
                "redirect_to": _get_oauth_callback_url()
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


@router.get("/oauth/google", response_model=OAuthUrlResponse)
@limiter.limit(RATE_LIMITS["auth"])
async def get_google_oauth_url(
    request: Request,
    api_key: str = Depends(api_key_auth)
) -> OAuthUrlResponse:
    """
    Get Google OAuth authorization URL.
    Frontend should redirect the user to this URL to initiate OAuth flow.
    """
    try:
        supabase_client: Client = get_db_client()

        response = supabase_client.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {
                "redirect_to": _get_oauth_callback_url()
            }
        })

        return OAuthUrlResponse(
            url=response.url,
            provider="google"
        )

    except Exception as e:
        logger.error(f"Failed to get Google OAuth URL")
        logger.info(f"Google OAuth URL error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize Google login"
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
        link_url = await _get_link_identity_url("github", current_user["access_token"])
        
        return OAuthUrlResponse(
            url=link_url,
            provider="github"
        )
        
    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get GitHub link URL")
        logger.info(f"GitHub link error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize GitHub account linking"
        )


@router.post("/oauth/link-google", response_model=OAuthUrlResponse)
@limiter.limit(RATE_LIMITS["auth"])
async def link_google_account(
    request: Request,
    api_key: str = Depends(api_key_auth),
    current_user: dict = Depends(get_current_user)
) -> OAuthUrlResponse:
    """
    Get Google OAuth URL for linking to an existing account.
    Requires user to be authenticated. After Google auth, account will be linked.
    """
    try:
        link_url = await _get_link_identity_url("google", current_user["access_token"])

        return OAuthUrlResponse(
            url=link_url,
            provider="google"
        )

    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get Google link URL")
        logger.info(f"Google link error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize Google account linking"
        )
