import polars as pl
from decimal import Decimal
from typing import List, Optional
import datetime
import logging

from ...data.database import get_db_client
from ...schemas.base import BudgetPlan, BudgetPlanRow
from ...schemas.responses import (
    BudgetResponse, 
    BudgetSummaryResponse,
    IncomeRowResponse,
    ExpenseRowResponse,
    SavingsRowResponse,
    InvestmentRowResponse
)
from ...helper.columns import BUDGET_COLUMNS, TRANSACTIONS_COLUMNS

logger = logging.getLogger(__name__)

def get_month_budget_view(
    month: int,
    year: int,
    access_token: str
) -> BudgetResponse:
    """
    Fetch the budget plan for the given month/year, merge with actuals,
    and return the structured response.
    """
    try:
        supabase = get_db_client(access_token)

        # 1. Fetch the plan
        # RLS ensures we only see the user's own plan
        plan_response = (
            supabase.table("fct_budgets")
            .select(BUDGET_COLUMNS.PLAN_JSON.value)
            .eq(BUDGET_COLUMNS.MONTH.value, month)
            .eq(BUDGET_COLUMNS.YEAR.value, year)
            .maybe_single()
            .execute()
        )

        plan_rows: List[BudgetPlanRow] = []
        if plan_response.data:
            # Parse and validate the plan
            # The database column is 'plan_json', which should match BudgetPlan structure
            raw_plan = plan_response.data.get(BUDGET_COLUMNS.PLAN_JSON.value)
            if raw_plan:
                plan_model = BudgetPlan(**raw_plan)
                plan_rows = plan_model.rows
        
        # If no plan exists, we have an empty list of rows. We still proceed to return empty structures.

        # 2. Identify categories to fetch
        # Optimization: only fetch transactions for categories that exist in the plan
        category_ids = [row.category_id for row in plan_rows if row.category_id is not None]
        
        # 3. Fetch transactions (Actuals)
        # We need to aggregate by category_id
        # If the plan has no categories linked, we technically don't need actuals, 
        # but let's be safe. If list is empty, Supabase `in_` with empty list might error or return nothing.
        
        actuals_map: dict[int, Decimal] = {} # category_id -> total_amount

        if category_ids:
            # Build query
            # Start of month
            start_date = datetime.date(year, month, 1)
            # End of month handling (careful with Dec)
            if month == 12:
                next_month = datetime.date(year + 1, 1, 1)
            else:
                next_month = datetime.date(year, month + 1, 1)
            # Last day is next_month - 1 day
            end_date = next_month - datetime.timedelta(days=1)

            query = supabase.table("fct_transactions").select(
                f"{TRANSACTIONS_COLUMNS.CATEGORY_ID.value},{TRANSACTIONS_COLUMNS.AMOUNT.value}"
            )
            # Time range filter
            query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
            query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())
            # Category filter
            query = query.in_(TRANSACTIONS_COLUMNS.CATEGORY_ID.value, category_ids)
            
            tx_response = query.execute()
            
            if tx_response.data:
                # Aggregate in memory (python) or Polars. 
                # Since we filtered by specific categories, data volume should be manageable.
                # Let's use simple python dict for speed on small lists.
                for tx in tx_response.data:
                    c_id = tx.get(TRANSACTIONS_COLUMNS.CATEGORY_ID.value)
                    amt = tx.get(TRANSACTIONS_COLUMNS.AMOUNT.value, 0)
                    if c_id is not None:
                        current = actuals_map.get(c_id, Decimal(0))
                        actuals_map[c_id] = current + Decimal(str(amt))

        # 4. Enrich Plan Rows & Split by Group
        income_rows: List[IncomeRowResponse] = []
        expense_rows: List[ExpenseRowResponse] = []
        savings_rows: List[SavingsRowResponse] = []
        investment_rows: List[InvestmentRowResponse] = []

        total_income_planned = Decimal(0)
        total_expense_planned = Decimal(0)
        total_savings_planned = Decimal(0)
        total_investments_planned = Decimal(0)

        for row in plan_rows:
            # Calculate actuals
            # If category_id is None, actuals are None (not 0) and diff is None
            actual: Optional[Decimal] = None
            diff_pct: Optional[Decimal] = None
            
            group_key = row.group.lower().strip() # Define group_key here as it's always needed

            if row.category_id is not None:
                actual_val = actuals_map.get(row.category_id, Decimal(0))
                
                # Handle signs for comparison
                # We invert actuals for non-income groups so we can compare positive vs positive.
                if group_key != "income":
                    actual_val = -actual_val
                
                actual = actual_val

                # Calculate metrics
                # Avoid division by zero if amount is 0
                if row.amount != 0:
                    diff_pct = ((actual - row.amount) / row.amount) * 100
                else:
                    # If planned amount is 0, and actual is also 0, diff is 0.
                    # If planned amount is 0, and actual is non-zero, diff is infinite (or undefined).
                    # For display purposes, we'll set it to 0 if planned is 0.
                    diff_pct = Decimal(0) 
            
            # Accumulate totals (Planned only)
            if row.include_in_total:
                if group_key == "income":
                    total_income_planned += row.amount
                elif group_key == "expense":
                    total_expense_planned += row.amount
                elif group_key == "saving": # handling 'saving' vs 'savings'
                    total_savings_planned += row.amount
                elif group_key == "savings":
                    total_savings_planned += row.amount
                elif group_key == "investment": # handling 'investment' vs 'investments'
                    total_investments_planned += row.amount
                elif group_key == "investments":
                    total_investments_planned += row.amount

            # Construct display objects
            # Use explicit arguments to avoid Mypy errors with unpacking
            
            if group_key == "income":
                income_rows.append(IncomeRowResponse(
                    name=row.name,
                    amount=row.amount,
                    actual_amount=actual,
                    difference_pct=diff_pct
                ))
            elif group_key == "expense":
                expense_rows.append(ExpenseRowResponse(
                    name=row.name,
                    amount=row.amount,
                    actual_amount=actual,
                    difference_pct=diff_pct
                ))
            elif group_key in ["saving", "savings"]:
                savings_rows.append(SavingsRowResponse(
                    name=row.name,
                    amount=row.amount,
                    actual_amount=actual,
                    difference_pct=diff_pct
                ))
            elif group_key in ["investment", "investments"]:
                investment_rows.append(InvestmentRowResponse(
                    name=row.name,
                    amount=row.amount,
                    actual_amount=actual,
                    difference_pct=diff_pct
                ))

        # 5. Summary Calculation
        remaining = total_income_planned - total_expense_planned - total_savings_planned - total_investments_planned
        
        summary = BudgetSummaryResponse(
            total_income=total_income_planned,
            total_expense=total_expense_planned,
            total_savings=total_savings_planned,
            total_investments=total_investments_planned,
            remaining_budget=remaining
        )

        return BudgetResponse(
            summary=summary,
            income_rows=income_rows,
            expense_rows=expense_rows,
            savings_rows=savings_rows,
            investment_rows=investment_rows,
            success=True,
            message=f"Budget for {month}/{year} retrieved successfully"
        )

    except Exception as e:
        logger.error(f"Error formulating budget view: {str(e)}")
        raise e
