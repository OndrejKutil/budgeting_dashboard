# general
import os
from dotenv import load_dotenv

# fastapi
import fastapi
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from auth import api_key_auth, get_supabase_refresh_token, get_supabase_access_token

# logging
import logging

# supabase client
from supabase import create_client, Client


# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================


# set up logging
# Ensure log directory exists and create/overwrite log file
log_file_path = 'src/backend/backend.log'
os.makedirs(os.path.dirname(log_file_path), exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file_path, mode='w'),  # 'w' mode overwrites existing file
        # Removed StreamHandler() to prevent console output
    ]
)
# Create logger for this module
logger = logging.getLogger(__name__)
logger.info("Starting backend server...")


# Load environment variables
load_dotenv()
PROJECT_URL = os.getenv("PROJECT_URL")
ANON_KEY = os.getenv("ANON_KEY")

BACKEND_HOST = os.getenv("BACKEND_HOST")
BACKEND_PORT = int(os.getenv("BACKEND_PORT"))

# Initialize FastAPI app
app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from routers import all_data_router, month, years

app.include_router(all_data_router.router, prefix="/all-data", tags=["Transactions"])
app.include_router(month.router, prefix="/month", tags=["Months"])
app.include_router(years.router, prefix="/years", tags=["Years"])



# ================================================================================================
#                                       Root API Endpoints
# ================================================================================================


@app.get("/")
async def root():
    """
    Root endpoint to check if the server is running.
    """
    return {"message": "Backend server is running!"}


@app.get("/health")
async def health_check():
    """
    Health check endpoint to verify server status.
    """
    return {"status": "healthy"}

@app.get("/verification_check")
async def api_key_verification_check(
    api_key: str = Depends(api_key_auth)
):
    """
    Endpoint to verify API key.
    Returns a success message if the API key is valid.
    """
    return {"message": "API key is valid!"}


@app.post("/refresh-token")
async def refresh_access_token(
    api_key: str = Depends(api_key_auth),
    refresh_token: str = Depends(get_supabase_refresh_token)
):
    """
    Endpoint to refresh the access token using refresh token.
    Frontend should call this when access token expires.
    """
    
    # Create a fresh client for token refresh
    refresh_supabase_client: Client = create_client(PROJECT_URL, ANON_KEY)
    
    try:
        # Use the refresh token to get new tokens
        response = refresh_supabase_client.auth.refresh_session(refresh_token)
        
        if response.session:
            logger.info("Successfully refreshed user session")
            return {
                "success": True,
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_at": response.session.expires_at,
                "user": {
                    "id": response.user.id,
                    "email": response.user.email
                }
            }
        else:
            logger.warning("Failed to refresh session - no session returned")
            raise fastapi.HTTPException(
                status_code=401,
                detail="Failed to refresh session. Please log in again."
            )
    
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        logger.error(f"Refresh token (first 20 chars): {refresh_token[:20]}...")
        
        # Handle specific refresh errors
        if "refresh_token_not_found" in str(e) or "Invalid refresh token" in str(e):
            raise fastapi.HTTPException(
                status_code=401,
                detail="Invalid refresh token. Please log in again."
            )
        
        raise fastapi.HTTPException(
            status_code=500,
            detail="Token refresh failed. Please try again."
        )
    
    finally:
        # Clean up the refresh client
        try:
            refresh_supabase_client.auth.sign_out()
        except:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend_server:app",  # Use import string instead of app object
        host=BACKEND_HOST, 
        port=BACKEND_PORT,
        log_level="info",
        access_log=False,  # Disable access logs to avoid clutter
        reload=True  # Enable auto-reload for development
    )
