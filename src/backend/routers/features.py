# fastapi
# logging
import logging

import fastapi
from fastapi import APIRouter, Depends, Request, status

# auth dependencies
from ..auth.auth import api_key_auth, get_current_user

# helper
from ..helper.features import get_feature_flags

# rate limiting
from ..helper.rate_limiter import RATE_LIMITS, limiter
from ..schemas.responses import FeatureFlagsResponse

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# Create logger for this module
logger = logging.getLogger(__name__)

# ================================================================================================
#                                   Router Configuration
# ================================================================================================

router = APIRouter()

#? This router prefix is /features


@router.get("/", response_model=FeatureFlagsResponse)
@limiter.limit(RATE_LIMITS["read_only"])
async def get_features(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> FeatureFlagsResponse:
    """
    Get every active feature with the calling user's enabled state.

    Features the user has no row for are reported as disabled, so a feature added without a
    backfill is simply off rather than an error.
    """
    try:
        flags = get_feature_flags(user["access_token"])

        return FeatureFlagsResponse(
            data=flags,
            count=len(flags),
            success=True,
            message="Feature flags retrieved successfully",
        )

    except Exception as e:
        logger.error("Failed to fetch feature flags")
        logger.info(f"Feature flags query failed with error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch feature flags",
        )
