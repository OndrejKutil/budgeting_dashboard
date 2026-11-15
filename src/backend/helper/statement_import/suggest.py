"""
Category suggestions for a statement: the user's own history first, then one model call.

Privacy is decided here, not in the frontend: the model payload is built on the server from the
parsed rows and contains, per distinct merchant, only the merchant text, the direction, the kind
and up to three short messages -- never amounts, counts, dates, account or card numbers, or the
file name. Every text is additionally scrubbed of digit runs and card masks. The payload is
never logged.
"""

from __future__ import annotations

import json
import logging
import re
from collections import Counter
from dataclasses import dataclass, field

from ..category_guidance import CATEGORY_MATCHING_GUIDANCE
from ..llm_client import LLMClient
from ..merchant_history import MerchantHistory
from .mapping import fold, name_tokens
from .normalize import NormalizedRow

logger = logging.getLogger(__name__)

MAX_MERCHANTS_PER_CALL = 150
MAX_CALLS = 2
MAX_MESSAGES_PER_MERCHANT = 3
MAX_MESSAGE_CHARS = 80
MIN_CONFIDENCE = 0.6
# 150 merchants x ~25 tokens of answer, plus the reasoning the model spends from the same budget.
SUGGEST_MAX_TOKENS = 8192

# A masked card number ("516872XXXXXX8303", "**** 1234") -- removed before the digit rule so no
# stray "XXXXXX" is left behind.
_CARD_MASK = re.compile(r"[\dX*•]*[X*•]{4,}[\dX*•]*|\*{2,}\s*\d+")
_DIGIT_RUN = re.compile(r"\d[\d ]*\d{3,}|\d{4,}")  # 4+ digits, also "1234 5678"-style groups


def redact_names(text: str, holder_tokens: frozenset[str]) -> str:
    """Remove every word of the account holder's name, whatever the case or diacritics."""
    if not holder_tokens:
        return text
    return re.sub(r"\w+", lambda m: "" if fold(m.group()) in holder_tokens else m.group(), text)


def scrub(text: str, holder_tokens: frozenset[str] = frozenset()) -> str:
    """Remove the holder's name, card masks and any run of 4+ digits; collapse what's left."""
    text = redact_names(text, holder_tokens)
    text = _CARD_MASK.sub(" ", text)
    text = _DIGIT_RUN.sub(" ", text)
    text = " ".join(text.split())
    return text.strip(" ;,.-/*#:")


@dataclass
class MerchantGroup:
    """All rows of one merchant in one direction -- one line on the review screen."""
    key: str
    direction: str
    merchant: str
    own_transfer: bool = False
    holder_tokens: frozenset[str] = frozenset()
    row_indexes: list[int] = field(default_factory=list)
    kinds: Counter[str] = field(default_factory=Counter)
    messages: list[str] = field(default_factory=list)


def group_rows(rows: list[NormalizedRow]) -> list[MerchantGroup]:
    """Readable rows grouped by (merchant key, direction), most rows first."""
    groups: dict[tuple[str, str, bool], MerchantGroup] = {}
    for i, row in enumerate(rows):
        if row.error is not None:
            continue
        key = (row.merchant_key or row.merchant.casefold(), row.direction, row.own_transfer)
        group = groups.setdefault(
            key, MerchantGroup(key=key[0], direction=key[1], merchant=row.merchant, own_transfer=row.own_transfer)
        )
        group.row_indexes.append(i)
        if row.holder:
            group.holder_tokens |= name_tokens(row.holder)
        if row.kind:
            group.kinds[row.kind] += 1
        if row.message and row.message not in group.messages:
            group.messages.append(row.message)
    return sorted(groups.values(), key=lambda g: len(g.row_indexes), reverse=True)


def merchant_payload(group: MerchantGroup, index: int) -> dict | None:
    """What the model may see about one merchant, or None if nothing safe is left to send."""
    # The holder's name is removed even when own-transfer detection missed it (e.g. the account is
    # named differently): a merchant that was only the holder's name ends up empty and isn't sent.
    merchant = scrub(group.merchant, group.holder_tokens)
    if not merchant:
        return None
    messages: list[str] = []
    for message in group.messages:
        cleaned = scrub(message, group.holder_tokens)[:MAX_MESSAGE_CHARS].strip()
        if cleaned and cleaned.casefold() != merchant.casefold() and cleaned not in messages:
            messages.append(cleaned)
        if len(messages) >= MAX_MESSAGES_PER_MERCHANT:
            break
    item: dict = {"index": index, "merchant": merchant, "direction": group.direction}
    if group.kinds:
        item["kind"] = group.kinds.most_common(1)[0][0]
    if messages:
        item["messages"] = messages
    return item


