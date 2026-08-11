# fastapi
# logging
import base64
import datetime
import json
import logging
from decimal import Decimal

import fastapi
from fastapi import APIRouter, Depends, File, Request, UploadFile, status

from backend.helper.environment import INFERENCE_MODEL, REASONING_MODEL

# auth dependencies
from ..auth.auth import api_key_auth, get_current_user

# supabase client
from ..data.database import get_db_client

# helper
from ..helper.columns import ACCOUNTS_COLUMNS, CATEGORIES_COLUMNS, TRANSACTIONS_COLUMNS
from ..helper.features import is_feature_enabled
from ..helper.llm_client import LLMProviderError, get_llm_client

# rate limiting
from ..helper.rate_limiter import RATE_LIMITS, limiter
from ..schemas.base import DraftTransactionData, ExtractionData, FieldSource, TransactionData
from ..schemas.requests import ImportTransactionsRequest
from ..schemas.responses import ExtractionResponse, TransactionSuccessResponse

# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================

# Create logger for this module
logger = logging.getLogger(__name__)

# The feature flag gating this router. See supabase/migrations/20260810000000_add_feature_flags.sql
FEATURE_KEY = "screenshot_import"

# Screenshots off a phone are well under this; the cap exists so the endpoint cannot be used to
# push arbitrarily large bodies at the inference provider (or at memory).
MAX_UPLOAD_BYTES = 8 * 1024 * 1024

# A single screenshot realistically yields a handful of transactions, never dozens; the cap
# exists so /import can't be used to bulk-insert an arbitrarily large batch in one call.
MAX_IMPORT_ROWS = 50

# Currencies the app actually supports (accounts can only be created in one of these -- see
# CURRENCIES in AccountsPage.tsx / SUPPORTED_CURRENCIES in lib/currency.ts on the frontend).
# Kept in sync by hand since there's no shared schema across the two languages; a currency
# stage two reports outside this set is treated as unresolved rather than passed through.
SUPPORTED_CURRENCIES = frozenset({"AUD", "CAD", "CZK", "EUR", "GBP", "PLN", "USD"})

def _build_system_prompt() -> str:
    """
    Built fresh per request rather than as a module-level constant -- {datetime.date.today()}
    must reflect the day the request actually came in, not the day the server process happened
    to start. A module-level f-string would freeze "today" at import time and silently go stale
    for as long as the process stays up.
    """
    return f"""
You are a data-extraction engine for a personal finance app. You are shown a screenshot
from a phone: either (a) a lock-screen or notification-center screenshot showing one or
more Apple Pay / Apple Wallet transaction notifications, possibly mixed with unrelated
notifications, or (b) a screenshot from a banking app showing a transaction list or a
single transaction's detail view.

Your only job is to transcribe what is visibly printed in the image into structured JSON.
Never infer, calculate, or guess a value that is not directly legible. If a field is not
visible or you are not confident, output null for that field rather than guessing.

This screenshot is the user's own phone, showing their own bank notifications, submitted
through their own personal-finance app to log their own spending. Person-to-person payments are
common and completely normal here: a notification's "merchant" is very often the private name
of a friend, family member, landlord, or other individual the user paid or was paid by, not a
business. Transcribe that name exactly like you would a company name -- it is expected,
legitimate transaction data for this task, not something to omit, redact, or hesitate over.

Rules:
- Extract every distinct transaction visible. A single screenshot may show several —
  a stack of notifications, or multiple rows in a statement.
- Ignore anything that is not a financial transaction: messages, calendar alerts, other
  app notifications, status bar, UI chrome, and grouped summary banners like "3 more
  notifications" that don't show individual transaction details. Do not expand a grouped
  summary into fabricated rows — skip it entirely if you cannot read the individual
  transactions inside it.
- Not every bank notification uses a two-line "Merchant / Amount" layout. Some describe the
  movement in a sentence instead, e.g. a title like "Pohyb na účtě" ("Account activity") with
  a body like "💰 Přišlo 500,00 CZK (Platba od x)" ("500.00 CZK arrived — payment
  from x"). For these: the amount is the number stated, the merchant is the
  sender/payer or recipient/payee named in the sentence, and words like "Přišlo"/"received"/
  "arrived" vs. "Odešlo"/"sent"/"paid" tell you whether money came in or went out -- carry that
  distinction into source_text so the next stage can use it. Ignore emoji characters when
  reading the text; they are decoration, not data.
- Amount: read the exact number shown, using whatever separators the screenshot uses
  (e.g. "1 234,50" or "1,234.50"). Report it as a plain decimal (1234.50). Report the
  currency separately, exactly as shown (symbol or code: "Kč", "CZK", "$", "USD", "€").
- Merchant: use the exact name text shown. Do not correct spelling or expand abbreviations.
- Date/time: do not calculate or infer an absolute calendar date — you do not know today's
  real date. Report exactly the text shown (e.g. "2m ago", "9:41 AM", "Yesterday", "12. 8.",
  "Today 14:02"). If nothing is shown, output null.
- For the field of Actual date, try to infer the actual date it happened on, with the context that the screenshot was taken on {datetime.date.today()}. If you cannot infer the actual date, output null.
- Merchant Slim: Only the name of the merchant, no location info - Trim any text containing for example "in Prague" or "at London" or "near Berlin" from the merchant name.
- Bank name: If the bank name is visible, extract it. If not, output null.
- If the image contains no transactions, return an empty array.

Output a single JSON object matching this schema, and nothing else — no markdown fences,
no commentary before or after:
"""

