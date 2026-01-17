"""
Unit tests for backend calculation logic.
These tests do NOT depend on a database or API.
They test the financial math and data transformation logic directly.
"""

import pytest
from datetime import date
from decimal import Decimal
import polars as pl
import sys
import os

# Add 'src' to sys.path to allow importing 'backend' as a package
# This assumes the file structure: src/backend/tests/test_unit_calculations.py
# We want to add 'src' to path.
current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.abspath(os.path.join(current_dir, "../../"))
if src_path not in sys.path:
    sys.path.insert(0, src_path)

# Import calculation modules using the full package path
from backend.helper.calculations.summary_calc import (
    _prepare_transactions_dataframe as summary_prepare_df,
    _calculate_summary_totals,
    _calculate_period_comparison,
    SummaryTotals
)

from backend.helper.calculations.monthly_page_calc import (
    _calculate_monthly_totals,
    _calculate_run_rate,
    _calculate_day_split,
    MonthlyTotals
)

# ================================================================================================
#                                   Fixtures
# ================================================================================================

@pytest.fixture
def sample_transactions_data():
    """
    Returns a list of raw transaction dictionaries as would come from Supabase.
    """
    return [
        {
            "amount": 5000.0,
            "date": "2026-01-01",
            "dim_categories": {"category_type": "income", "category_name": "Salary", "spending_type": "Income"},
            "notes": "Paycheck"
        },
        {
            "amount": -1000.0,
            "date": "2026-01-05",
            "dim_categories": {"category_type": "expense", "category_name": "Rent", "spending_type": "Core"},
            "notes": "Rent"
        },
        {
            "amount": -200.0,
            "date": "2026-01-10",
            "dim_categories": {"category_type": "expense", "category_name": "Groceries", "spending_type": "Necessary"},
            "notes": "Food"
        },
        {
            "amount": -500.0,
            "date": "2026-01-15",
            "dim_categories": {"category_type": "saving", "category_name": "Emergency Fund", "spending_type": "Future"},
            "notes": "Save"
        },
        {
            "amount": -300.0,
            "date": "2026-01-20",
            "dim_categories": {"category_type": "investment", "category_name": "Stocks", "spending_type": "Future"},
            "notes": "Invest"
        }
    ]

@pytest.fixture
def sample_dataframe(sample_transactions_data):
    """
    Returns a prepared Polars DataFrame from the sample data.
    """
    return summary_prepare_df(sample_transactions_data)


# ================================================================================================
#                                   DataFrame Preparation Tests
# ================================================================================================

def test_prepare_transactions_dataframe(sample_transactions_data):
    """Test that raw transactions are correctly converted to a DataFrame"""
    df = summary_prepare_df(sample_transactions_data)
    
    assert not df.is_empty()
    assert df.height == 5
    
    # Check column existence
    assert "amount" in df.columns
    assert "abs_amount" in df.columns
    assert "category_type" in df.columns
    assert "category_name" in df.columns
    
    # Check data integrity
    # Income
    income_row = df.filter(pl.col("category_type") == "income")
    assert income_row["amount"][0] == 5000.0
    
    # Expense
    expense_row = df.filter(pl.col("category_name") == "Rent")
    assert expense_row["amount"][0] == -1000.0
    assert expense_row["abs_amount"][0] == 1000.0  # Should be absolute value


def test_prepare_dataframe_empty():
    """Test handling of empty transaction list"""
    df = summary_prepare_df([])
    assert df.is_empty()
    assert "amount" in df.columns  # Structure should still exist


# ================================================================================================
#                                   Summary Calculation Tests
# ================================================================================================

def test_calculate_summary_totals(sample_dataframe):
    """Test calculation of financial totals (Income, Expense, Profit, etc)"""
    totals = _calculate_summary_totals(sample_dataframe)
    
    # Expected values based on sample_transactions_data
    # Income: 5000
    # Expense: 1000 (Rent) + 200 (Groceries) = 1200
    # Saving: 500
    # Investment: 300
    
    assert totals.income == 5000.0
    assert totals.expense == 1200.0
    assert totals.saving == 500.0
    assert totals.investment == 300.0
    
    # Profit = Income - Expense - Investment
    # 5000 - 1200 - 300 = 3500
    assert totals.profit == 3500.0
    
    # Net Cash Flow = Profit - Saving
    # 3500 - 500 = 3000
    assert totals.net_cash_flow == 3000.0


def test_calculate_period_comparison():
    """Test period comparison logic (deltas and percentages)"""
    current = SummaryTotals(
        income=10000.0, expense=5000.0, saving=2000.0, investment=1000.0, profit=4000.0, net_cash_flow=2000.0
    )
    previous = SummaryTotals(
        income=8000.0, expense=4000.0, saving=1000.0, investment=1000.0, profit=3000.0, net_cash_flow=2000.0
    )
    
    comp = _calculate_period_comparison(current, previous)
    
    # Income: 10000 vs 8000 -> +2000 (+25%)
    assert comp.income_delta == 2000.0
    assert comp.income_delta_pct == 25.0
    
    # Expense: 5000 vs 4000 -> +1000 (+25%)
    assert comp.expense_delta == 1000.0
    assert comp.expense_delta_pct == 25.0
    
    # Saving: 2000 vs 1000 -> +100%
    assert comp.saving_delta_pct == 100.0
    
    # Investment: 1000 vs 1000 -> 0%
    assert comp.investment_delta_pct == 0.0
    
    # Tests zero division safety
    zero_prev = SummaryTotals()
    comp_zero = _calculate_period_comparison(current, zero_prev)
    assert comp_zero.income_delta_pct == 100.0  # Or whatever fallback defined


# ================================================================================================
#                                   Monthly Calculation Tests
# ================================================================================================

