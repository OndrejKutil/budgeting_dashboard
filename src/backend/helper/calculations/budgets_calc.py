import datetime
import logging
from decimal import Decimal

from ...helper.columns import BUDGET_COLUMNS, TRANSACTION_TAGS_COLUMNS, TRANSACTIONS_COLUMNS
from ...schemas.base import BudgetPlan, BudgetPlanRow
from ...schemas.responses import (
    BudgetResponse,
    BudgetSummaryResponse,
    ExpenseRowResponse,
    IncomeRowResponse,
    InvestmentRowResponse,
    SavingsRowResponse,
)

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
    from ...data.database import get_db_client

    try:
        supabase = get_db_client(access_token)

        # 1. Fetch the plan
        plan_response = (
            supabase.table("fct_budgets")
            .select(BUDGET_COLUMNS.PLAN_JSON.value)
            .eq(BUDGET_COLUMNS.MONTH.value, month)
            .eq(BUDGET_COLUMNS.YEAR.value, year)
            .limit(1)
            .execute()
        )

        plan_rows: list[BudgetPlanRow] = []
        if plan_response.data and len(plan_response.data) > 0:
            raw_plan = plan_response.data[0].get(BUDGET_COLUMNS.PLAN_JSON.value)
            if raw_plan:
                plan_model = BudgetPlan(**raw_plan)
                plan_rows = plan_model.rows

        # 2. Collect category IDs and tag IDs needed
        category_ids = list({cid for row in plan_rows if row.category_ids for cid in row.category_ids})
        tag_ids_needed = list({tid for row in plan_rows if row.tags for tid in row.tags})

        # 3. Fetch transactions (actuals)
        actuals_map: dict[int, Decimal] = {}  # category_id -> total_amount
        tx_data: list[dict] = []
        tx_tag_map: dict[str, set[int]] = {}  # transaction_id -> set of tag_ids

        if category_ids or tag_ids_needed:
            start_date = datetime.date(year, month, 1)
            if month == 12:
                next_month = datetime.date(year + 1, 1, 1)
            else:
                next_month = datetime.date(year, month + 1, 1)
            end_date = next_month - datetime.timedelta(days=1)

            # Include id_pk when we need tag filtering
            select_cols = f"{TRANSACTIONS_COLUMNS.CATEGORY_ID.value},{TRANSACTIONS_COLUMNS.AMOUNT.value}"
            if tag_ids_needed:
                select_cols = f"id_pk,{select_cols}"

            query = supabase.table("fct_transactions").select(select_cols)
            query = query.gte(TRANSACTIONS_COLUMNS.DATE.value, start_date.isoformat())
            query = query.lte(TRANSACTIONS_COLUMNS.DATE.value, end_date.isoformat())

            # Filter by categories when any exist (avoids fetching all transactions when only tags are used)
            if category_ids and not tag_ids_needed:
                query = query.in_(TRANSACTIONS_COLUMNS.CATEGORY_ID.value, category_ids)

            tx_response = query.execute()

            if tx_response.data:
                tx_data = tx_response.data
                for tx in tx_data:
                    c_id = tx.get(TRANSACTIONS_COLUMNS.CATEGORY_ID.value)
                    amt = tx.get(TRANSACTIONS_COLUMNS.AMOUNT.value, 0)
                    if c_id is not None:
                        current = actuals_map.get(c_id, Decimal(0))
                        actuals_map[c_id] = current + Decimal(str(amt))

        # 4. Fetch transaction-tag mappings if needed
        if tag_ids_needed:
            tag_tx_response = (
                supabase.table("fct_transaction_tags")
                .select(
                    f"{TRANSACTION_TAGS_COLUMNS.TRANSACTION_ID.value},"
                    f"{TRANSACTION_TAGS_COLUMNS.TAG_ID.value}"
                )
                .in_(TRANSACTION_TAGS_COLUMNS.TAG_ID.value, tag_ids_needed)
                .execute()
            )
            if tag_tx_response.data:
                for item in tag_tx_response.data:
                    tx_id = item.get(TRANSACTION_TAGS_COLUMNS.TRANSACTION_ID.value)
                    tag_id = item.get(TRANSACTION_TAGS_COLUMNS.TAG_ID.value)
                    if tx_id is not None and tag_id is not None:
                        tx_tag_map.setdefault(tx_id, set()).add(tag_id)

        return _calculate_budget_view(
            plan_rows, actuals_map, month, year,
            tx_data=tx_data if tag_ids_needed else None,
            tx_tag_map=tx_tag_map if tag_ids_needed else None,
        )

    except Exception as e:
        logger.error(f"Error formulating budget view: {str(e)}")
        raise e


