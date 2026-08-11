"""
Unit tests for the pure feature-flag merge.

`merge_feature_flags` is the whole read path's correctness: it decides what a user sees when
their `dim_features_users` rows are incomplete, which is the normal state after a feature is
registered but before it is backfilled.
"""

import os
import sys

import pytest

# Add 'src' to sys.path to allow importing 'backend' as a package.
# `helper.features` imports from `..schemas.base`, so it must be imported via the full package
# path — the same reason test_unit_calculations.py does this.
current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.abspath(os.path.join(current_dir, "../../"))
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from backend.helper.features import merge_feature_flags  # noqa: E402

# ================================================================================================
#                                   Fixtures
# ================================================================================================

@pytest.fixture
def catalogue():
    """Rows as they come back from `dim_features` (already filtered to is_active)."""
    return [
        {
            "feature_key": "screenshot_import",
            "feature_name": "Screenshot import",
            "feature_description": "Import draft transactions from a screenshot",
        },
        {
            "feature_key": "voice_import",
            "feature_name": "Voice import",
            "feature_description": None,
        },
    ]


# ================================================================================================
#                                   merge_feature_flags
# ================================================================================================

def test_enabled_row_reports_enabled(catalogue):
    user_rows = [{"feature_key": "screenshot_import", "is_enabled": True}]

    flags = merge_feature_flags(catalogue, user_rows)

    assert {f.feature_key: f.is_enabled for f in flags} == {
        "screenshot_import": True,
        "voice_import": False,
    }


def test_disabled_row_reports_disabled(catalogue):
    user_rows = [
        {"feature_key": "screenshot_import", "is_enabled": False},
        {"feature_key": "voice_import", "is_enabled": False},
    ]

    flags = merge_feature_flags(catalogue, user_rows)

    assert all(f.is_enabled is False for f in flags)


def test_missing_row_defaults_to_disabled(catalogue):
    """A feature registered but never backfilled must read as off, not raise."""
    flags = merge_feature_flags(catalogue, [])

    assert len(flags) == 2
    assert all(f.is_enabled is False for f in flags)


def test_every_catalogue_entry_is_returned_with_its_metadata(catalogue):
    flags = merge_feature_flags(catalogue, [])
    by_key = {f.feature_key: f for f in flags}

    assert by_key["screenshot_import"].feature_name == "Screenshot import"
    assert by_key["screenshot_import"].feature_description == "Import draft transactions from a screenshot"
    assert by_key["voice_import"].feature_description is None


def test_user_row_for_unknown_feature_is_ignored(catalogue):
    """A stale row for a feature no longer in the catalogue must not leak into the response."""
    user_rows = [
        {"feature_key": "screenshot_import", "is_enabled": True},
        {"feature_key": "retired_feature", "is_enabled": True},
    ]

    flags = merge_feature_flags(catalogue, user_rows)

    assert [f.feature_key for f in flags] == ["screenshot_import", "voice_import"]


def test_inactive_features_are_excluded_by_the_catalogue_query(catalogue):
    """
    Inactive features never reach the merge — the caller filters on is_active — so an empty
    catalogue yields no flags even when the user has rows.
    """
    user_rows = [{"feature_key": "screenshot_import", "is_enabled": True}]

    assert merge_feature_flags([], user_rows) == []
