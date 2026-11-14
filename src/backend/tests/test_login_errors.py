"""
Login error mapping: a wrong password or unknown email must come back as a 401 the login form
can show, not a 500. supabase-py raises AuthApiError for these instead of returning no session.
"""

import os
import sys

import pytest
from gotrue.errors import AuthApiError

current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.abspath(os.path.join(current_dir, "../../"))
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from backend.routers.login import _login_error  # noqa: E402


@pytest.mark.parametrize("status", [400, 401, 422])
def test_bad_credentials_become_401(status):
    err = _login_error(AuthApiError("Invalid login credentials", status))
    assert err is not None
    assert err.status_code == 401
    assert err.detail == "Invalid email or password."


def test_unconfirmed_email_is_explained():
    err = _login_error(AuthApiError("Email not confirmed", 400))
    assert err is not None
    assert err.status_code == 403


def test_rate_limit_passes_through_as_429():
    err = _login_error(AuthApiError("Request rate limit reached", 429))
    assert err is not None
    assert err.status_code == 429


def test_auth_server_failure_is_not_blamed_on_the_user():
    assert _login_error(AuthApiError("upstream down", 503)) is None
