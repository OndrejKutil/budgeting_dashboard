# general
import os
from dotenv import load_dotenv

# fastapi
import fastapi
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

# logging
import logging

# supabase client
from supabase import create_client, Client


# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================


# set up logging
log_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend.log')

# Force configuration to override uvicorn's default logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file_path, mode='w'),  # 'w' mode overwrites existing file
        logging.StreamHandler()  # Console output
    ],
    force=True  # This forces the configuration even if handlers already exist
)
# Create logger for this module
logger = logging.getLogger(__name__)
logger.info("Starting backend server...")
logger.info(f"Log file path: {log_file_path}")

# Import auth functions after logging is configured
from auth.auth import api_key_auth, get_supabase_refresh_token, admin_key_auth

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
from routers import all_data_router

app.include_router(all_data_router.router, prefix="/all", tags=["All transactions"])


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


@app.get("/version")
async def get_version():
    """
    Endpoint to get the version of the backend server.
    This can be used for debugging or monitoring purposes.
    """
    return {"version": "1.0.0", "description": "Budgeting Dashboard Backend Server"}


@app.get("/log")
async def get_log():
    """
    Endpoint to retrieve the backend server log file.
    This can be useful for debugging or monitoring server activity.
    """
    try:
        with open(log_file_path, 'r') as log_file:
            log_content = log_file.read()
        return {"logs": log_content}
    except Exception as e:
        logger.error(f"Failed to read log file: {e}")
        raise fastapi.HTTPException(
            status_code=500,
            detail="Failed to read log file."
        )


# ================================================================================================
#                                       Token Refresh Endpoint
# ================================================================================================


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
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_at": response.session.expires_at,
                "user_id": response.user.id,
                "email": response.user.email
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



# ================================================================================================
#                                       Run the Server
# ================================================================================================


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend_server:app",
        host=BACKEND_HOST, 
        port=BACKEND_PORT,
        log_config=None
    )
