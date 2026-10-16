"""
Unit tests for the Trading212 integration's pure(ish) logic: credential encryption, the
net-worth contribution's currency conversion + staleness rule, request schema validation, and
the two-currency position conversion (quote currency for prices, account currency for P/L).
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
from backend.helper import trading212_client, trading212_crypto, trading212_sync  # noqa: E402
from backend.helper.trading212_networth import (  # noqa: E402
    STALE_AFTER_MINUTES,
    get_t212_net_worth_contribution,
)
from backend.helper.trading212_positions import convert_positions  # noqa: E402
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


# ================================================================================================
#                                   to_major_currency
# ================================================================================================


@pytest.mark.parametrize(
    "code,expected",
    [
        ("EUR", ("EUR", 1.0)),
        ("usd", ("usd", 1.0)),    # already a major unit: returned untouched, case and all
        ("GBX", ("GBP", 100.0)),  # LSE pence quote -> pounds
        ("gbx", ("GBP", 100.0)),
        ("ZAC", ("ZAR", 100.0)),
        (None, (None, 1.0)),
        ("", ("", 1.0)),
    ],
)
def test_to_major_currency(code, expected):
    assert trading212_client.to_major_currency(code) == expected


# ================================================================================================
#                                   get_instrument_currencies
# ================================================================================================


def test_instrument_currencies_parses_catalogue(monkeypatch):
    monkeypatch.setattr(
        trading212_client,
        "_get",
        lambda path, key, secret: [
            {"ticker": "VWCEd_EQ", "currencyCode": "EUR"},
            {"ticker": "AAPL_US_EQ", "currency": "USD"},  # tolerate the alternate field name
        ],
    )

    assert trading212_client.get_instrument_currencies("k", "s") == {
        "VWCEd_EQ": "EUR",
        "AAPL_US_EQ": "USD",
    }


def test_instrument_currencies_skips_unusable_entries(monkeypatch):
    """A renamed or missing currency field must degrade to "unknown", never take the sync down."""
    monkeypatch.setattr(
        trading212_client,
        "_get",
        lambda path, key, secret: [
            {"ticker": "GOOD_EQ", "currencyCode": "EUR"},
            {"ticker": "NO_CURRENCY_EQ"},
            {"currencyCode": "EUR"},
            {"ticker": "NULL_CURRENCY_EQ", "currencyCode": None},
            "not-a-dict",
        ],
    )

    assert trading212_client.get_instrument_currencies("k", "s") == {"GOOD_EQ": "EUR"}


def test_instrument_currencies_empty_on_unexpected_shape(monkeypatch):
    monkeypatch.setattr(trading212_client, "_get", lambda path, key, secret: {"error": "nope"})
    assert trading212_client.get_instrument_currencies("k", "s") == {}


# ================================================================================================
#                                   _resolve_instrument_currencies
# ================================================================================================


@pytest.fixture
def cold_catalogue_cache(monkeypatch):
    """The ticker->currency cache is module-level and process-wide; isolate each test from it."""
    monkeypatch.setattr(trading212_sync, "_instrument_currency_cache", {})
    monkeypatch.setattr(trading212_sync, "_catalogue_fetched_at", None)
    yield


def test_resolve_uses_stored_currencies_without_fetching(cold_catalogue_cache, monkeypatch):
    """
    The catalogue is multi-MB and tightly rate limited, so a holding whose currency is already
    on its stored row must not trigger a fetch.
    """
    def explode(*_args, **_kwargs):
        raise AssertionError("catalogue should not be fetched when every ticker is already known")

    monkeypatch.setattr(trading212_sync.t212, "get_instrument_currencies", explode)

    resolved = trading212_sync._resolve_instrument_currencies(
        "k", "s", {"VWCEd_EQ"}, [{"ticker": "VWCEd_EQ", "instrument_currency": "EUR"}]
    )

    assert resolved == {"VWCEd_EQ": "EUR"}


def test_resolve_fetches_catalogue_for_a_new_ticker(cold_catalogue_cache, monkeypatch):
    calls = []

    def fake_fetch(key, secret):
        calls.append((key, secret))
        return {"VWCEd_EQ": "EUR", "MWEQd_EQ": "EUR", "UNHELD_EQ": "USD"}

    monkeypatch.setattr(trading212_sync.t212, "get_instrument_currencies", fake_fetch)

    resolved = trading212_sync._resolve_instrument_currencies(
        "k", "s", {"VWCEd_EQ", "MWEQd_EQ"}, [{"ticker": "VWCEd_EQ", "instrument_currency": "EUR"}]
    )

    assert len(calls) == 1
    # Only held tickers come back, even though the catalogue covers everything tradable.
    assert resolved == {"VWCEd_EQ": "EUR", "MWEQd_EQ": "EUR"}


def test_resolve_tolerates_failed_catalogue_fetch(cold_catalogue_cache, monkeypatch):
    """A rate-limited catalogue is worth far less than the positions themselves -- write those."""
    def fake_fetch(key, secret):
        raise trading212_client.T212RateLimitError("429")

    monkeypatch.setattr(trading212_sync.t212, "get_instrument_currencies", fake_fetch)

    resolved = trading212_sync._resolve_instrument_currencies(
        "k", "s", {"VWCEd_EQ", "NEW_EQ"}, [{"ticker": "VWCEd_EQ", "instrument_currency": "EUR"}]
    )

    # The previously-resolved holding keeps its currency; the unresolved one is simply absent,
    # which the caller stores as null rather than guessing.
    assert resolved == {"VWCEd_EQ": "EUR"}


def test_resolve_does_not_refetch_for_a_permanently_unknown_ticker(cold_catalogue_cache, monkeypatch):
    calls = []

    def fake_fetch(key, secret):
        calls.append(1)
        return {"SOMETHING_ELSE_EQ": "EUR"}

    monkeypatch.setattr(trading212_sync.t212, "get_instrument_currencies", fake_fetch)

    for _ in range(3):
        resolved = trading212_sync._resolve_instrument_currencies("k", "s", {"MYSTERY_EQ"}, [])

    assert resolved == {}
    assert len(calls) == 1  # throttled by _CATALOGUE_MIN_INTERVAL_SECONDS, not retried every sync


def test_resolve_fetches_on_a_freshly_booted_host(cold_catalogue_cache, monkeypatch):
    """
    Regression: the throttle used 0.0 for "never fetched", but time.monotonic() counts from the
    machine's boot, so on a host that booted minutes ago the gap was smaller than the interval
    and the *first* catalogue fetch was skipped -- positions synced with a null quote currency
    and the UI showed every price as unknown.
    """
    calls = []

    def fake_fetch(key, secret):
        calls.append(1)
        return {"VWCEd_EQ": "EUR"}

    monkeypatch.setattr(trading212_sync.t212, "get_instrument_currencies", fake_fetch)
    monkeypatch.setattr(trading212_sync.time, "monotonic", lambda: 12.0)  # host up 12 seconds

    resolved = trading212_sync._resolve_instrument_currencies("k", "s", {"VWCEd_EQ"}, [])

    assert len(calls) == 1
    assert resolved == {"VWCEd_EQ": "EUR"}

# ================================================================================================
#                                   convert_positions
# ================================================================================================


def _position_row(**overrides):
    """A stored row: prices in the instrument's currency, ppl already in the account's."""
    row = {
        "ticker": "VWCEd_EQ",
        "quantity": 10.0,
        "average_price": 150.0,
        "current_price": 170.0,
        "market_value": 1700.0,
        "unrealised_pnl": 5000.0,
        "currency": "CZK",
        "instrument_currency": "EUR",
    }
    row.update(overrides)
    return row


def test_convert_positions_uses_instrument_rate_for_value_and_account_rate_for_pnl(monkeypatch):
    """
    The original bug: a EUR-quoted ETF in a CZK account had its market value converted with
    get_rate("CZK", "CZK") == 1.0, so ~1 700 EUR was reported as 1 700 Kc, while P/L -- which
    T212 already returns in the account currency -- sat correctly at 5 000 Kc in the same row.
    """
    monkeypatch.setattr(
        "backend.helper.trading212_positions.get_rate",
        lambda frm, to: 25.0 if (frm, to) == ("EUR", "CZK") else 1.0,
    )

    position = convert_positions([_position_row()], "CZK")[0]

    assert position.market_value == 1700.0 * 25.0   # EUR -> CZK
    assert position.unrealised_pnl == 5000.0        # already CZK, not converted a second time
    # Per-share prices stay in the instrument's own currency, named for the client.
    assert position.average_price == 150.0
    assert position.current_price == 170.0
    assert position.instrument_currency == "EUR"
    assert position.weight_pct == 100.0


def test_convert_positions_weights_are_computed_after_conversion(monkeypatch):
    """
    Weighting raw stored values silently mixes currencies: these two holdings are worth the same
    in CZK, so each is half the portfolio, even though one has 25x the other's raw figure.
    """
    monkeypatch.setattr(
        "backend.helper.trading212_positions.get_rate",
        lambda frm, to: {("EUR", "CZK"): 25.0}.get((frm, to), 1.0),
    )

    rows = [
        _position_row(ticker="EUR_ETF", market_value=100.0, instrument_currency="EUR"),
        _position_row(ticker="CZK_STOCK", market_value=2500.0, instrument_currency="CZK"),
    ]

    positions = {p.ticker: p for p in convert_positions(rows, "CZK")}

    assert positions["EUR_ETF"].market_value == pytest.approx(2500.0)
    assert positions["CZK_STOCK"].market_value == pytest.approx(2500.0)
    assert positions["EUR_ETF"].weight_pct == pytest.approx(50.0)
    assert positions["CZK_STOCK"].weight_pct == pytest.approx(50.0)


def test_convert_positions_normalises_pence_quotes(monkeypatch):
    """GBX has no FX pair of its own; unnormalised it misses, falls back to 1.0 and reads 100x high."""
    monkeypatch.setattr(
        "backend.helper.trading212_positions.get_rate",
        lambda frm, to: 29.0 if (frm, to) == ("GBP", "CZK") else 1.0,
    )

    position = convert_positions(
        [_position_row(instrument_currency="GBX", average_price=500.0, current_price=600.0, market_value=6000.0)],
        "CZK",
    )[0]

    assert position.instrument_currency == "GBP"
    assert position.average_price == 5.0    # 500p -> 5 GBP
    assert position.current_price == 6.0
    assert position.market_value == pytest.approx(60.0 * 29.0)


def test_convert_positions_falls_back_to_account_currency_when_unknown(monkeypatch):
    """
    Pre-migration row, or a ticker absent from the catalogue: convert as the account currency
    (no worse than before) but report instrument_currency as None so the UI can flag it.
    """
    monkeypatch.setattr(
        "backend.helper.trading212_positions.get_rate",
        lambda frm, to: 25.0 if (frm, to) == ("CZK", "EUR") else 1.0,
    )

    position = convert_positions([_position_row(instrument_currency=None)], "EUR")[0]

    assert position.instrument_currency is None
    assert position.market_value == 1700.0 * 25.0


def test_convert_positions_empty_snapshot():
    assert convert_positions([], "CZK") == []