SECOND_PART = """
{
  "transactions": [
    {
      "amount": <number>,
      "currency": <string|null>,
      "merchant": <string|null>,
      "merchant_slim": <string|null>,
      "raw_date_time_text": <string|null>,
      "raw_date": <string|null>,
      "raw_time": <string|null>,
      "actual_date": <string|null>,
      "bank_name": <string|null>,
      "confidence": <number 0.0-1.0>,
      "source_text": <string>
    }
  ]
}
"""

REASONING_SYSTEM_PROMPT = """
You are the second stage of a two-stage transaction import pipeline for a personal finance
app. The first stage already read a screenshot and transcribed what it could see into a JSON
list of raw transactions — exact amounts, currencies, merchant names, and whatever date text
was visible. You do not see the image.

Your job: turn those raw transactions into finished drafts by matching each one against the
user's own categories and accounts, which are provided to you as data. Never invent a category
or account id — only ever use an "id" value that appears in the "categories" or "accounts"
list you were given. If nothing in the list is a confident match, output null for that field.

You will receive one JSON object with three keys:
- "extracted_transactions": the raw output of stage one (list of transactions).
- "categories": this user's categories, each {"id", "name", "type", "spending_type"}.
  "type" is one of: expense, income, transfer, saving, investment, exclude.
- "accounts": this user's accounts, each {"id", "name", "type", "currency"}.

Normally return exactly one transaction object per entry in "extracted_transactions", in the
same order — do not split or reorder any. The one exception: if two or more entries are
clearly the same merchant on the same calendar date (e.g. several near-identical purchases at
the same store, or the same purchase notified twice), you may collapse them into a single
transaction with the summed amount instead of returning them separately. Only collapse when
the merchant and date genuinely match — never collapse entries from different merchants or
different days just because they look similar. If you do collapse any, say so in that
transaction's `warnings` (e.g. "Combined 2 transactions at Albert on 2026-08-10").

For each transaction, produce:
- amount: the numeric magnitude, unchanged from stage one (do not add or remove a sign —
  that is handled elsewhere).
- currency: normalized to a 3-letter code from this exact set: AUD, CAD, CZK, EUR, GBP, PLN,
  USD (map symbols/words yourself: "Kč"/"Czech crowns" -> "CZK", "€" -> "EUR", "£" -> "GBP",
  "zł" -> "PLN", "$" -> whichever of USD/AUD/CAD the context (bank name, other currencies
  already seen) makes most likely). If you cannot confidently map it to one of these codes,
  output null — the app cannot log a transaction in an unsupported currency.
- date: the best-effort actual calendar date in ISO format (YYYY-MM-DD), using stage one's
  "actual_date" if present, otherwise deriving it yourself from "raw_date_time_text" /
  "raw_date" if unambiguous. Output null if you cannot determine it.
- merchant: the cleaned merchant name (prefer stage one's "merchant_slim").
- category_id_fk: the id of the best-matching category from the "categories" list, or null.
- account_id_fk: the id of the best-matching account from the "accounts" list, or null.
  Match by bank_name against account name, and by currency, when available.
- confidence: your overall confidence in this draft, 0.0-1.0.
- unresolved_fields: a list of field names (from: amount, currency, date, merchant,
  account_id_fk, category_id_fk) that you could not determine or are not confident about.
  Anything you output as null belongs in this list.
- warnings: short, user-facing sentences about anything worth a second look before saving —
  an ambiguous merchant, a guessed date, a category you're unsure of, or the fact that you
  couldn't tell whether this was income or an expense.

Category-matching guidance (use judgment for merchants not listed — these are examples of
the kind of reasoning to apply, not an exhaustive lookup table):
- Grocery chains (Albert, Billa, Lidl, Kaufland, Tesco, Penny Market, Globus, Norma, COOP,
  and supermarket/convenience-store names generally) -> a "Groceries"-type expense category.
- Fast food and casual restaurants (McDonald's, KFC, Burger King, Bageterie Boulevard, pizza
  places, cafes, bars, food delivery like Wolt / Bolt Food / Foodora) -> a "Dining out" /
  "Restaurants" / "Fun" expense category — not groceries.
- Ride-hailing and public transport (Uber, Bolt, Lyft, transit apps) -> a "Transport" category.
- Fuel stations (Shell, OMV, MOL, Benzina, Circle K) -> a "Transport" or "Fuel" category.
- Streaming/subscription services (Netflix, Spotify, HBO Max, Disney+, iCloud, gym membership
  charges) -> a recurring/subscription-flavoured expense category if one exists.
- Electronics and general retail (Alza, Datart, Amazon, Apple Store) -> a general shopping
  expense category.
- A notification that reads like a salary, refund, or incoming transfer -> an income
  category, not expense. A person's name as the merchant (a P2P payment) can be either
  direction -- it's an expense if the user paid them, income if they paid the user.
- When nothing fits well, prefer leaving category_id_fk null over forcing a bad match — a
  wrong category is worse than none.

A screenshot notification almost never states the transaction's sign explicitly — assume it
is an outgoing payment (expense) unless the wording clearly says otherwise (e.g. "received",
"refund", "deposit", "salary", or Czech equivalents like "Přišlo"/"přijato" for incoming vs.
"Odešlo"/"odesláno" for outgoing, which stage one is asked to carry into source_text).

Output a single JSON object matching this schema, and nothing else — no markdown fences, no
commentary before or after:
"""

