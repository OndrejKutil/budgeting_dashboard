# fastapi
# logging
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# import env configuration
from .helper import environment as env
from .helper.errors import flatten_validation_errors, generate_error_id

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

# Import rate limiter (deliberately after logging setup above)
from .helper.rate_limiter import RATE_LIMITS, limiter  # noqa: E402

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
app.add_middleware(SlowAPIMiddleware)


# ================================================================================================
#                                   Error Handling
# ================================================================================================
# Every error response — known business errors raised as HTTPException, validation failures,
# rate limiting, and truly unexpected exceptions — is normalized to the same
# {"detail": str, "error_id": str | None} shape so the frontend only has one field to read.
# `error_id` is set only for unexpected 500s: it's what a user can quote back so the matching
# `logger.error(...)` line can be found without needing an external error-tracking service.


@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    response = JSONResponse(
        {"detail": f"Rate limit exceeded: {exc.detail}. Please try again later.", "error_id": None},
        status_code=429,
    )
    limiter._inject_headers(response, request.state.view_rate_limit)
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    logger.warning(f"Validation failed for {request.method} {request.url.path}: {exc.errors()}")
    return JSONResponse(
        {"detail": flatten_validation_errors(exc.errors()), "error_id": None},
        status_code=422,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    error_id = generate_error_id()
    logger.error(
        f"Unhandled error [{error_id}] on {request.method} {request.url.path}: {exc}",
        exc_info=True,
    )
    return JSONResponse(
        {"detail": "Something went wrong on our end.", "error_id": error_id},
        status_code=500,
    )

# Include routers (deliberately imported here, after the exception handlers they rely on)
from .routers import (  # noqa: E402
    accounts,
    budgets,
    categories,
    dividends,
    export,
    login,
    monthly_analytics,
    net_worth,
    profile,
    recurring,
    savings_funds,
    summary,
    tags,
    token_refresh,
    transactions,
    yearly_analytics,
)

app.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
app.include_router(tags.router, prefix="/tags", tags=["Tags"])
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
app.include_router(recurring.router, prefix="/recurring", tags=["Recurring"])
app.include_router(net_worth.router, prefix="/net-worth", tags=["Net Worth"])


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


