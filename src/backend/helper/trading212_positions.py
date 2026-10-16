"""
Converting a stored fct_t212_positions snapshot into the shape GET /trading212/positions
returns -- the one piece of Trading212 logic with real arithmetic in it, so it lives here
rather than inline in the router, for the same reason trading212_networth.py does: a pure
function that can be unit tested without a database or an HTTP request.

The arithmetic exists because a T212 position row carries *two* currencies:

  * average_price / current_price / market_value -- the instrument's quote currency
    (`instrument_currency`). A Xetra-listed ETF is priced in EUR however the account is
    denominated.
  * unrealised_pnl -- T212's `ppl`, which the API already returns in the *account* currency
    (`currency`).

Converting both with the account rate -- what this code did before instrument_currency
existed -- turned a EUR price into a CZK label without touching the number, because
get_rate("CZK", "CZK") is 1.0. The result was a row whose value and P/L were ~24x apart.
"""

import logging

from . import trading212_client as t212
from .columns import T212_POSITIONS_COLUMNS
from .exchange_rates import get_rate

logger = logging.getLogger(__name__)


def convert_positions(rows: list[dict], base_currency: str) -> list:
    """
    Stored position rows -> T212PositionData, newest snapshot as-is (no re-ordering).

    Per-share prices stay in the instrument's own currency and are reported alongside
    `instrument_currency`; market value and P/L are converted to base_currency. Restating a
    EUR-quoted share price as a CZK per-share figure is arithmetically fine and useless for
    recognising your own position, which is why the split is kept in the response.

    A row whose quote currency couldn't be resolved (written before the column existed, or a
    ticker absent from T212's catalogue) falls back to the account currency for conversion --
    no worse than the old behaviour -- and reports instrument_currency=None so the client can
    mark the figure as unverified rather than vouch for it.
    """
    from ..schemas.base import T212PositionData  # local import: schemas -> nothing back-imports helper

    converted = []
    for row in rows:
        account_currency = row.get(T212_POSITIONS_COLUMNS.CURRENCY.value)
        # A pence-style quote ("GBX") has no FX pair of its own; normalise to the major unit
        # first, or the rate lookup misses, silently falls back to 1.0 (see exchange_rates)
        # and the row reads 100x too large.
        instrument_currency, minor_unit_divisor = t212.to_major_currency(
            row.get(T212_POSITIONS_COLUMNS.INSTRUMENT_CURRENCY.value)
        )

        price_rate = get_rate(instrument_currency or account_currency, base_currency) / minor_unit_divisor
        pnl_rate = get_rate(account_currency, base_currency)

        converted.append({
            "ticker": row[T212_POSITIONS_COLUMNS.TICKER.value],
            "quantity": float(row[T212_POSITIONS_COLUMNS.QUANTITY.value]),
            "average_price": float(row[T212_POSITIONS_COLUMNS.AVERAGE_PRICE.value]) / minor_unit_divisor,
            "current_price": float(row[T212_POSITIONS_COLUMNS.CURRENT_PRICE.value]) / minor_unit_divisor,
            "market_value": float(row[T212_POSITIONS_COLUMNS.MARKET_VALUE.value]) * price_rate,
            "unrealised_pnl": float(row[T212_POSITIONS_COLUMNS.UNREALISED_PNL.value]) * pnl_rate,
            "instrument_currency": instrument_currency,
        })

    # Weights are computed on the *converted* market values. Summing raw ones across
    # instruments quoted in different currencies gives percentages that mean nothing -- it only
    # looked correct while every holding happened to share a single quote currency.
    total_market_value = sum(position["market_value"] for position in converted)

    return [
        T212PositionData(
            **position,
            weight_pct=(position["market_value"] / total_market_value * 100) if total_market_value else 0.0,
        )
        for position in converted
    ]
