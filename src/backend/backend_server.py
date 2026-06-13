# fastapi
import fastapi
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
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
formatter: logging.Formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

for handler in logging.root.handlers[:]:
    logging.root.removeHandler(handler)

console_handler: logging.StreamHandler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(formatter)

root_logger: logging.Logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
root_logger.addHandler(console_handler)

# Create logger for this module
logger: logging.Logger = logging.getLogger(__name__)
logger.info("Starting backend server...")

# Import auth functions after logging is configured
from .auth.auth import api_key_auth, admin_key_auth

# Import rate limiter
from .helper.rate_limiter import limiter, RATE_LIMITS

PROJECT_URL: str = env.PROJECT_URL
ANON_KEY: str = env.ANON_KEY

FRONTEND_URLS: list[str] = env.FRONTEND_URL

# Initialize FastAPI app
app : FastAPI = FastAPI()



# GZip compression for responses >= 1kb
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Include routers
from .routers import (transactions, token_refresh, categories, accounts, profile, summary, login, yearly_analytics, monthly_analytics, savings_funds, budgets, export, dividends)

app.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
app.include_router(token_refresh.router, prefix="/refresh", tags=["Token refresh"])
app.include_router(export.router, prefix="/export", tags=["Export"])
app.include_router(categories.router, prefix="/categories", tags=["Categories"])
app.include_router(accounts.router, prefix="/accounts", tags=["Accounts"])
app.include_router(profile.router, prefix="/profile", tags=["Profile"])
app.include_router(summary.router, prefix="/summary", tags=["Summary"])
app.include_router(login.router, prefix="/auth", tags=["Authentication"])
app.include_router(yearly_analytics.router, prefix="/yearly", tags=["Yearly Analytics"])
app.include_router(monthly_analytics.router, prefix="/monthly", tags=["Monthly Analytics"])
app.include_router(savings_funds.router, prefix="/funds", tags=["Savings Funds"])
app.include_router(budgets.router, prefix="/budgets", tags=["Budgets"])
app.include_router(dividends.router, prefix="/dividends", tags=["Dividends"])


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


