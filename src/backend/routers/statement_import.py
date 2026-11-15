"""
Bank statement import (CSV / XLSX) -- endpoints only; the rules live in helper/statement_import/.

Preview parses a file into draft rows and writes nothing; the frontend keeps the drafts while the
user reviews them and sends the reviewed rows to commit. Every import is one fct_import_batches
row, which is what undo deletes. See docs/specs/statement-import.md.
"""

import datetime
import logging
import uuid
from collections.abc import Callable
from decimal import Decimal
from typing import Any

import fastapi
from fastapi import APIRouter, Depends, File, Form, Request, UploadFile, status
from pydantic import ValidationError

from ..auth.auth import api_key_auth, get_current_user
from ..data.database import get_db_client
from ..helper.columns import (
    ACCOUNTS_COLUMNS,
    CATEGORIES_COLUMNS,
    IMPORT_BATCHES_COLUMNS,
    SAVINGS_FUNDS_COLUMNS,
    TRANSACTIONS_COLUMNS,
)
from ..helper.environment import REASONING_MODEL
from ..helper.features import is_feature_enabled
from ..helper.llm_client import get_llm_client
from ..helper.merchant_history import MerchantHistory, fetch_history
from ..helper.rate_limiter import RATE_LIMITS, limiter
from ..helper.statement_import import StatementFileError
from ..helper.statement_import.balance import (
    EXCLUDE_TYPE,
    STARTING_BALANCE_NAME,
    STARTING_BALANCE_NOTE,
    adjustment_date,
    balance_adjustment,
    fund_opening,
    pick_starting_balance_category,
)
from ..helper.statement_import.duplicates import fetch_existing, mark_duplicates
from ..helper.statement_import.mapping import (
    PRESETS_BY_KEY,
    Preset,
    detect_preset,
    guess_mapping,
    mapping_applies,
)
from ..helper.statement_import.normalize import NormalizedRow, check_file, normalize_sheet
from ..helper.statement_import.reader import SheetData, cell_text, read_file
from ..helper.statement_import.suggest import (
    Suggestion,
    group_rows,
    history_suggestions,
    model_suggestions,
)
from ..schemas.base import (
    FieldSource,
    ImportBatchData,
    StatementCommitData,
    StatementDraftRow,
    StatementMapping,
    StatementPreviewData,
)
from ..schemas.requests import StatementCommitRequest
from ..schemas.responses import (
    ImportBatchDeleteData,
    ImportBatchDeleteResponse,
    ImportBatchesResponse,
    StatementCommitResponse,
    StatementPreviewResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

#? This router prefix is /statement-import

FEATURE_KEY = "statement_import"

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
SAMPLE_ROWS = 10
MAX_BATCHES_LISTED = 100
_FETCH_PAGE_SIZE = 1000

BATCHES_TABLE = "fct_import_batches"

_ALLOWED_EXTENSIONS = (".csv", ".xlsx")
# Browsers and OSes disagree on what a .csv is (text/csv, application/vnd.ms-excel,
# text/comma-separated-values, ...), so the extension decides and the content type is only used
# to reject things that are clearly not a spreadsheet.
_REJECTED_CONTENT_TYPE_PREFIXES = ("image/", "video/", "audio/", "application/pdf", "application/zip")


# ================================================================================================
#                                           Helpers
# ================================================================================================

def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
    except ValueError:
        return False
    return True


def _require_feature(access_token: str) -> None:
    if not is_feature_enabled(access_token, FEATURE_KEY):
        raise fastapi.HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Statement import is not enabled for this account.",
        )


