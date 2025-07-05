# general
import os
from dotenv import load_dotenv

# fastapi
import fastapi
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

# logging
import logging

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================


# set up logging
log_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend.log')

# Configure logging with different levels for console and file
# Remove any existing handlers
for handler in logging.root.handlers[:]:
    logging.root.removeHandler(handler)

# Create formatter
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# File handler - logs everything (DEBUG and above)
file_handler = logging.FileHandler(log_file_path, mode='w')
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(formatter)

# Console handler - only warnings and above
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.WARNING)
console_handler.setFormatter(formatter)

# Configure root logger
root_logger = logging.getLogger()
root_logger.setLevel(logging.DEBUG)  # Set to lowest level to capture everything
root_logger.addHandler(file_handler)
root_logger.addHandler(console_handler)

# Create logger for this module
logger = logging.getLogger(__name__)
logger.info("Starting backend server...")
logger.info(f"Log file path: {log_file_path}")

# Import auth functions after logging is configured
from auth.auth import api_key_auth, admin_key_auth

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
from routers import transactions, token_refresh, categories, accounts, profile, summary

app.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
app.include_router(token_refresh.router, prefix="/refresh", tags=["Token refresh"])
app.include_router(categories.router, prefix="/categories", tags=["Categories"])
app.include_router(accounts.router, prefix="/accounts", tags=["Accounts"])
app.include_router(profile.router, prefix="/profile", tags=["Profile"])
app.include_router(summary.router, prefix="/summary", tags=["Summary"])



# ================================================================================================
#                                       Root API Endpoints
# ================================================================================================


@app.get("/")
async def root():
    return {"message": "Backend server is running!"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/version")
async def get_version():
    return {"version": "1.0.0", "description": "Budgeting Dashboard Backend Server"}


@app.get("/log")
async def get_log(
    api_key: str = Depends(api_key_auth),
    admin_key: str = Depends(admin_key_auth)
):
    """
    Endpoint to retrieve the backend server log file.
    This can be useful for debugging or monitoring server activity.
    """
    try:
        with open(log_file_path, 'r') as log_file:
            log_content = log_file.read()
        logger.info("Log file accessed successfully")
        return {"logs": log_content}
    except Exception as e:
        logger.info(f"Failed to read log file with detailed error: {str(e)}")
        logger.info(f"Log file path attempted: {log_file_path}")
        logger.error("Failed to read log file")
        
        raise fastapi.HTTPException(
            status_code=500,
            detail="Failed to read log file."
        )


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
