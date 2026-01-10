
import sys
import os
import json
from datetime import date
from decimal import Decimal
import pandas as pd

# Add src to path
sys.path.append(os.path.join(os.getcwd(), "src"))

# Mock environment variables before importing modules that need them
os.environ["PROJECT_URL"] = "http://mock-url"
os.environ["ANON_KEY"] = "mock-key"

from backend.helper.calculations import monthly_page_calc, summary_calc, yearly_page_calc

def get_sample_transactions():
    """Create sample transaction data matching the DB structure"""
    return [
        {
            "amount": 3500.0,
            "date": "2026-01-04",
            "categories": {
                "type": "income",
                "category_name": "Salary",
                "spending_type": ""
            },
            "savings_fund_id": None,
            # For yearly calc which uses dim_categories
            "dim_categories": {
                "type": "income",
                "category_name": "Salary",
                "spending_type": ""
            }
        },
        {
            "amount": -1000.0,
            "date": "2026-01-05",
            "categories": {
                "type": "expense",
                "category_name": "Rent",
                "spending_type": "Core"
            },
            "savings_fund_id": None,
            "dim_categories": {
                "type": "expense",
                "category_name": "Rent",
                "spending_type": "Core"
            }
        },
        {
            "amount": -500.0,
            "date": "2026-01-06",
            "categories": {
                "type": "saving",
                "category_name": "Emergency Fund",
                "spending_type": "Future"
            },
            "savings_fund_id": "some-uuid",
            "dim_categories": {
                "type": "saving",
                "category_name": "Emergency Fund",
                "spending_type": "Future"
            }
        },
        {
            "amount": -200.0,
            "date": "2026-01-07",
            "categories": {
                "type": "investment",
                "category_name": "ETF",
                "spending_type": "Future"
            },
            "savings_fund_id": None,
            "dim_categories": {
                "type": "investment",
                "category_name": "ETF",
                "spending_type": "Future"
            }
        }
    ]

def verify_monthly_calc():
    print("Verifying Monthly Calc...")
    transactions = get_sample_transactions()
    
    # Check if we are in pandas or polars mode (by checking return type or just running it)
    # The function expects a list of dicts.
    
    # We call internal helpers or just prepare_dataframe and calculate_totals if we can.
    # Since _monthly_analytics does DB fetch, we test the logic functions.
    
    df = monthly_page_calc._prepare_transactions_dataframe(transactions)
    totals = monthly_page_calc._calculate_monthly_totals(df)
    
    assert totals.income == 3500.0, f"Expected 3500.0, got {totals.income}"
    assert totals.expenses == 1000.0, f"Expected 1000.0, got {totals.expenses}"
    assert totals.savings == 500.0, f"Expected 500.0, got {totals.savings}"
    assert totals.investments == 200.0, f"Expected 200.0, got {totals.investments}"
    
    # Profit = Income - Expenses - Investments (Savings are cashflow neutral in profit calc usually? Check logic)
    # Logic in file: profit = total_income_wo_savings_funds - total_expenses - total_investments
    # 3500 - 1000 - 200 = 2300
    assert totals.profit == 2300.0, f"Expected 2300.0, got {totals.profit}"
    
    print("Monthly Calc Verification Passed!")

def verify_summary_calc():
    print("Verifying Summary Calc...")
    transactions = get_sample_transactions()
    df = summary_calc._prepare_transactions_dataframe(transactions)
    totals = summary_calc._calculate_summary_totals(df)
    
    assert totals.income == 3500.0
    assert totals.expense == 1000.0
    assert totals.saving == 500.0
    assert totals.investment == 200.0
    
    print("Summary Calc Verification Passed!")

def verify_yearly_calc():
    print("Verifying Yearly Calc...")
    transactions = get_sample_transactions()
    df = yearly_page_calc._prepare_transactions_dataframe(transactions)
    totals = yearly_page_calc._calculate_yearly_totals(df)
    
    assert totals.income == 3500.0
    assert totals.expense == 1000.0
    assert totals.saving == 500.0
    assert totals.investment == 200.0
    
    breakdowns = yearly_page_calc._calculate_category_breakdowns(df)
    assert breakdowns.by_category['Salary'] == 3500.0
    # Expenses/Savings/Investments stored as negative in basic sum if just grouped? 
    # Logic: df.groupby...['amount'].sum() -> Salary: 3500, Rent: -1000.
    # Check yearly_page_calc logic: 
    # by_category = df.groupby('category_name')['amount'].sum()
    assert breakdowns.by_category['Rent'] == -1000.0
    
    print("Yearly Calc Verification Passed!")

if __name__ == "__main__":
    try:
        verify_monthly_calc()
        verify_summary_calc()
        verify_yearly_calc()
        print("ALL VERIFICATIONS PASSED")
    except Exception as e:
        print(f"VERIFICATION FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
