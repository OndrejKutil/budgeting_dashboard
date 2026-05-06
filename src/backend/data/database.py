from supabase.client import create_client, Client, ClientOptions
from typing import Optional
from ..helper import environment as env
import logging

# Create logger for this module
logger = logging.getLogger(__name__)

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
    
    # Disable auto_refresh_token - the frontend is responsible for token refresh
    # This prevents the backend from rotating tokens without the frontend knowing
    options = ClientOptions(
        auto_refresh_token=False,
        persist_session=False
    )
    
    client: Client = create_client(project_url, anon_key, options=options)
    
    if access_token:
        try:
            client.postgrest.auth(access_token)
        except AttributeError:
             # Fallback if postgrest attribute is missing or different in this version
             # Try setting header directly if possible, or log warning
             logger.warning("client.postgrest.auth failed with AttributeError, attempting fallback")
             if hasattr(client, "options") and hasattr(client.options, "headers"):
                 client.options.headers.update({"Authorization": f"Bearer {access_token}"})
             else:
                 # If we can't set auth, we should probably raise to avoid security issues
                 # or returning public data when private data is expected.
                 logger.error("Could not set authentication on Supabase client")
                 raise
        except Exception as e:
            logger.error(f"Failed to set authentication token: {str(e)}")
            raise
        
    return client
