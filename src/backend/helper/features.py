"""
Per-user feature flag reads.

Kept out of the routers so `merge_feature_flags` stays a pure function that can be unit-tested
without a Supabase connection -- the same reason `helper/identity.py` is dependency-free.

The read path is deliberately forgiving: a feature registered in `dim_features` with no matching
`dim_features_users` row for this user reads as disabled rather than raising. That means a
migration that forgets to backfill degrades to "feature off", never to a broken endpoint.
"""

import logging
from typing import Any

from ..schemas.base import FeatureFlagData
from .columns import FEATURES_COLUMNS, FEATURES_USERS_COLUMNS

logger = logging.getLogger(__name__)

FEATURES_TABLE = "dim_features"
FEATURES_USERS_TABLE = "dim_features_users"


def merge_feature_flags(
    catalogue: list[dict[str, Any]],
    user_rows: list[dict[str, Any]],
) -> list[FeatureFlagData]:
    """
    Combine the global feature registry with this user's rows.

    Args:
        catalogue: rows from `dim_features` (already filtered to active features)
        user_rows: rows from `dim_features_users` for the current user

    Returns:
        One FeatureFlagData per catalogue entry. Missing user rows default to disabled.
    """
    enabled_by_key: dict[str, bool] = {
        str(row[FEATURES_USERS_COLUMNS.KEY.value]): bool(row.get(FEATURES_USERS_COLUMNS.IS_ENABLED.value))
        for row in user_rows
        if row.get(FEATURES_USERS_COLUMNS.KEY.value)
    }

    return [
        FeatureFlagData(
            feature_key=str(feature[FEATURES_COLUMNS.KEY.value]),
            feature_name=str(feature[FEATURES_COLUMNS.NAME.value]),
            feature_description=feature.get(FEATURES_COLUMNS.DESCRIPTION.value),
            is_enabled=enabled_by_key.get(str(feature[FEATURES_COLUMNS.KEY.value]), False),
        )
        for feature in catalogue
    ]


def get_feature_flags(access_token: str) -> list[FeatureFlagData]:
    """
    Fetch every active feature with the calling user's enabled state.

    Two selects rather than a PostgREST embed: the merge stays explicit and testable, and the
    default-to-false behaviour is controlled here instead of depending on embed semantics.
    RLS on `dim_features_users` restricts the second select to the caller's own rows.
    """
    # Imported lazily to avoid an import cycle (data.database imports from helper).
    from ..data.database import get_db_client

    client = get_db_client(access_token)

    catalogue_fields = ",".join([
        FEATURES_COLUMNS.KEY.value,
        FEATURES_COLUMNS.NAME.value,
        FEATURES_COLUMNS.DESCRIPTION.value,
    ])
    catalogue_response = (
        client.table(FEATURES_TABLE)
        .select(catalogue_fields)
        .eq(FEATURES_COLUMNS.IS_ACTIVE.value, True)
        .order(FEATURES_COLUMNS.KEY.value)
        .execute()
    )

    user_fields = ",".join([
        FEATURES_USERS_COLUMNS.KEY.value,
        FEATURES_USERS_COLUMNS.IS_ENABLED.value,
    ])
    user_response = client.table(FEATURES_USERS_TABLE).select(user_fields).execute()

    return merge_feature_flags(catalogue_response.data, user_response.data)


def is_feature_enabled(access_token: str, feature_key: str) -> bool:
    """
    Whether `feature_key` is on for the calling user.

    Fails closed: an unknown key, a missing row, or a failed query all return False. A feature
    flag must never be the reason an endpoint 500s.
    """
    from ..data.database import get_db_client

    try:
        client = get_db_client(access_token)
        response = (
            client.table(FEATURES_USERS_TABLE)
            .select(FEATURES_USERS_COLUMNS.IS_ENABLED.value)
            .eq(FEATURES_USERS_COLUMNS.KEY.value, feature_key)
            .limit(1)
            .execute()
        )

        if not response.data:
            return False

        return bool(response.data[0].get(FEATURES_USERS_COLUMNS.IS_ENABLED.value))

    except Exception as e:
        logger.error(f"Feature flag lookup failed for '{feature_key}'; treating as disabled")
        logger.info(f"Feature flag lookup error: {str(e)}")
        return False
