"""
OAuth return address: the website keeps its /auth/callback, and only `client=ios` switches to the
fixed native-app scheme. Nothing from the request may end up in the return address.
"""

import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.abspath(os.path.join(current_dir, "../../"))
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from backend.routers import login  # noqa: E402


def test_web_callback_is_unchanged(monkeypatch):
    monkeypatch.setattr(login.env, "FRONTEND_URL", ["https://budget.example.com", "http://localhost:8080"])
    assert login._get_oauth_callback_url() == "https://budget.example.com/auth/callback"
    assert login._get_oauth_callback_url("web") == "https://budget.example.com/auth/callback"


def test_ios_callback_uses_the_fixed_app_scheme(monkeypatch):
    monkeypatch.setattr(login.env, "FRONTEND_URL", ["https://budget.example.com"])
    assert login._get_oauth_callback_url("ios") == "com.ondrejkutil.budget://auth/callback"
    assert login._get_oauth_callback_url("ios") == login.NATIVE_IOS_OAUTH_CALLBACK_URL