def _fetch_account(client, account_id: str) -> dict:
    """The user's account (RLS-scoped), or 404."""
    if not _is_uuid(account_id):
        raise fastapi.HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")
    response = (
        client.table("dim_accounts")
        .select(f"{ACCOUNTS_COLUMNS.ID.value},{ACCOUNTS_COLUMNS.NAME.value},{ACCOUNTS_COLUMNS.CURRENCY.value}")
        .eq(ACCOUNTS_COLUMNS.ID.value, account_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise fastapi.HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")
    return dict(response.data[0])


def _fetch_categories(client) -> list[dict]:
    """All of the user's categories (active or not), as rows of dim_categories_users."""
    fields = ",".join([
        CATEGORIES_COLUMNS.ID.value,
        CATEGORIES_COLUMNS.NAME.value,
        CATEGORIES_COLUMNS.TYPE.value,
        CATEGORIES_COLUMNS.SPENDING_TYPE.value,
        CATEGORIES_COLUMNS.IS_ACTIVE.value,
    ])
    return client.table("dim_categories_users").select(fields).execute().data or []


def _categories_for_model(categories: list[dict]) -> list[dict]:
    return [
        {
            "id": c[CATEGORIES_COLUMNS.ID.value],
            "name": c[CATEGORIES_COLUMNS.NAME.value],
            "type": c[CATEGORIES_COLUMNS.TYPE.value],
            "spending_type": c.get(CATEGORIES_COLUMNS.SPENDING_TYPE.value),
        }
        for c in categories
        if c.get(CATEGORIES_COLUMNS.IS_ACTIVE.value) is not False
    ]


def _saved_mapping(client, account_id: str, headers: list[str]) -> StatementMapping | None:
    """The mapping of this account's latest import, if every column it reads exists in this file."""
    response = (
        client.table(BATCHES_TABLE)
        .select(IMPORT_BATCHES_COLUMNS.MAPPING_JSON.value)
        .eq(IMPORT_BATCHES_COLUMNS.ACCOUNT_ID.value, account_id)
        .not_.is_(IMPORT_BATCHES_COLUMNS.MAPPING_JSON.value, "null")
        .order(IMPORT_BATCHES_COLUMNS.CREATED_AT.value, desc=True)
        .limit(1)
        .execute()
    )
    if not response.data:
        return None
    try:
        mapping = StatementMapping.model_validate(response.data[0][IMPORT_BATCHES_COLUMNS.MAPPING_JSON.value])
    except ValidationError:
        return None
    return mapping if mapping_applies(mapping, headers) else None


def resolve_mapping(
    sheet: SheetData,
    client_mapping: StatementMapping | None,
    saved: Callable[[], StatementMapping | None],
) -> tuple[StatementMapping | None, Preset | None]:
    """
    In order: the mapping the client sent, a preset whose headers are all present, this
    account's last mapping. (None, None) means the user has to map the columns.
    """
    if client_mapping is not None:
        if not mapping_applies(client_mapping, sheet.headers):
            raise StatementFileError("The chosen columns don't exist in this file.")
        # The mapping screen never applies preset-specific rules, but a client echoing a
        # preset's own mapping back should still get them.
        preset = next((p for p in PRESETS_BY_KEY.values() if p.mapping == client_mapping), None)
        return client_mapping, preset
    preset = detect_preset(sheet.headers)
    if preset is not None:
        return preset.mapping, preset
    return saved(), None


def _load_history(access_token: str) -> MerchantHistory:
    try:
        return fetch_history(get_db_client(access_token))
    except Exception as e:  # noqa: BLE001 -- history only improves suggestions
        logger.error("Loading merchant history failed; continuing without it")
        logger.info(f"Loading merchant history failed with error: {str(e)}")
        return MerchantHistory([])


def suggest_categories(
    rows: list[NormalizedRow],
    categories: list[dict],
    history: MerchantHistory,
    *,
    use_ai: bool = True,
) -> tuple[dict[int, Suggestion], bool]:
    """
    Row index -> suggestion, and whether suggestions are available. A model failure of any kind
    is logged and reported as unavailable; it never fails the preview. With `use_ai` off only the
    user's own history is used and nothing is sent to the model provider.
    """
    groups = group_rows(rows)
    model_categories = _categories_for_model(categories)
    category_ids = {c["id"] for c in model_categories}
    by_group = history_suggestions(groups, history, category_ids)
    available = True
    try:
        if use_ai and model_categories and len(by_group) < len(groups):
            by_group.update(
                model_suggestions(groups, set(by_group), model_categories, get_llm_client(), REASONING_MODEL)
            )
    except Exception as e:  # noqa: BLE001 -- rate limit, retired model, bad JSON, ...
        available = False
        logger.error("Statement import suggestion call failed; returning the preview without suggestions")
        logger.info(f"Statement import suggestion call failed with error type: {type(e).__name__}")

    by_row: dict[int, Suggestion] = {}
    for group_index, suggestion in by_group.items():
        for row_index in groups[group_index].row_indexes:
            by_row[row_index] = suggestion
    return by_row, available


def _draft(row: NormalizedRow, duplicate: bool, suggestion: Suggestion | None) -> StatementDraftRow:
    return StatementDraftRow(
        row_number=row.row_number,
        date=row.date,
        amount=row.amount,
        merchant=row.merchant,
        merchant_key=row.merchant_key or row.merchant.casefold(),
        notes=row.notes,
        category_id_fk=suggestion.category_id if suggestion else None,
        category_source=FieldSource(suggestion.source) if suggestion else FieldSource.NONE,
        duplicate=duplicate,
        own_transfer=row.own_transfer,
        warning=row.warning,
        error=row.error,
    )


def _sum_amounts(client, column: str, value: str, as_of: datetime.date) -> Decimal:
    """
    Sum of the transactions with `column` = `value` dated on or before `as_of`, all pages. Stated
    balances are the ones after the file's last row, so later transactions already in the ledger
    must not count -- otherwise importing an older file would be off by everything since.
    """
    query = (
        client.table("fct_transactions")
        .select(f"{TRANSACTIONS_COLUMNS.ID.value},{TRANSACTIONS_COLUMNS.AMOUNT.value}")
        .eq(column, value)
        .lte(TRANSACTIONS_COLUMNS.DATE.value, as_of.isoformat())
        .order(TRANSACTIONS_COLUMNS.ID.value)
    )
    total = Decimal(0)
    offset = 0
    while True:
        batch = query.range(offset, offset + _FETCH_PAGE_SIZE).execute().data or []
        total += sum((Decimal(str(r[TRANSACTIONS_COLUMNS.AMOUNT.value])) for r in batch), Decimal(0))
        if len(batch) < _FETCH_PAGE_SIZE:
            break
        offset += _FETCH_PAGE_SIZE
    return total


def _fetch_active_fund_ids(client) -> set[str]:
    response = (
        client.table("dim_savings_funds")
        .select(SAVINGS_FUNDS_COLUMNS.ID.value)
        .eq(SAVINGS_FUNDS_COLUMNS.IS_ACTIVE.value, True)
        .execute()
    )
    return {str(r[SAVINGS_FUNDS_COLUMNS.ID.value]) for r in response.data or []}


def _starting_balance_category(client, categories: list[dict], user_id: str) -> int:
    """The user's Starting Balance category, created from the template if they have no exclude one."""
    existing = pick_starting_balance_category(categories)
    if existing is not None:
        return int(existing)
    row: dict[str, Any] = {
        CATEGORIES_COLUMNS.NAME.value: STARTING_BALANCE_NAME,
        CATEGORIES_COLUMNS.TYPE.value: EXCLUDE_TYPE,
        CATEGORIES_COLUMNS.IS_ACTIVE.value: True,
        CATEGORIES_COLUMNS.USER_ID.value: user_id,
    }
    try:
        template = (
            client.table("dim_categories")
            .select(CATEGORIES_COLUMNS.SPENDING_TYPE.value)
            .eq(CATEGORIES_COLUMNS.NAME.value, STARTING_BALANCE_NAME)
            .limit(1)
            .execute()
        )
        if template.data and template.data[0].get(CATEGORIES_COLUMNS.SPENDING_TYPE.value):
            row[CATEGORIES_COLUMNS.SPENDING_TYPE.value] = template.data[0][CATEGORIES_COLUMNS.SPENDING_TYPE.value]
    except Exception as e:  # noqa: BLE001 -- the column default is fine too
        logger.info(f"Reading the Starting Balance template failed: {str(e)}")
    created = client.table("dim_categories_users").insert(row).execute()
    return int(created.data[0][CATEGORIES_COLUMNS.ID.value])


def _batch_data(row: dict) -> ImportBatchData:
    return ImportBatchData(**{k: row.get(k) for k in ImportBatchData.model_fields})


# ================================================================================================
#                                           Endpoints
# ================================================================================================

@router.post("/preview", response_model=StatementPreviewResponse)
@limiter.limit(RATE_LIMITS["bulk"])
async def preview_statement(
    request: Request,
    file: UploadFile = File(..., description="Bank statement export (.csv or .xlsx)"),
    account_id: str | None = Form(None, description="Account the file belongs to; omit before one exists"),
    mapping: str | None = Form(None, description="StatementMapping as JSON, from the mapping screen"),
    use_ai: bool = Form(True, description="False = suggest categories from the user's history only; nothing is sent to the model"),
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> StatementPreviewResponse:
    """
    Parse a statement into draft rows for review. Writes nothing.

    Without `account_id` (a new user who has no account yet) the duplicate and currency checks
    are skipped; the response's `preset` and `currency` prefill the create-account dialog, and
    the frontend previews again once the account exists.
    """
    try:
        _require_feature(user["access_token"])

        file_name = file.filename or ""
        if not file_name.lower().endswith(_ALLOWED_EXTENSIONS) or (
            (file.content_type or "").lower().startswith(_REJECTED_CONTENT_TYPE_PREFIXES)
        ):
            raise fastapi.HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Upload a .csv or .xlsx file exported from your bank.",
            )

        content = await file.read(MAX_UPLOAD_BYTES + 1)
        if not content:
            raise fastapi.HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is empty.")
        if len(content) > MAX_UPLOAD_BYTES:
            raise fastapi.HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"The file is too large. Maximum size is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
            )

        client = get_db_client(user["access_token"])
        account = _fetch_account(client, account_id) if account_id else None

        client_mapping: StatementMapping | None = None
        if mapping:
            try:
                client_mapping = StatementMapping.model_validate_json(mapping)
            except ValidationError:
                raise fastapi.HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="The column mapping is not valid."
                )

        sheet = read_file(content, file_name)
        resolved, preset = resolve_mapping(
            sheet,
            client_mapping,
            lambda: _saved_mapping(client, account_id, sheet.headers) if account_id else None,
        )

        logger.info(
            f"Statement preview - user_id: {user['user_id']}, bytes: {len(content)}, rows: {len(sheet.rows)}, "
            f"preset: {preset.key if preset else None}, mapped: {resolved is not None}"
        )

        if resolved is None:
            return StatementPreviewResponse(
                success=True,
                message="The columns of this file need to be mapped",
                data=StatementPreviewData(
                    needs_mapping=True,
                    headers=sheet.headers,
                    sample_rows=[[cell_text(c) for c in row] for row in sheet.rows[:SAMPLE_ROWS]],
                    mapping=guess_mapping(sheet.headers, sheet.rows),
                ),
            )

        rows = normalize_sheet(sheet, resolved, preset)
        valid = [r for r in rows if r.error is None]
        if not valid:
            raise StatementFileError(
                "None of the rows could be read. " + (rows[0].error or "") if rows else "The file has no rows."
            )
        file_currency = check_file(
            rows,
            account.get(ACCOUNTS_COLUMNS.CURRENCY.value) if account else None,
            account.get(ACCOUNTS_COLUMNS.NAME.value) if account else None,
        )
        date_from = min(r.date for r in valid if r.date)
        date_to = max(r.date for r in valid if r.date)

        duplicates: set[int] = set()
        if account_id:
            duplicates = mark_duplicates(rows, fetch_existing(client, account_id, date_from, date_to))

        categories = _fetch_categories(client)
        suggestions, available = suggest_categories(
            rows, categories, _load_history(user["access_token"]), use_ai=use_ai
        )

        drafts = [_draft(row, i in duplicates, suggestions.get(i)) for i, row in enumerate(rows)]
        return StatementPreviewResponse(
            success=True,
            message=f"Read {len(valid)} transaction(s)",
            data=StatementPreviewData(
                needs_mapping=False,
                headers=sheet.headers,
                mapping=resolved,
                preset=preset.data() if preset else None,
                rows=drafts,
                date_from=date_from,
                date_to=date_to,
                currency=file_currency or (account.get(ACCOUNTS_COLUMNS.CURRENCY.value) if account else None),
                suggestions_available=available,
                ai_skipped=not use_ai,
            ),
        )

    except fastapi.HTTPException:
        raise
    except StatementFileError as e:
        raise fastapi.HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error("Statement preview failed")
        logger.info(f"Statement preview failed with error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to read the statement"
        )


