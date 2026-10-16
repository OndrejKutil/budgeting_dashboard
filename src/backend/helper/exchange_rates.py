import logging
import time

logger = logging.getLogger(__name__)

_cache: dict[tuple, float] = {}

# None, not 0.0, for "never loaded": time.monotonic() counts from the *boot* of the machine (or
# container host), not from process start, so 0.0 as a sentinel made the TTL check below read
# "refreshed monotonic() seconds ago". Inside a freshly started container that is single-digit
# seconds, so _ensure_cache() returned with the cache still empty and every single conversion
# silently took the 1.0 fallback for the first hour of host uptime.
_cache_fetched_at: float | None = None
_CACHE_TTL_SECONDS = 3600  # 1 hour


def _load_rates() -> dict[tuple, float]:
    from ..data.database import get_service_db_client
    client = get_service_db_client()
    response = client.table('dim_exchange_rates').select('base_currency, target_currency, rate').execute()
    rates: dict[tuple, float] = {}
    for row in response.data:
        key = (row['base_currency'], row['target_currency'])
        rates[key] = float(row['rate'])
    return rates


def _ensure_cache() -> None:
    global _cache, _cache_fetched_at
    if _cache_fetched_at is not None and time.monotonic() - _cache_fetched_at < _CACHE_TTL_SECONDS:
        return
    try:
        _cache = _load_rates()
        _cache_fetched_at = time.monotonic()
        logger.info(f'Exchange rate cache refreshed: {len(_cache)} pairs loaded')
    except Exception as e:
        logger.warning(f'Failed to refresh exchange rate cache: {e}. Keeping stale rates.')
        if not _cache:
            _cache = {}


def get_rate(from_currency: str | None, to_currency: str | None) -> float:
    """
    Return the exchange rate to convert one unit of from_currency into to_currency.
    Falls back to 1.0 (no conversion) if the pair is missing, with a warning.
    """
    if not from_currency or not to_currency or from_currency == to_currency:
        return 1.0

    _ensure_cache()

    rate = _cache.get((from_currency, to_currency))
    if rate is None:
        logger.warning(
            f'Exchange rate not found for {from_currency}→{to_currency}. '
            'Using 1.0 as fallback — totals may be inaccurate.'
        )
        return 1.0

    return rate