REASONING_SCHEMA = """
{
  "transactions": [
    {
      "amount": <number|null>,
      "currency": <string|null>,
      "date": <string|null>,
      "merchant": <string|null>,
      "category_id_fk": <number|null>,
      "account_id_fk": <string|null>,
      "confidence": <number 0.0-1.0>,
      "unresolved_fields": [<string>, ...],
      "warnings": [<string>, ...]
    }
  ]
}
"""


# ================================================================================================
#                                   Router Configuration
# ================================================================================================

router = APIRouter()

#? This router prefix is /screenshot-import


def _fetch_user_context(access_token: str) -> tuple[list[dict], list[dict]]:
    """
    This user's active categories and accounts, trimmed to what stage two needs to match
    against. Savings funds are deliberately excluded — screenshot imports are day-to-day
    transactions, not fund allocations.
    """
    client = get_db_client(access_token)

    category_fields = ",".join([
        CATEGORIES_COLUMNS.ID.value,
        CATEGORIES_COLUMNS.NAME.value,
        CATEGORIES_COLUMNS.TYPE.value,
        CATEGORIES_COLUMNS.SPENDING_TYPE.value,
    ])
    categories_response = (
        client.table("dim_categories_users")
        .select(category_fields)
        .eq(CATEGORIES_COLUMNS.IS_ACTIVE.value, True)
        .execute()
    )
    categories = [
        {
            "id": row[CATEGORIES_COLUMNS.ID.value],
            "name": row[CATEGORIES_COLUMNS.NAME.value],
            "type": row[CATEGORIES_COLUMNS.TYPE.value],
            "spending_type": row.get(CATEGORIES_COLUMNS.SPENDING_TYPE.value),
        }
        for row in categories_response.data or []
    ]

    account_fields = ",".join([
        ACCOUNTS_COLUMNS.ID.value,
        ACCOUNTS_COLUMNS.NAME.value,
        ACCOUNTS_COLUMNS.TYPE.value,
        ACCOUNTS_COLUMNS.CURRENCY.value,
    ])
    accounts_response = (
        client.table("dim_accounts")
        .select(account_fields)
        .eq(ACCOUNTS_COLUMNS.IS_ACTIVE.value, True)
        .execute()
    )
    accounts = [
        {
            "id": row[ACCOUNTS_COLUMNS.ID.value],
            "name": row[ACCOUNTS_COLUMNS.NAME.value],
            "type": row[ACCOUNTS_COLUMNS.TYPE.value],
            "currency": row.get(ACCOUNTS_COLUMNS.CURRENCY.value),
        }
        for row in accounts_response.data or []
    ]

    return categories, accounts