def test_calculate_run_rate(sample_dataframe):
    """Test run rate calculation logic"""
    # Note: Run rate depends on "today". We simulate by constructing the DF accordingly.
    # The function _calculate_run_rate uses date.today() internally, so testing "current month" logic
    # is tricky without mocking date.today().
    # However, we can test "past month" logic easily (year=2020) where days_elapsed = total_days.
    
    # Total expenses in sample: 1200
    # Analyzing Jan 2026 (assuming it's in the past relative to the code or fully elapsed logic)
    # If we pass a past date, days_remaining should be 0, projected = actual.
    
    from datetime import date
    current_year = date.today().year
    past_year = current_year - 1
    
    forecast = _calculate_run_rate(sample_dataframe, year=past_year, month=1)
    
    # For a past month, projection should equal actual expenses
    assert forecast.projected_month_end_expenses == 1200.0
    assert forecast.days_remaining == 0


def test_calculate_day_split(sample_dataframe):
    """Test weekday vs weekend spending split"""
    # Dates in sample:
    # 2026-01-05 (Mon) -> 1000 (Rent)
    # 2026-01-10 (Sat) -> 200 (Groceries)
    
    split = _calculate_day_split(sample_dataframe)
    
    # Weekday average: 1 day (Mon) with 1000 -> 1000
    # Weekend average: 1 day (Sat) with 200 -> 200
    
    assert split.average_weekday_spend == 1000.0
    assert split.average_weekend_spend == 200.0


# ================================================================================================
#                                   Budget Calculation Tests
# ================================================================================================

from backend.schemas.base import BudgetPlanRow
from backend.helper.calculations.budgets_calc import _calculate_budget_view

@pytest.fixture
def sample_budget_plan_rows():
    """
    Returns a list of BudgetPlanRow objects for testing.
    """
    return [
        BudgetPlanRow(category_id=1, group="Income", name="Salary", amount=Decimal("5000.0"), include_in_total=True),
        BudgetPlanRow(category_id=2, group="Expense", name="Rent", amount=Decimal("1000.0"), include_in_total=True),
        BudgetPlanRow(category_id=3, group="Savings", name="Emergency Fund", amount=Decimal("500.0"), include_in_total=True),
        BudgetPlanRow(category_id=4, group="Investments", name="Stocks", amount=Decimal("300.0"), include_in_total=True),
        BudgetPlanRow(category_id=5, group="Expense", name="Groceries", amount=Decimal("0.0"), include_in_total=True), # Zero planned
        BudgetPlanRow(category_id=6, group="Expense", name="Unused", amount=Decimal("100.0"), include_in_total=True), # No actuals
    ]

@pytest.fixture
def sample_budget_actuals():
    """
    Returns a map of category_id -> total_amount (actuals).
    """
    return {
        1: Decimal("5000.0"),  # Income matched
        2: Decimal("-1200.0"), # Rent overspent (stored as negative in DB for expenses usually, or positive? 
                               # Note: logic in calc expects actuals from DB. In DB expenses are usually negative?
                               # Let's check logic: "if group_key != 'income': actual_val = -actual_val"
                               # This implies expenses come in as Negative values from DB aggregation if they are debits.
                               # Let's assume standard behavior: Income +, Expense -.
        3: Decimal("-500.0"),  # Savings matched
        4: Decimal("-330.0"),  # Investments over contributed
        5: Decimal("-50.0"),   # Groceries spent but 0 planned
    }

def test_calculate_budget_view(sample_budget_plan_rows, sample_budget_actuals):
    """Test full budget view calculation"""
    
    # We pass the sample data
    # Note: month/year arguments are just for the message in response, not logic
    resp = _calculate_budget_view(
        plan_rows=sample_budget_plan_rows,
        actuals_map=sample_budget_actuals,
        month=1,
        year=2026
    )
    
    assert resp.success is True
    
    # Check Summary
    # Income: 5000
    # Expense: 1000 + 0 + 100 = 1100
    # Savings: 500
    # Investment: 300
    # Remaining: 5000 - 1100 - 500 - 300 = 3100
    assert resp.summary.total_income == 5000.0
    assert resp.summary.total_expense == 1100.0
    assert resp.summary.total_savings == 500.0
    assert resp.summary.total_investments == 300.0
    assert resp.summary.remaining_budget == 3100.0
    
    # Check Rows Logic
    
    # Income (Salary)
    # Planned 5000, Actual 5000 -> Diff 0%
    salary = next(r for r in resp.income_rows if r.name == "Salary")
    assert salary.amount == 5000.0
    assert salary.actual_amount == 5000.0
    assert salary.difference_pct == 0.0
    
    # Expense (Rent)
    # Planned 1000, Actual -1200 -> Inverted to 1200 for view
    # Diff: (1200 - 1000) / 1000 = 0.2 -> 20%
    rent = next(r for r in resp.expense_rows if r.name == "Rent")
    assert rent.amount == 1000.0
    assert rent.actual_amount == 1200.0
    assert rent.difference_pct == 20.0
    
    # Expense (Groceries)
    # Planned 0, Actual -50 -> Inverted 50
    # Diff: (50 - 0) / 0 -> Correctly handled as 0 in code to avoid ZeroDivision
    groceries = next(r for r in resp.expense_rows if r.name == "Groceries")
    assert groceries.amount == 0.0
    assert groceries.actual_amount == 50.0
    assert groceries.difference_pct == 0.0
    
    # Expense (Unused)
    # Planned 100, Actual None (0 default) -> Inverted 0
    # Diff: (0 - 100) / 100 = -1.0 -> -100%
    unused = next(r for r in resp.expense_rows if r.name == "Unused")
    assert unused.amount == 100.0
    assert unused.actual_amount == 0.0
    assert unused.difference_pct == -100.0


