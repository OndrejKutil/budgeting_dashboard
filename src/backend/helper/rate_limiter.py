"""
Rate Limiting Configuration for the Budgeting Dashboard Backend API.

This module provides rate limiting functionality using slowapi to protect
the API from abuse and ensure fair usage across all clients.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request
import logging

# Create logger for this module
logger = logging.getLogger(__name__)


def get_client_identifier(request: Request) -> str:
    """
    Get a unique identifier for rate limiting purposes.
    
    Priority:
    1. API Key
    2. Authenticated User ID (if available)
    3. Client IP address (fallback)
    
    This allows for user-specific rate limiting when authenticated,
    and IP-based limiting for unauthenticated requests.
    """
    # Try to get API key from headers
    api_key = request.headers.get("X-API-KEY")
    if api_key:
        # Use first 8 chars of API key for privacy
        return f"api_key:{api_key[:8]}"

    # Try to get user ID from request state (set by auth middleware)
    if hasattr(request.state, "user_id") and request.state.user_id:
        return f"user:{request.state.user_id}"

    # Fallback to IP address
    return get_remote_address(request)


# Initialize the rate limiter
# Using in-memory storage by default (suitable for single-instance deployments)
# For multi-instance deployments, use Redis: Limiter(key_func=..., storage_uri="redis://localhost:6379")
limiter = Limiter(
    key_func=get_client_identifier,
    default_limits=["200 per minute", "1000 per hour"],  # Global default limits
    headers_enabled=False,  # Disabled to avoid requiring Response parameter in endpoints
    strategy="fixed-window",  # Rate limiting strategy
)


# ================================================================================================
#                                   Rate Limit Presets
# ================================================================================================

# Define rate limit strings for different endpoint types
# These can be used as decorators: @limiter.limit(RATE_LIMITS["standard"])

RATE_LIMITS = {
    # Standard API endpoints (CRUD operations)
    "standard": "60/minute",
    
    # Heavy computation endpoints (analytics, reports)
    "heavy": "20/minute",
    
    # Authentication endpoints (login, register, token refresh)
    # Lower limits to prevent brute force attacks
    "auth": "50/minute",
    
    # Login attempts - very restrictive to prevent brute force
    "login": "1000/minute",
    
    # Password reset - restrictive to prevent abuse
    "password_reset": "3/minute",
    
    # Read-only endpoints (can be more generous)
    "read_only": "120/minute",
    
    # Write operations (create, update, delete)
    "write": "30/minute",
    
    # Bulk operations
    "bulk": "10/minute",
    
    # Health check and status endpoints
    "health": "300/minute",
}


def get_rate_limit_message(limit_value: str) -> str:
    """
    Generate a user-friendly message explaining the rate limit.
    
    Args:
        limit_value: The rate limit string (e.g., "60/minute")
    
    Returns:
        A formatted message string
    """
    return f"Rate limit exceeded. Maximum allowed: {limit_value}. Please try again later."


# ================================================================================================
#                                   Logging Utilities
# ================================================================================================

def log_rate_limit_exceeded(request: Request, limit_value: str) -> None:
    """
    Log when a rate limit is exceeded for monitoring purposes.
    
    Args:
        request: The FastAPI request object
        limit_value: The rate limit that was exceeded
    """
    client_id = get_client_identifier(request)
    endpoint = request.url.path
    method = request.method
    
    logger.warning(
        f"Rate limit exceeded - Client: {client_id}, "
        f"Endpoint: {method} {endpoint}, Limit: {limit_value}"
    )