@router.post("/commit", response_model=StatementCommitResponse)
@limiter.limit(RATE_LIMITS["bulk"])
async def commit_statement(
    request: Request,
    payload: StatementCommitRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> StatementCommitResponse:
    """
    Save reviewed rows as transactions in one batch, plus the optional starting-balance
    adjustment. All rows go in one insert (one SQL statement, so all or nothing); if it fails
    the batch row is deleted again.
    """
    try:
        _require_feature(user["access_token"])
        client = get_db_client(user["access_token"])

        _fetch_account(client, payload.account_id)
        categories = _fetch_categories(client)
        own_category_ids = {int(c[CATEGORIES_COLUMNS.ID.value]) for c in categories}
        unknown = {r.category_id_fk for r in payload.rows} - own_category_ids
        if unknown:
            raise fastapi.HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Some rows use a category that doesn't exist. Reload the page and try again.",
            )

        stated_funds = [f.savings_fund_id_fk for f in payload.fund_balances]
        if len(set(stated_funds)) != len(stated_funds):
            raise fastapi.HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="A savings fund balance is given twice."
            )
        if stated_funds and set(stated_funds) - _fetch_active_fund_ids(client):
            raise fastapi.HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A savings fund doesn't exist. Reload the page and try again.",
            )

        dates = [r.date for r in payload.rows]
        # Stated balances are as of the file's last day, which may be after the last imported row
        # when the file ends with skipped rows (own transfers, duplicates).
        as_of = max(max(dates), payload.balance_date or max(dates))
        imported_sum = sum((r.amount for r in payload.rows), Decimal(0))

        # Opening amount per fund: what it needs to reach the stated balance (spec section 13).
        fund_openings: dict[str, Decimal] = {}
        for stated in payload.fund_balances:
            fund_id = stated.savings_fund_id_fk
            opening = fund_opening(
                stated.balance,
                -_sum_amounts(client, TRANSACTIONS_COLUMNS.SAVINGS_FUND_ID.value, fund_id, as_of),
            )
            if opening != 0:
                fund_openings[fund_id] = opening

        # One "Starting balance" row on the account: the account correction, plus the money each
        # fund opening takes out of the account, so fund openings never move the account balance.
        account_correction = Decimal(0)
        if payload.closing_balance is not None:
            account_correction = balance_adjustment(
                payload.closing_balance,
                _sum_amounts(client, TRANSACTIONS_COLUMNS.ACCOUNT_ID.value, payload.account_id, as_of),
                imported_sum,
            )
        adjustment: Decimal | None = account_correction + sum(fund_openings.values(), Decimal(0))
        if adjustment == 0:
            adjustment = None

        adjustment_category: int | None = None
        if adjustment is not None or fund_openings:
            adjustment_category = _starting_balance_category(client, categories, user["user_id"])

        batch_row = {
            IMPORT_BATCHES_COLUMNS.USER_ID.value: user["user_id"],
            IMPORT_BATCHES_COLUMNS.ACCOUNT_ID.value: payload.account_id,
            IMPORT_BATCHES_COLUMNS.FILE_NAME.value: payload.file_name,
            IMPORT_BATCHES_COLUMNS.PRESET.value: payload.preset,
            IMPORT_BATCHES_COLUMNS.MAPPING_JSON.value: payload.mapping.model_dump() if payload.mapping else None,
            IMPORT_BATCHES_COLUMNS.ROW_COUNT.value: len(payload.rows),
            IMPORT_BATCHES_COLUMNS.DATE_FROM.value: min(dates).isoformat(),
            IMPORT_BATCHES_COLUMNS.DATE_TO.value: max(dates).isoformat(),
        }
        batch = client.table(BATCHES_TABLE).insert(batch_row).execute().data[0]
        batch_id = batch[IMPORT_BATCHES_COLUMNS.ID.value]

        def transaction(
            date: datetime.date, amount: Decimal, notes: str | None, category_id: int, fund_id: str | None = None
        ) -> dict:
            return {
                TRANSACTIONS_COLUMNS.USER_ID.value: user["user_id"],
                TRANSACTIONS_COLUMNS.ACCOUNT_ID.value: payload.account_id,
                TRANSACTIONS_COLUMNS.CATEGORY_ID.value: category_id,
                TRANSACTIONS_COLUMNS.AMOUNT.value: float(amount),
                TRANSACTIONS_COLUMNS.DATE.value: date.isoformat(),
                TRANSACTIONS_COLUMNS.NOTES.value: notes,
                TRANSACTIONS_COLUMNS.SAVINGS_FUND_ID.value: fund_id,
                TRANSACTIONS_COLUMNS.IMPORT_BATCH_ID.value: batch_id,
            }

        transactions = [transaction(r.date, r.amount, r.notes, r.category_id_fk) for r in payload.rows]
        # Adjustments go in the same insert as the rows, so they are saved (and undone) together.
        if adjustment_category is not None:
            opening_date = adjustment_date(min(dates))
            if adjustment is not None:
                transactions.append(
                    transaction(opening_date, adjustment, STARTING_BALANCE_NOTE, adjustment_category)
                )
            for fund_id, opening in fund_openings.items():
                # Negative = money into the fund (a fund's balance is minus the sum of its rows).
                transactions.append(
                    transaction(opening_date, -opening, STARTING_BALANCE_NOTE, adjustment_category, fund_id)
                )

        try:
            client.table("fct_transactions").insert(transactions).execute()
        except Exception:
            try:
                client.table(BATCHES_TABLE).delete().eq(IMPORT_BATCHES_COLUMNS.ID.value, batch_id).execute()
            except Exception as cleanup_error:  # noqa: BLE001
                logger.error(f"Removing the empty import batch {batch_id} failed: {str(cleanup_error)}")
            raise

        logger.info(
            f"Statement imported - user_id: {user['user_id']}, batch: {batch_id}, rows: {len(payload.rows)}, "
            f"balance_adjustment: {adjustment is not None}, fund_openings: {len(fund_openings)}"
        )
        return StatementCommitResponse(
            success=True,
            message=f"Imported {len(payload.rows)} transaction(s)",
            data=StatementCommitData(
                batch=_batch_data(batch),
                rows_written=len(payload.rows),
                balance_adjustment=adjustment,
                fund_adjustments=fund_openings,
            ),
        )

    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error("Statement commit failed")
        logger.info(f"Statement commit failed with error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save the import. Nothing was saved."
        )