SUGGEST_SYSTEM_PROMPT = """
You assign categories to merchants from a user's bank statement in a personal finance app.

You receive one JSON object:
- "merchants": a list of {"index", "merchant", "direction", "kind"?, "messages"?}.
  "direction" is "out" (the user paid) or "in" (the user received money). "kind" is one of
  "card", "transfer_in", "transfer_out", "cash". "messages" are payment messages written on
  transfers, if any. A merchant may be a business or a private person's name.
- "categories": the user's categories, each {"id", "name", "type", "spending_type"}. "type" is
  one of: expense, income, transfer, saving, investment, exclude. Names are the user's own and
  are often Czech (e.g. "Potraviny" = groceries, "Jídlo venku" / "Restaurace" = eating out,
  "Doprava" = transport, "Drogerie" = drugstore, "Zdraví" = health, "Bydlení" = housing,
  "Zábava" = entertainment, "Oblečení" = clothing, "Výplata" = salary).

For every merchant pick the single best category id from "categories", or null. Never invent
an id. Money going "out" normally gets an expense, saving or investment category; money coming
"in" normally gets an income category.

Category-matching guidance (use judgment for merchants not listed — these are examples of the
reasoning to apply, not a lookup table):
""" + CATEGORY_MATCHING_GUIDANCE + """- Money moved between the user's own accounts or wallets (a transfer to their own savings
  account, Revolut top-up, a broker deposit the user has no investment category for) and ATM
  cash withdrawals (kind "cash") go to an exclude-type category when the user has one.
- When nothing fits, answer null. A wrong category is worse than none.

"confidence" is how sure you are, 0.0-1.0.

Output a single JSON object matching this schema, and nothing else — no markdown fences, no
commentary:
{"merchants": [{"index": <number>, "category_id": <number|null>, "confidence": <number 0.0-1.0>}]}
"""


@dataclass
class Suggestion:
    category_id: int
    source: str  # "rule" | "model"


def history_suggestions(groups: list[MerchantGroup], history: MerchantHistory, category_ids: set[int]) -> dict[int, Suggestion]:
    """Group index -> category, for merchants the user has filed the same way at least twice."""
    result: dict[int, Suggestion] = {}
    for i, group in enumerate(groups):
        rule = next((m for m in history.match(group.merchant) if m.is_rule), None)
        if rule is not None and rule.category_id in category_ids:
            result[i] = Suggestion(rule.category_id, "rule")
    return result


def _as_int(value: object) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip().isdigit():
        return int(value.strip())
    return None


def parse_model_answer(raw: str, sent_indexes: set[int], category_ids: set[int]) -> dict[int, int]:
    """Payload index -> category id, keeping only known ids answered with enough confidence."""
    data = json.loads(raw) if raw else {}
    answers = data.get("merchants") if isinstance(data, dict) else None
    result: dict[int, int] = {}
    for answer in answers if isinstance(answers, list) else []:
        if not isinstance(answer, dict):
            continue
        index = _as_int(answer.get("index"))
        category_id = _as_int(answer.get("category_id"))
        try:
            confidence = float(answer.get("confidence") or 0.0)
        except (TypeError, ValueError):
            continue
        if index in sent_indexes and category_id in category_ids and confidence >= MIN_CONFIDENCE:
            result[index] = category_id  # type: ignore[index]
    return result


def build_model_requests(groups: list[MerchantGroup], skip: set[int]) -> list[list[dict]]:
    """The merchant payloads to send, most frequent first, split into at most MAX_CALLS calls."""
    payloads: list[dict] = []
    for i, group in enumerate(groups):  # already most-rows-first
        # Transfers to the holder carry the holder's own name: never sent (spec 7.1).
        if i in skip or group.own_transfer:
            continue
        item = merchant_payload(group, i)
        if item is not None:
            payloads.append(item)
        if len(payloads) >= MAX_MERCHANTS_PER_CALL * MAX_CALLS:
            break
    return [payloads[i:i + MAX_MERCHANTS_PER_CALL] for i in range(0, len(payloads), MAX_MERCHANTS_PER_CALL)]


def model_suggestions(
    groups: list[MerchantGroup],
    skip: set[int],
    categories: list[dict],
    llm: LLMClient,
    model: str,
) -> dict[int, Suggestion]:
    """
    Group index -> model suggestion. Raises on any provider / parsing failure; the caller turns
    that into `suggestions_available: false`.
    """
    category_ids = {c["id"] for c in categories}
    result: dict[int, Suggestion] = {}
    for chunk in build_model_requests(groups, skip):
        raw = llm.complete_json(
            model=model,
            system_prompt=SUGGEST_SYSTEM_PROMPT,
            user_content=json.dumps({"merchants": chunk, "categories": categories}, ensure_ascii=False),
            max_completion_tokens=SUGGEST_MAX_TOKENS,
        )
        answers = parse_model_answer(raw, {item["index"] for item in chunk}, category_ids)
        for index, category_id in answers.items():
            result[index] = Suggestion(category_id, "model")
    return result