def _build_draft(
    item: dict,
    category_type_by_id: dict,
    account_currency_by_id: dict,
    default_account_id: str | None,
) -> DraftTransactionData:
    """
    Turn one stage-two transaction into a DraftTransactionData.

    Field provenance is computed here rather than trusted from the model's own report — the
    model tells us which fields it's unsure about (`unresolved_fields`), and this function is
    the only place that turns that into the FieldSource the review UI actually renders.
    """
    unresolved = set(item.get("unresolved_fields") or [])
    warnings = list(item.get("warnings") or [])
    field_sources: dict[str, FieldSource] = {}

    def sourced(source_key: str, value, field_name: str | None = None):
        field_sources[field_name or source_key] = (
            FieldSource.NONE if value is None or source_key in unresolved else FieldSource.MODEL
        )
        return value

    amount = sourced("amount", item.get("amount"))
    currency = sourced("currency", item.get("currency"))
    date_text = sourced("date", item.get("date"))
    # No separate merchant field on a real transaction -- the merchant name (stage two's
    # "merchant") becomes the draft's `notes` directly, sourced/tracked as that field.
    notes = sourced("merchant", item.get("merchant"), field_name="notes")
    account_id = sourced("account_id_fk", item.get("account_id_fk"))
    category_id = sourced("category_id_fk", item.get("category_id_fk"))

    # The app can only log a transaction in a currency an account can actually hold. A value
    # outside that set (the model ignored the prompt, or misread a symbol) is treated the same
    # as not having read one at all -- the user picks a real one from the dropdown instead.
    if currency is not None and currency not in SUPPORTED_CURRENCIES:
        currency = None
        field_sources["currency"] = FieldSource.NONE

    # Only default-fill in play right now: the user has exactly one account, so an unresolved
    # account can only mean "the only one they have".
    if account_id is None and default_account_id is not None:
        account_id = default_account_id
        field_sources["account_id_fk"] = FieldSource.DEFAULT

    if currency is None and account_id is not None:
        inherited_currency = account_currency_by_id.get(account_id)
        if inherited_currency is not None:
            currency = inherited_currency
            field_sources["currency"] = FieldSource.DEFAULT

    # Sign convention: expenses/savings/investments are stored negative, income positive. Only
    # flipped positive once a category actually resolves to income -- everything else (a
    # resolved expense-flavoured category, or no confident category match at all) defaults to
    # an outgoing payment, since that's what the overwhelming majority of screenshot
    # notifications are. One click on the sign toggle fixes the rare income case that's missed.
    if amount is not None:
        category_type = category_type_by_id.get(category_id) if category_id is not None else None
        amount = abs(amount) if category_type == "income" else -abs(amount)

    parsed_date: datetime.date | None = None
    if date_text:
        try:
            parsed_date = datetime.date.fromisoformat(date_text)
        except ValueError:
            field_sources["date"] = FieldSource.NONE
            warnings.append(f"Couldn't parse the date '{date_text}' — please set it.")

    return DraftTransactionData(
        amount=Decimal(str(amount)) if amount is not None else None,
        currency=currency,
        date=parsed_date,
        account_id_fk=account_id,
        category_id_fk=category_id,
        notes=notes,
        confidence=float(item.get("confidence") or 0.0),
        field_sources=field_sources,
        warnings=warnings,
    )


