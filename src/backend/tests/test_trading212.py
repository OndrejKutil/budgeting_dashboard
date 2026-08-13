"""
Unit tests for the Trading212 integration's pure(ish) logic: credential encryption, the
net-worth contribution's currency conversion + staleness rule, and request schema validation.
None of these touch a database or the real Trading212 API -- sync_one_connection and the router
endpoints are integration-level and are exercised manually per the PR description, same as this
suite's existing db-dependent code (see test_unit_calculations.py's own docstring).
"""

import datetime
import os
import sys

import pytest
from cryptography.fernet import Fernet
from pydantic import ValidationError

# Add 'src' to sys.path to allow importing 'backend' as a package -- same reason as
# test_unit_calculations.py / test_features.py: these modules use relative imports that need
# to resolve against the real "backend" package root.
current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.abspath(os.path.join(current_dir, "../../"))
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from backend.helper import environment as env  # noqa: E402
from backend.helper import trading212_crypto  # noqa: E402
from backend.helper.trading212_networth import (  # noqa: E402
    STALE_AFTER_MINUTES,
    get_t212_net_worth_contribution,
)
from backend.schemas.requests import T212ConnectionRequest  # noqa: E402

# ================================================================================================
#                                   Fixtures
# ================================================================================================


@pytest.fixture(autouse=True)
def fernet_key(monkeypatch):
    """Every test gets a real, freshly generated Fernet key rather than a fixed test string."""
    monkeypatch.setattr(env, "T212_ENCRYPTION_KEY", Fernet.generate_key().decode("utf-8"))
    yield


class FakeQuery:
    """
    Minimal stand-in for the chainable supabase-py query builder. Every method needed by
    get_t212_net_worth_contribution just returns self, except select() (records what table this
    is) and execute() (returns the canned rows for that table).
    """

    def __init__(self, table_name: str, rows_by_table: dict[str, list[dict]]):
        self._table_name = table_name
        self._rows_by_table = rows_by_table

    def select(self, *_args, **_kwargs):
        return self

    def order(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def execute(self):
        class Response:
            def __init__(self, data):
                self.data = data
        return Response(self._rows_by_table.get(self._table_name, []))


class FakeDbClient:
    def __init__(self, rows_by_table: dict[str, list[dict]]):
        self._rows_by_table = rows_by_table

    def table(self, name: str):
        return FakeQuery(name, self._rows_by_table)


# ================================================================================================
#                                   trading212_crypto
# ================================================================================================


def test_encrypt_decrypt_roundtrip():
    token = trading212_crypto.encrypt_credentials("my-api-key", "my-api-secret")
    api_key, api_secret = trading212_crypto.decrypt_credentials(token)

    assert api_key == "my-api-key"
    assert api_secret == "my-api-secret"


def test_decrypt_with_wrong_key_raises():
    token = trading212_crypto.encrypt_credentials("my-api-key", "my-api-secret")

    # A different key can never decrypt this token -- the whole point of encrypting at rest.
    import importlib
    from unittest.mock import patch
    with patch.object(env, "T212_ENCRYPTION_KEY", Fernet.generate_key().decode("utf-8")):
        with pytest.raises(trading212_crypto.T212CredentialsError):
            trading212_crypto.decrypt_credentials(token)
    importlib.reload(trading212_crypto)  # no-op safety net; module holds no cached key state


def test_decrypt_garbage_token_raises():
    with pytest.raises(trading212_crypto.T212CredentialsError):
        trading212_crypto.decrypt_credentials("not-a-real-token")


# ================================================================================================
#                                   T212ConnectionRequest
# ================================================================================================


def test_connection_request_valid():
    req = T212ConnectionRequest(api_key="k", api_secret="s")
    assert req.api_key == "k"
    assert req.api_secret == "s"


def test_connection_request_rejects_empty_key():
    with pytest.raises(ValidationError):
        T212ConnectionRequest(api_key="", api_secret="s")


def test_connection_request_rejects_empty_secret():
    with pytest.raises(ValidationError):
        T212ConnectionRequest(api_key="k", api_secret="")


# ================================================================================================
#                                   get_t212_net_worth_contribution
# ================================================================================================


def test_contribution_none_when_feature_disabled(monkeypatch):
    monkeypatch.setattr(
        "backend.helper.trading212_networth.is_feature_enabled", lambda token, key: False
    )
    db = FakeDbClient({})
    assert get_t212_net_worth_contribution(db, "fake-token", "EUR") is None


def test_contribution_none_when_never_synced(monkeypatch):
    monkeypatch.setattr(
        "backend.helper.trading212_networth.is_feature_enabled", lambda token, key: True
    )
    db = FakeDbClient({"fct_t212_value_history": []})
    assert get_t212_net_worth_contribution(db, "fake-token", "EUR") is None


def test_contribution_converts_currency_and_reports_fresh(monkeypatch):
    monkeypatch.setattr(
        "backend.helper.trading212_networth.is_feature_enabled", lambda token, key: True
    )
    monkeypatch.setattr(
        "backend.helper.exchange_rates.get_rate", lambda frm, to: 2.0
    )
    now = datetime.datetime.now(datetime.UTC)
    db = FakeDbClient({
        "fct_t212_value_history": [{"total_value": 100.0, "currency": "USD", "snapshot_at": now.isoformat()}],
    })

    result = get_t212_net_worth_contribution(db, "fake-token", "EUR")

    assert result is not None
    assert result.total_value == 200.0  # 100 USD * 2.0 -> EUR
    assert result.is_stale is False


def test_contribution_reports_stale_past_threshold(monkeypatch):
    monkeypatch.setattr(
        "backend.helper.trading212_networth.is_feature_enabled", lambda token, key: True
    )
    old = datetime.datetime.now(datetime.UTC) - datetime.timedelta(minutes=STALE_AFTER_MINUTES + 1)
    db = FakeDbClient({
        "fct_t212_value_history": [{"total_value": 50.0, "currency": "EUR", "snapshot_at": old.isoformat()}],
    })

    result = get_t212_net_worth_contribution(db, "fake-token", "EUR")

    assert result is not None
    assert result.is_stale is True


def test_contribution_never_raises_on_broken_db(monkeypatch):
    monkeypatch.setattr(
        "backend.helper.trading212_networth.is_feature_enabled", lambda token, key: True
    )

    class ExplodingDbClient:
        def table(self, name):
            raise RuntimeError("connection refused")

    # Fails closed, same principle as is_feature_enabled -- must never 500 net-worth.
    assert get_t212_net_worth_contribution(ExplodingDbClient(), "fake-token", "EUR") is None
