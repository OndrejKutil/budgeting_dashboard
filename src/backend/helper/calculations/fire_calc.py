import logging
import math
from datetime import date

from dateutil.relativedelta import relativedelta

from ...schemas.base import FIREData
from .summary_calc import (
    _apply_currency_conversion,
    _calculate_summary_totals,
    _fetch_summary_transactions,
    _prepare_transactions_dataframe,
)
from .yearly_page_calc import _emergency_fund_analysis

logger = logging.getLogger(__name__)


def _get_current_net_worth(access_token: str, base_currency: str) -> float:
    """Return the most recent net worth value in base_currency."""
    from ...data.database import get_db_client
    from .net_worth_calc import calculate_net_worth_timeline
    db_client = get_db_client(access_token)
    today = date.today()
    timeline = calculate_net_worth_timeline(db_client, end_date=today, base_currency=base_currency)
    nw_list = timeline.get('net_worth', [])
    return float(nw_list[-1]) if nw_list else 0.0


def _project_years_to_fi(current_nw: float, fi_number: float, annual_savings: float, annual_return: float = 0.07) -> float | None:
    """
    Iterative projection: how many years until NW crosses fi_number
    assuming annual_return compounding plus annual_savings added each year.
    Returns None when savings are negative or projection exceeds 100 years.
    """
    if fi_number <= 0 or current_nw >= fi_number:
        return 0.0
    if annual_savings <= 0 and current_nw <= 0:
        return None

    nw = current_nw
    for year in range(1, 101):
        nw = nw * (1 + annual_return) + annual_savings
        if nw >= fi_number:
            return float(year)
    return None


def _coast_fi_years(current_nw: float, fi_number: float, annual_return: float = 0.07) -> float | None:
    """
    Years of pure compounding at annual_return until current_nw reaches fi_number
    (no new contributions needed after this point = Coast FI).
    """
    if current_nw <= 0 or fi_number <= 0:
        return None
    if current_nw >= fi_number:
        return 0.0
    try:
        return math.log(fi_number / current_nw) / math.log(1 + annual_return)
    except (ValueError, ZeroDivisionError):
        return None


def _fire_analysis(access_token: str, year: int, base_currency: str = 'CZK') -> FIREData:
    """
    Calculate FIRE (Financial Independence / Retire Early) metrics.

    - FI numbers derived from 25× annual expenses (4% withdrawal rule).
    - Projections use 7% nominal annual growth + trailing-12-month savings.
    """
    today = date.today()

    # 1. Monthly expense baselines from emergency fund analysis (reuses existing logic)
    ef_data = _emergency_fund_analysis(access_token, year, base_currency)
    monthly_core = ef_data.average_monthly_core_expenses
    monthly_core_nec = ef_data.average_monthly_core_necessary
    monthly_all = ef_data.average_monthly_all_expenses
    months_analyzed = ef_data.months_analyzed

    # 2. TTM (trailing 12 months) income + savings
    ttm_end = today
    ttm_start = today - relativedelta(months=12)
    ttm_transactions = _fetch_summary_transactions(access_token, ttm_start, ttm_end)
    ttm_df = _prepare_transactions_dataframe(ttm_transactions)
    ttm_df = _apply_currency_conversion(ttm_df, base_currency)
    ttm_totals = _calculate_summary_totals(ttm_df)

    annual_income = ttm_totals.income
    # Annual savings = income minus expenses and investments (savings transactions are outflows but stay as wealth)
    annual_savings = ttm_totals.income - ttm_totals.expense - ttm_totals.investment
    savings_rate = round((annual_savings / annual_income * 100), 2) if annual_income > 0 else 0.0

    # 3. Current net worth
    current_nw = _get_current_net_worth(access_token, base_currency)

    # 4. FI numbers (25× annual spending)
    fi_number = round(monthly_core_nec * 12 * 25, 2)
    lean_fi_number = round(monthly_core * 12 * 25, 2)
    fat_fi_number = round(monthly_all * 12 * 25, 2)

    # 5. Progress percentages (capped at 100 for display, allow over 100 so we know we're past FI)
    def progress(nw: float, target: float) -> float:
        if target <= 0:
            return 0.0
        return round(min(nw / target * 100, 100.0), 2)

    fi_progress = progress(current_nw, fi_number)
    lean_progress = progress(current_nw, lean_fi_number)
    fat_progress = progress(current_nw, fat_fi_number)

    # 6. Years-to-FI projection
    years_to_fi = _project_years_to_fi(current_nw, fi_number, annual_savings)
    projected_fi_year: int | None = None
    if years_to_fi is not None:
        projected_fi_year = today.year + math.ceil(years_to_fi)

    # 7. Coast FIRE years
    coast_years = _coast_fi_years(current_nw, fi_number)

    return FIREData(
        year=year,
        base_currency=base_currency,
        fi_number=fi_number,
        lean_fi_number=lean_fi_number,
        fat_fi_number=fat_fi_number,
        current_net_worth=round(current_nw, 2),
        annual_income=round(annual_income, 2),
        annual_savings=round(annual_savings, 2),
        savings_rate=savings_rate,
        fi_progress_pct=fi_progress,
        lean_progress_pct=lean_progress,
        fat_progress_pct=fat_progress,
        years_to_fi=round(years_to_fi, 1) if years_to_fi is not None else None,
        projected_fi_year=projected_fi_year,
        coast_fi_years=round(coast_years, 1) if coast_years is not None else None,
        monthly_core_expenses=round(monthly_core, 2),
        monthly_core_necessary_expenses=round(monthly_core_nec, 2),
        monthly_all_expenses=round(monthly_all, 2),
        months_analyzed=months_analyzed,
    )
