"""
"What did this user do last time with this merchant?" -- worked out from their own transactions.

Screenshot import's category matching used to rely on category names plus general knowledge,
every time, with no memory. Czech merchants are often too local for a model to place reliably
(Bageterie Boulevard ending up under groceries), but the user has usually already filed the same
merchant by hand. This module turns their existing `fct_transactions` rows into that memory.

Nothing is stored: history is read per request (RLS-scoped, read-only) and discarded. A correction
made on the review screen is saved as a normal transaction, so it simply becomes history for the
next import.
"""

from __future__ import annotations

import datetime
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass, field

from .columns import TRANSACTIONS_COLUMNS

# How far back to look, and a hard cap on rows pulled per request. A year covers seasonal
# merchants; the cap keeps a heavy user's request cheap.
HISTORY_LOOKBACK_DAYS = 365
HISTORY_MAX_ROWS = 3000

# How many candidate matches per extracted transaction are shown to the model.
MAX_MATCHES = 3

# An exact-match history entry is applied deterministically (no model judgement) only when it is
# both repeated and consistent -- one past transaction could have been a one-off misfile.
RULE_MIN_COUNT = 2
RULE_MIN_SHARE = 0.7

# Tokens shorter than this carry no merchant identity ("a", "cz", "s.r.o" leftovers).
_MIN_TOKEN_LEN = 2

# Legal-form and payment-processor noise that appears around merchant names on statements and
# notifications, and would otherwise stop "Albert" from matching "ALBERT CR, a.s.".
_NOISE_TOKENS = frozenset({
    "sro", "as", "spol", "ltd", "gmbh", "inc", "llc", "cz", "cr", "praha", "prague",
    "sumup", "sum", "up", "gopay", "comgate", "payu", "www", "com",
})


def normalize_merchant(text: str | None) -> str:
    """
    Canonical key for comparing merchant names written differently.

    "Bageterie Boulevard Anděl 12", "BAGETERIE BOULEVARD, ANDEL" and "bageterie boulevard andel"
    all become "bageterie boulevard andel": case and diacritics are dropped, digits and
    punctuation become spaces, and legal-form / processor noise ("s.r.o.", "SumUp *") is removed.
    """
    if not text:
        return ""
    decomposed = unicodedata.normalize("NFKD", text)
    ascii_only = "".join(ch for ch in decomposed if not unicodedata.combining(ch)).lower()
    # "rohlik.cz" -> "rohlik": a web-shop domain names the same merchant as its brand.
    ascii_only = re.sub(r"\.(?:cz|sk|com|eu|de|net|org)\b", " ", ascii_only)
    # "s.r.o." -> "sro", "a.s." -> "as" before punctuation is split on, so each is recognised as
    # one noise token. Only single-letter runs are joined, never "word.word".
    ascii_only = re.sub(r"\b(?:[a-z]\.)+[a-z]?\b", lambda m: m.group().replace(".", ""), ascii_only)
    tokens = re.sub(r"[^a-z]+", " ", ascii_only).split()
    return " ".join(t for t in tokens if len(t) >= _MIN_TOKEN_LEN and t not in _NOISE_TOKENS)


@dataclass
class _MerchantStats:
    """Everything the user's history says about one normalized merchant key."""
    example_note: str
    categories: Counter[int] = field(default_factory=Counter)
    accounts: Counter[str] = field(default_factory=Counter)

    @property
    def count(self) -> int:
        return sum(self.categories.values())


@dataclass
class HistoryMatch:
    """One past merchant that looks like the one being imported."""
    matched_note: str
    exact: bool
    count: int
    category_id: int
    category_share: float
    account_id: str | None
    account_share: float

    def for_model(self) -> dict:
        """Compact form passed to stage two."""
        return {
            "matched_note": self.matched_note,
            "exact": self.exact,
            "times_seen": self.count,
            "category_id": self.category_id,
            "category_share": round(self.category_share, 2),
            "account_id": self.account_id,
        }

    @property
    def is_rule(self) -> bool:
        """Consistent enough to apply without asking the model."""
        return self.exact and self.count >= RULE_MIN_COUNT and self.category_share >= RULE_MIN_SHARE


class MerchantHistory:
    """Index over a user's past transactions, keyed by normalized merchant (notes) text."""

    def __init__(self, rows: list[dict]) -> None:
        self._by_key: dict[str, _MerchantStats] = {}
        for row in rows:
            note = row.get(TRANSACTIONS_COLUMNS.NOTES.value)
            category_id = row.get(TRANSACTIONS_COLUMNS.CATEGORY_ID.value)
            key = normalize_merchant(note)
            if not key or category_id is None:
                continue
            stats = self._by_key.setdefault(key, _MerchantStats(example_note=str(note).strip()))
            stats.categories[category_id] += 1
            account_id = row.get(TRANSACTIONS_COLUMNS.ACCOUNT_ID.value)
            if account_id:
                stats.accounts[account_id] += 1

    def __len__(self) -> int:
        return len(self._by_key)

    def match(self, merchant: str | None) -> list[HistoryMatch]:
        """
        Past merchants matching `merchant`, best first: an exact normalized match, then entries
        where one name's tokens contain the other's ("bageterie boulevard" vs. "bageterie
        boulevard andel"), ranked by how often the user has used them.
        """
        key = normalize_merchant(merchant)
        if not key:
            return []

        results: list[HistoryMatch] = []
        exact_stats = self._by_key.get(key)
        if exact_stats is not None:
            results.append(_to_match(exact_stats, exact=True))

        tokens = set(key.split())
        partial: list[_MerchantStats] = []
        for other_key, stats in self._by_key.items():
            if other_key == key:
                continue
            other_tokens = set(other_key.split())
            if tokens <= other_tokens or other_tokens <= tokens:
                partial.append(stats)
        partial.sort(key=lambda s: s.count, reverse=True)
        results.extend(_to_match(s, exact=False) for s in partial)

        return results[:MAX_MATCHES]


def _to_match(stats: _MerchantStats, *, exact: bool) -> HistoryMatch:
    total = stats.count
    category_id, category_count = stats.categories.most_common(1)[0]
    account_id: str | None = None
    account_share = 0.0
    if stats.accounts:
        account_id, account_count = stats.accounts.most_common(1)[0]
        account_share = account_count / sum(stats.accounts.values())
    return HistoryMatch(
        matched_note=stats.example_note,
        exact=exact,
        count=total,
        category_id=category_id,
        category_share=category_count / total,
        account_id=account_id,
        account_share=account_share,
    )


def fetch_history(client, *, today: datetime.date | None = None) -> MerchantHistory:
    """
    Read the user's recent transactions (via their own RLS-scoped client) into a MerchantHistory.
    """
    since = (today or datetime.date.today()) - datetime.timedelta(days=HISTORY_LOOKBACK_DAYS)
    fields = ",".join([
        TRANSACTIONS_COLUMNS.NOTES.value,
        TRANSACTIONS_COLUMNS.CATEGORY_ID.value,
        TRANSACTIONS_COLUMNS.ACCOUNT_ID.value,
    ])
    response = (
        client.table("fct_transactions")
        .select(fields)
        .gte(TRANSACTIONS_COLUMNS.DATE.value, since.isoformat())
        .not_.is_(TRANSACTIONS_COLUMNS.NOTES.value, "null")
        .order(TRANSACTIONS_COLUMNS.DATE.value, desc=True)
        .limit(HISTORY_MAX_ROWS)
        .execute()
    )
    return MerchantHistory(response.data or [])