def _calculate_budget_view(
    plan_rows: list[BudgetPlanRow],
    actuals_map: dict[int, Decimal],
    month: int,
    year: int,
    tx_data: list[dict] | None = None,
    tx_tag_map: dict[str, set[int]] | None = None,
) -> BudgetResponse:
    """
    Pure calculation function for budget view.
    """
    income_rows: list[IncomeRowResponse] = []
    expense_rows: list[ExpenseRowResponse] = []
    savings_rows: list[SavingsRowResponse] = []
    investment_rows: list[InvestmentRowResponse] = []

    total_income_planned = Decimal(0)
    total_expense_planned = Decimal(0)
    total_savings_planned = Decimal(0)
    total_investments_planned = Decimal(0)

    category_id_col = TRANSACTIONS_COLUMNS.CATEGORY_ID.value

    for row in plan_rows:
        actual: Decimal | None = None
        diff_pct: Decimal | None = None

        group_key = row.group.lower().strip()

        has_cats = bool(row.category_ids)
        has_tags = bool(row.tags)

        if has_cats or has_tags:
            actual_val = Decimal(0)

            if has_tags and tx_data is not None and tx_tag_map is not None:
                # Tag-filtered path (optionally also category-filtered)
                row_tag_set = set(row.tags)  # type: ignore[arg-type]
                for tx in tx_data:
                    tx_id = tx.get("id_pk")
                    if tx_id is None:
                        continue
                    if has_cats and tx.get(category_id_col) not in row.category_ids:
                        continue
                    tags_on_tx = tx_tag_map.get(tx_id)
                    if tags_on_tx and not row_tag_set.isdisjoint(tags_on_tx):
                        actual_val += Decimal(str(tx.get(TRANSACTIONS_COLUMNS.AMOUNT.value, 0)))
            elif has_cats:
                # Category-only path
                actual_val = sum(
                    (actuals_map.get(cid, Decimal(0)) for cid in row.category_ids),  # type: ignore[union-attr]
                    Decimal(0),
                )

            # Invert sign for non-income groups
            if group_key != "income":
                actual_val = -actual_val

            actual = actual_val

            if row.amount != 0:
                diff_pct = ((actual - row.amount) / row.amount) * 100
            else:
                diff_pct = Decimal(0)

        # Accumulate planned totals
        if row.include_in_total:
            if group_key == "income":
                total_income_planned += row.amount
            elif group_key == "expense":
                total_expense_planned += row.amount
            elif group_key in ("saving", "savings"):
                total_savings_planned += row.amount
            elif group_key in ("investment", "investments"):
                total_investments_planned += row.amount

        # Build response rows
        if group_key == "income":
            income_rows.append(IncomeRowResponse(
                name=row.name,
                amount=row.amount,
                actual_amount=actual,
                difference_pct=diff_pct,
                category_ids=row.category_ids,
                tags=row.tags,
                include_in_total=row.include_in_total
            ))
        elif group_key == "expense":
            expense_rows.append(ExpenseRowResponse(
                name=row.name,
                amount=row.amount,
                actual_amount=actual,
                difference_pct=diff_pct,
                category_ids=row.category_ids,
                tags=row.tags,
                include_in_total=row.include_in_total
            ))
        elif group_key in ("saving", "savings"):
            savings_rows.append(SavingsRowResponse(
                name=row.name,
                amount=row.amount,
                actual_amount=actual,
                difference_pct=diff_pct,
                category_ids=row.category_ids,
                tags=row.tags,
                include_in_total=row.include_in_total
            ))
        elif group_key in ("investment", "investments"):
            investment_rows.append(InvestmentRowResponse(
                name=row.name,
                amount=row.amount,
                actual_amount=actual,
                difference_pct=diff_pct,
                category_ids=row.category_ids,
                tags=row.tags,
                include_in_total=row.include_in_total
            ))

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