@router.post("/extract", response_model=ExtractionResponse)
@limiter.limit(RATE_LIMITS["bulk"])
async def extract_from_screenshot(
    request: Request,
    file: UploadFile = File(..., description="Screenshot of bank notifications"),
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> ExtractionResponse:
    """
    Turn a screenshot of bank notifications into draft transactions for review.

    Two inference calls: a vision model transcribes what's on screen, then a text-only
    reasoning model matches each transaction against the user's own categories and accounts.
    Drafts are not finished transactions — the category and account are best guesses, and
    `notes` is always left to the user. Every field carries its provenance in `field_sources`
    so the review screen can show where a value came from, and anything the pipeline couldn't
    determine is called out in `warnings` so the user knows what to fill in before saving.
    """
    try:
        if not is_feature_enabled(user["access_token"], FEATURE_KEY):
            raise fastapi.HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Screenshot import is not enabled for this account.",
            )

        if not file.content_type or not file.content_type.startswith("image/"):
            raise fastapi.HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Upload an image file.",
            )

        image_bytes = await file.read()

        if not image_bytes:
            raise fastapi.HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file is empty.",
            )

        if len(image_bytes) > MAX_UPLOAD_BYTES:
            raise fastapi.HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Image is too large. Maximum size is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
            )

        logger.info(
            f"Screenshot received for extraction - user_id: {user['user_id']}, "
            f"content_type: {file.content_type}, bytes: {len(image_bytes)}"
        )

        # ----------------------------------------------------------------------------------
        # TODO(extraction): rules first, model only on miss. Everything below is model-sourced.
        # ----------------------------------------------------------------------------------

        base_64_image = base64.b64encode(image_bytes).decode("utf-8")
        llm_client = get_llm_client()

        # Stage one: vision. Reads what's on screen, nothing more.
        raw_stage_one = llm_client.complete_json(
            model=INFERENCE_MODEL,
            system_prompt=_build_system_prompt() + SECOND_PART,
            user_content=[
                {
                    "type": "text",
                    "text": "Extract every transaction from this screenshot per the rules above. Return JSON only.",
                },
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base_64_image}"}},
            ],
        )
        stage_one_data = json.loads(raw_stage_one) if raw_stage_one else {}
        stage_one_transactions = stage_one_data.get("transactions") or []

        if not stage_one_transactions:
            return ExtractionResponse(
                success=True,
                message="No transactions found in the screenshot",
                data=ExtractionData(
                    drafts=[],
                    inference_model=INFERENCE_MODEL,
                    inference_called=True,
                    rules_hit=0,
                    raw_text=raw_stage_one,
                ),
            )

        # Stage two: reasoning, text-only. Matches stage one's output against this user's own
        # categories and accounts.
        categories, accounts = _fetch_user_context(user["access_token"])
        category_type_by_id = {c["id"]: c["type"] for c in categories}
        account_currency_by_id = {a["id"]: a["currency"] for a in accounts}
        default_account_id = accounts[0]["id"] if len(accounts) == 1 else None

        raw_stage_two = llm_client.complete_json(
            model=REASONING_MODEL,
            system_prompt=REASONING_SYSTEM_PROMPT + REASONING_SCHEMA,
            user_content=json.dumps(
                {
                    "extracted_transactions": stage_one_transactions,
                    "categories": categories,
                    "accounts": accounts,
                },
                ensure_ascii=False,
            ),
        )
        stage_two_data = json.loads(raw_stage_two) if raw_stage_two else {}
        stage_two_transactions = stage_two_data.get("transactions") or []

        drafts = [
            _build_draft(item, category_type_by_id, account_currency_by_id, default_account_id)
            for item in stage_two_transactions
        ]

        return ExtractionResponse(
            success=True,
            message=f"Extracted {len(drafts)} draft transaction(s)",
            data=ExtractionData(
                drafts=drafts,
                inference_model=f"{INFERENCE_MODEL} + {REASONING_MODEL}",
                inference_called=True,
                rules_hit=0,
                raw_text=raw_stage_one,
            ),
        )

    except fastapi.HTTPException:
        raise
    except LLMProviderError:
        # Full diagnostics (status, rate-limit headers, response body) are already logged
        # where the provider call actually happened -- see GroqLLMClient.complete_json.
        raise fastapi.HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The inference provider rejected this request. Check the server logs for details.",
        )
    except Exception as e:
        logger.error("Screenshot extraction failed")
        logger.info(f"Screenshot extraction failed with error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process the screenshot",
        )


