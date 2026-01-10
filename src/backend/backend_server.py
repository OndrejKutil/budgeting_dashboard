# general
import os

# fastapi
import fastapi
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# logging
import logging

# import env configuration
from .helper import environment as env

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================


# set up logging
log_file_path : str = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend.log')

# Configure logging with different levels for console and file
# Remove any existing handlers
for handler in logging.root.handlers[:]:
    logging.root.removeHandler(handler)

# Create formatter
formatter: logging.Formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# File handler - logs everything (DEBUG and above)
file_handler: logging.FileHandler = logging.FileHandler(log_file_path, mode='w')
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(formatter)

# Console handler - only warnings and above
console_handler: logging.StreamHandler = logging.StreamHandler()
console_handler.setLevel(logging.WARNING)
console_handler.setFormatter(formatter)

# Configure root logger
root_logger: logging.Logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
root_logger.addHandler(file_handler)
root_logger.addHandler(console_handler)

# Create logger for this module
logger: logging.Logger = logging.getLogger(__name__)
logger.info("Starting backend server...")
logger.info(f"Log file path: {log_file_path}")

# Import auth functions after logging is configured
from .auth.auth import api_key_auth, admin_key_auth

# Import rate limiter
from .helper.rate_limiter import limiter, RATE_LIMITS

PROJECT_URL: str = env.PROJECT_URL
ANON_KEY: str = env.ANON_KEY

FRONTEND_URL: str = env.FRONTEND_URL

# Initialize FastAPI app
app : FastAPI = FastAPI()



# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Include routers
from .routers import (transactions, token_refresh, categories, accounts, profile, summary, login, yearly_analytics, monthly_analytics, savings_funds)

app.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
app.include_router(token_refresh.router, prefix="/refresh", tags=["Token refresh"])
app.include_router(categories.router, prefix="/categories", tags=["Categories"])
app.include_router(accounts.router, prefix="/accounts", tags=["Accounts"])
app.include_router(profile.router, prefix="/profile", tags=["Profile"])
app.include_router(summary.router, prefix="/summary", tags=["Summary"])
app.include_router(login.router, prefix="/auth", tags=["Authentication"])
app.include_router(yearly_analytics.router, prefix="/yearly", tags=["Yearly Analytics"])
app.include_router(monthly_analytics.router, prefix="/monthly", tags=["Monthly Analytics"])
app.include_router(savings_funds.router, prefix="/funds", tags=["Savings Funds"])


# ================================================================================================
#                                       Root API Endpoints
# ================================================================================================


@app.get("/")
@limiter.limit(RATE_LIMITS["health"])
async def root(request: Request):
    return {"message": "Backend server is running!"}


@app.get("/health")
@limiter.limit(RATE_LIMITS["health"])
async def health_check(request: Request):
    return {"status": "healthy"}


@app.get("/version")
@limiter.limit(RATE_LIMITS["health"])
async def get_version(request: Request):
    return {"version": "1.0.0", "description": "Budgeting Dashboard Backend Server"}


@app.get("/log")
@limiter.limit(RATE_LIMITS["read_only"])
async def get_log(
    request: Request,
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