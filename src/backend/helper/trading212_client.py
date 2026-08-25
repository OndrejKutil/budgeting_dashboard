"""
Thin client for the Trading212 public API (live environment only -- see QUESTIONS.md §7).

Only the two read endpoints this integration needs are wired up: account summary (for
currency + total value) and open positions. No order-placement endpoint is called anywhere in
this module -- deliberately, since a granted key's write scope can't be checked in code (T212
exposes no scope-introspection endpoint; see QUESTIONS.md §2), so the only enforceable
guarantee is that this client never calls one.

Auth is HTTP Basic with the key as username and secret as password (confirmed against
docs.trading212.com/api -- this is a key+secret pair, not a single key; see QUESTIONS.md §1).
Calls are sequenced by the caller, never parallelised -- T212's per-account rate limits are
tight enough (account/portfolio: 1 req/5s; history: 6 req/min) that a burst from this app
alone could exhaust them.
"""

import logging

import httpx

logger = logging.getLogger(__name__)

BASE_URL = "https://live.trading212.com/api/v0"
_TIMEOUT_SECONDS = 15.0


class T212ApiError(Exception):
    """Base class for a failed Trading212 API call."""


class T212AuthError(T212ApiError):
    """The API rejected the key/secret pair (401/403) -- treat the connection as broken."""


class T212RateLimitError(T212ApiError):
    """429 -- back off and abort the run. Never retried in a tight loop."""


def _auth(api_key: str, api_secret: str) -> httpx.BasicAuth:
    return httpx.BasicAuth(username=api_key, password=api_secret)


def _get(path: str, api_key: str, api_secret: str) -> dict | list:
    url = f"{BASE_URL}{path}"
    try:
        response = httpx.get(url, auth=_auth(api_key, api_secret), timeout=_TIMEOUT_SECONDS)
    except httpx.HTTPError as e:
        logger.error(f"Trading212 request failed: {path}")
        logger.info(f"Trading212 request error: {e}")
        raise T212ApiError(f"Request to Trading212 failed: {e}") from e

    if response.status_code in (401, 403):
        raise T212AuthError("Trading212 rejected the stored credentials.")
    if response.status_code == 429:
        raise T212RateLimitError("Trading212 rate limit hit.")
    if response.status_code >= 400:
        logger.error(f"Trading212 returned {response.status_code} for {path}")
        logger.info(f"Trading212 response body: {response.text[:500]}")
        raise T212ApiError(f"Trading212 returned {response.status_code}.")

    try:
        result: dict | list = response.json()
    except ValueError as e:
        raise T212ApiError("Trading212 returned a non-JSON response.") from e
    return result


def get_account_summary(api_key: str, api_secret: str) -> dict:
    """
    GET /equity/account/summary -- cash, currency, and aggregate investment figures.

    Used both to validate a new connection (POST /connection must confirm the key works
    before anything is stored) and, on every sync, to read the account's currency and total
    value for fct_t212_value_history.
    """
    data = _get("/equity/account/summary", api_key, api_secret)
    return data if isinstance(data, dict) else {}


def get_positions(api_key: str, api_secret: str) -> list[dict]:
    """GET /equity/portfolio -- every open position, values in the account's primary currency."""
    data = _get("/equity/portfolio", api_key, api_secret)
    return data if isinstance(data, list) else []


def validate_credentials(api_key: str, api_secret: str) -> dict:
    """
    Confirm a key/secret pair actually authenticates before it's ever written to storage.

    Re-raises T212AuthError/T212RateLimitError/T212ApiError as-is -- the router translates
    these into the right HTTP status for POST /connection.
    """
    return get_account_summary(api_key, api_secret)