@router.post("/import", response_model=TransactionSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def import_transactions(
    request: Request,
    payload: ImportTransactionsRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> TransactionSuccessResponse:
    """
    Save reviewed drafts as real transactions.

    Each row is exactly what POST /transactions/ accepts for a single one -- this exists so the
    review screen can save the whole batch in one request instead of one per draft. Behind the
    same feature flag as /extract: this is the second half of that flow, not a general-purpose
    bulk-create endpoint.
    """
    try:
        if not is_feature_enabled(user["access_token"], FEATURE_KEY):
            raise fastapi.HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Screenshot import is not enabled for this account.",
            )

        if len(payload.transactions) > MAX_IMPORT_ROWS:
            raise fastapi.HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Too many transactions in one import. Maximum is {MAX_IMPORT_ROWS}.",
            )

        user_supabase_client = get_db_client(user["access_token"])

        rows = []
        for transaction in payload.transactions:
            row = transaction.model_dump(exclude={"tags"})
            row[TRANSACTIONS_COLUMNS.USER_ID.value] = user["user_id"]
            row[TRANSACTIONS_COLUMNS.AMOUNT.value] = float(row[TRANSACTIONS_COLUMNS.AMOUNT.value])
            row[TRANSACTIONS_COLUMNS.DATE.value] = row[TRANSACTIONS_COLUMNS.DATE.value].isoformat()
            if row.get(TRANSACTIONS_COLUMNS.CREATED_AT.value) is not None:
                row[TRANSACTIONS_COLUMNS.CREATED_AT.value] = row[TRANSACTIONS_COLUMNS.CREATED_AT.value].isoformat()
            rows.append(row)

        response = user_supabase_client.table("fct_transactions").insert(rows).execute()

        return TransactionSuccessResponse(
            success=True,
            message=f"Imported {len(response.data or rows)} transaction(s)",
            data=[TransactionData(**item) for item in response.data] if response.data else None,
        )

    except fastapi.HTTPException:
        raise
    except Exception as e:
        logger.error("Transaction import failed")
        logger.info(f"Transaction import failed with error: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to import transactions",
        )