@router.get("/batches", response_model=ImportBatchesResponse)
@limiter.limit(RATE_LIMITS["read_only"])
async def list_batches(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> ImportBatchesResponse:
    """The user's past imports, newest first."""
    try:
        _require_feature(user["access_token"])
        client = get_db_client(user["access_token"])
        response = (
            client.table(BATCHES_TABLE)
            .select("*")
            .order(IMPORT_BATCHES_COLUMNS.CREATED_AT.value, desc=True)
            .limit(MAX_BATCHES_LISTED)
            .execute()
        )
        batches = [_batch_data(row) for row in response.data or []]
        return ImportBatchesResponse(success=True, message=f"{len(batches)} import(s)", data=batches)
    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error(f"Listing import batches failed: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load past imports"
        )


@router.delete("/batches/{batch_id}", response_model=ImportBatchDeleteResponse)
@limiter.limit(RATE_LIMITS["write"])
async def undo_batch(
    request: Request,
    batch_id: str,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> ImportBatchDeleteResponse:
    """
    Undo one import: delete its transactions (including ones edited since), then the batch.
    """
    try:
        _require_feature(user["access_token"])
        if not _is_uuid(batch_id):
            raise fastapi.HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import not found.")
        client = get_db_client(user["access_token"])

        found = (
            client.table(BATCHES_TABLE)
            .select(IMPORT_BATCHES_COLUMNS.ID.value)
            .eq(IMPORT_BATCHES_COLUMNS.ID.value, batch_id)
            .limit(1)
            .execute()
        )
        if not found.data:
            raise fastapi.HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import not found.")

        deleted = (
            client.table("fct_transactions")
            .delete()
            .eq(TRANSACTIONS_COLUMNS.IMPORT_BATCH_ID.value, batch_id)
            .execute()
        )
        client.table(BATCHES_TABLE).delete().eq(IMPORT_BATCHES_COLUMNS.ID.value, batch_id).execute()

        count = len(deleted.data or [])
        logger.info(f"Statement import undone - user_id: {user['user_id']}, batch: {batch_id}, deleted: {count}")
        return ImportBatchDeleteResponse(
            success=True,
            message=f"Removed {count} transaction(s)",
            data=ImportBatchDeleteData(transactions_deleted=count),
        )
    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error(f"Undoing import batch failed: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to undo the import"
        )
