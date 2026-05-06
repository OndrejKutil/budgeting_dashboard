from supabase.client import create_client, Client, ClientOptions
from typing import Optional
from ..helper import environment as env
import logging

# Create logger for this module
logger = logging.getLogger(__name__)

_BASE_CLIENT: Optional[Client] = None
_BASE_OPTIONS = ClientOptions(
    auto_refresh_token=False,
    persist_session=False
)

def get_db_client(access_token: Optional[str] = None) -> Client:
    """
    Create and return a Supabase client.
    
    Args:
        access_token: Optional access token for authentication. 
                      If provided, the client will be authenticated with this token.
                      If not provided, the client will use the anonymous key (public access).
    
    Returns:
        Client: Authenticated (or anonymous) Supabase client
        
    Raises:
        EnvironmentError: If environment variables are missing
    """
    project_url = env.PROJECT_URL
    anon_key = env.ANON_KEY
    
    if not project_url or not anon_key:
        logger.error('Environment variables PROJECT_URL or ANON_KEY are not set.')
        raise EnvironmentError('Missing environment variables for database connection.')
    
    # Reuse a base, anonymous client to avoid re-initializing config each request.
    # Authenticated requests use a request-scoped client with per-request headers.
    global _BASE_CLIENT
    if _BASE_CLIENT is None:
        _BASE_CLIENT = create_client(project_url, anon_key, options=_BASE_OPTIONS)

    if not access_token:
        return _BASE_CLIENT

    auth_headers = {"Authorization": f"Bearer {access_token}"}
    auth_options = ClientOptions(
        auto_refresh_token=False,
        persist_session=False,
        headers=auth_headers
    )
    return create_client(project_url, anon_key, options=auth_options)
