# fastapi
import fastapi
from fastapi import APIRouter, Depends, status, Request
from fastapi.responses import StreamingResponse

# auth dependencies
from ..auth.auth import api_key_auth, get_current_user

# rate limiting
from ..helper.rate_limiter import limiter, RATE_LIMITS

# logging
import logging

from ..data.database import get_db_client

# other
import csv
import io
from datetime import datetime

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

logger = logging.getLogger(__name__)

# ================================================================================================
#                                   Router Configuration
# ================================================================================================

router = APIRouter()


@router.get("/transactions")
@limiter.limit(RATE_LIMITS["read_only"])
async def export_transactions_csv(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> StreamingResponse:
    """
    Export all transactions as a CSV file.
    Joins transactions with categories, accounts, and savings funds
    to produce a single denormalized export.
    """

    try:
        client = get_db_client(user["access_token"])

        # Fetch all transactions with joined data using Supabase foreign key joins
        response = (
            client.table("fct_transactions")
            .select(
                "date, amount, notes, created_at, "
                "dim_categories_users(category_name, type, spending_type), "
                "dim_accounts(account_name, type), "
                "dim_savings_funds(fund_name)"
            )
            .order("date", desc=True)
            .execute()
        )

        # Build CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)

        # Header row
        writer.writerow([
            "date",
            "amount",
            "notes",
            "category_name",
            "category_type",
            "spending_type",
            "account_name",
            "account_type",
            "savings_fund_name",
            "created_at",
        ])

        # Data rows
        for row in response.data:
            category = row.get("dim_categories_users") or {}
            account = row.get("dim_accounts") or {}
            fund = row.get("dim_savings_funds") or {}

            writer.writerow([
                row.get("date", ""),
                row.get("amount", ""),
                row.get("notes", ""),
                category.get("category_name", ""),
                category.get("type", ""),
                category.get("spending_type", ""),
                account.get("account_name", ""),
                account.get("type", ""),
                fund.get("fund_name", ""),
                row.get("created_at", ""),
            ])

        output.seek(0)

        timestamp = datetime.now().strftime("%Y-%m-%d")
        filename = f"transactions_export_{timestamp}.csv"

        # Encode with UTF-8 BOM so Excel correctly handles Czech characters (á, č, ž, etc.)
        csv_content = "\ufeff" + output.getvalue()

        return StreamingResponse(
            iter([csv_content.encode("utf-8")]),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except Exception as e:
        logger.error(f"Transaction export failed: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export transactions",
        )
