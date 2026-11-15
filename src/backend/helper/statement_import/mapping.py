"""
StatementMapping presets, preset detection and a best-guess mapping for unknown files.

A preset is data (a StatementMapping) plus, optionally, a small function for rules that don't
fit the mapping shape -- Raiffeisenbank's split `Zpráva` field and its transaction kinds. A
preset is only ever added from a real export, never from documentation.
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Callable
from dataclasses import dataclass, field

from ...schemas.base import StatementMapping, StatementPresetData
from .reader import Cell, cell_text


def fold(text: str) -> str:
    """Case- and diacritics-insensitive form for comparing headers and keywords."""
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch)).casefold().strip()


@dataclass(frozen=True)
class RowFields:
    """What a preset-specific function derives from one row."""
    merchant: str
    message: str
    kind: str | None
    extra_note: str = ""
    warning: str | None = None
    own_transfer: bool = False
    # The account holder's name as the file states it; used only to keep it away from the model.
    holder: str = ""


# Academic titles and suffixes that appear around Czech names on statements; not part of identity.
_NAME_NOISE = frozenset({
    "ing", "mgr", "bc", "mudr", "judr", "rndr", "phdr", "paeddr", "mvdr", "doc", "prof", "dr", "phd",
    "csc", "mba", "dis", "arch", "jr", "sr", "ml", "st",
})


def name_tokens(text: str) -> frozenset[str]:
    """A person's name as a set of folded words, titles dropped: "Ing. DVOŘÁK Tomáš" -> {dvorak, tomas}."""
    return frozenset(t for t in re.findall(r"\w+", fold(text)) if t not in _NAME_NOISE and not t.isdigit())


def is_holder(counterparty: str, holder: str) -> bool:
    """
    The counterparty is the account holder themselves: at least two name words, and every word of
    the shorter name appears in the longer one (order, case, diacritics and titles aside). That
    covers a middle name or a joint account ("Tomáš a Jana Dvořákovi" is not matched, but
    "Tomáš Jan Dvořák" is), while a shared surname alone -- a family member -- never matches.
    """
    a, b = name_tokens(counterparty), name_tokens(holder)
    shorter, longer = (a, b) if len(a) <= len(b) else (b, a)
    return len(shorter) >= 2 and shorter <= longer


# A row as {folded header: cell}; given to preset functions so they can read any column.
RowCells = dict[str, Cell]


@dataclass(frozen=True)
class Preset:
    key: str
    name: str
    mapping: StatementMapping
    # All of these headers must be present (compared folded) for the preset to apply.
    required_headers: frozenset[str]
    row_fn: Callable[[RowCells, object], RowFields] | None = field(default=None)

    def data(self) -> StatementPresetData:
        return StatementPresetData(key=self.key, name=self.name)

    def matches(self, headers: list[str]) -> bool:
        folded = {fold(h) for h in headers}
        return all(fold(h) in folded for h in self.required_headers)


# ================================================================================================
#                                       Raiffeisenbank
# ================================================================================================

RB_DATE = "Datum provedení"
RB_AMOUNT = "Zaúčtovaná částka"
RB_CURRENCY = "Měna účtu"
RB_OWN_ACCOUNT = "Číslo účtu"
RB_MERCHANT = "Název obchodníka"
RB_COUNTERPARTY = "Název protiúčtu"
RB_MESSAGE = "Zpráva"
RB_NOTE = "Poznámka"
RB_TYPE = "Typ transakce"
RB_OWN_NOTE = "Vlastní poznámka"
RB_FEES = "Poplatky"
RB_ACCOUNT_NAME = "Název účtu"

# "40,99 EUR" -- a leading original-amount segment of a foreign card payment's Zpráva.
_ORIGINAL_AMOUNT_SEGMENT = re.compile(r"^[+-]?[\d\s.,]+\s*[A-Za-z]{3}$")
# A trailing token that is a reference code rather than part of the name: contains a digit and
# nothing but letters, digits and * # / - ("0123", "*AB12CD", "2201/45").
_TRAILING_REFERENCE = re.compile(r"\s+[A-Za-z*#/\-]*\d[\w*#/\-]*$")


def _text(cells: RowCells, header: str) -> str:
    value = cells.get(fold(header), "")
    return " ".join(cell_text(value).split()) if value != "" else ""


def descriptor_merchant(message: str) -> str:
    """
    The merchant out of a card descriptor like "ALBERT 0123; Praha; CZ" or
    "40,99 EUR;SPOTIFY P1234; Stockholm; SE": the first text segment, skipping a leading
    original-amount segment, with trailing reference codes trimmed.
    """
    segments = [s.strip() for s in message.split(";")]
    segments = [s for s in segments if s]
    if segments and _ORIGINAL_AMOUNT_SEGMENT.match(segments[0]):
        segments = segments[1:]
    if not segments:
        return ""
    merchant = segments[0]
    while True:
        trimmed = _TRAILING_REFERENCE.sub("", merchant)
        if trimmed == merchant or not trimmed.strip():
            break
        merchant = trimmed
    return merchant.strip()


def raiffeisen_kind(type_text: str, amount: object) -> str:
    """card / transfer_in / transfer_out / cash, from `Typ transakce` (and the sign as a fallback)."""
    t = fold(type_text)
    if "bankomat" in t or "vyber" in t or "hotovost" in t:
        return "cash"
    if "kart" in t or "online" in t:
        return "card"
    if "prichozi" in t:
        return "transfer_in"
    if "odchozi" in t:
        return "transfer_out"
    try:
        positive = amount is not None and float(str(amount)) > 0
    except ValueError:
        positive = False
    return "transfer_in" if positive else "transfer_out"


def raiffeisen_row(cells: RowCells, amount: object) -> RowFields:
    """The Raiffeisenbank rules of spec section 4: merchant, message, note extras, kind, fee warning."""
    message_field = _text(cells, RB_MESSAGE)
    note_field = _text(cells, RB_NOTE)
    type_text = _text(cells, RB_TYPE)
    kind = raiffeisen_kind(type_text, amount)

    merchant = _text(cells, RB_MERCHANT) or _text(cells, RB_COUNTERPARTY)
    merchant_from_message = False
    if not merchant:
        merchant = descriptor_merchant(message_field)
        merchant_from_message = bool(merchant)
    if not merchant:
        merchant = type_text

    if kind == "card":
        message = ""
    elif note_field and note_field != message_field:
        message = note_field
    elif not merchant_from_message:
        message = message_field
    else:
        message = ""
    if fold(message) == fold(merchant):
        message = ""

    warning = None
    fee_text = _text(cells, RB_FEES)
    if fee_text and re.sub(r"[0\s.,]", "", fee_text):
        warning = f"This row has a fee ({fee_text}). Check that the amount already includes it."

    counterparty = _text(cells, RB_COUNTERPARTY)
    own_transfer = kind in ("transfer_in", "transfer_out") and bool(counterparty) and is_holder(
        counterparty, _text(cells, RB_ACCOUNT_NAME)
    )

    return RowFields(
        merchant=merchant,
        message=message,
        kind=kind,
        extra_note=_text(cells, RB_OWN_NOTE),
        warning=warning,
        own_transfer=own_transfer,
        holder=_text(cells, RB_ACCOUNT_NAME),
    )


RAIFFEISENBANK = Preset(
    key="raiffeisenbank",
    name="Raiffeisenbank",
    mapping=StatementMapping(
        date_column=RB_DATE,
        date_format="%d.%m.%Y",
        amount_column=RB_AMOUNT,
        decimal_separator=",",
        currency_column=RB_CURRENCY,
        merchant_columns=[RB_MERCHANT, RB_COUNTERPARTY, RB_MESSAGE, RB_TYPE],
        message_columns=[RB_NOTE, RB_MESSAGE],
        own_account_column=RB_OWN_ACCOUNT,
    ),
    required_headers=frozenset({RB_DATE, "Datum zaúčtování", RB_AMOUNT, RB_CURRENCY, RB_TYPE, RB_MESSAGE}),
    row_fn=raiffeisen_row,
)


# ================================================================================================
#                                   This app's own export
# ================================================================================================

# Columns written by GET /export/transactions (routers/export.py).
OWN_EXPORT = Preset(
    key="budget_export",
    name="Budgeting Dashboard export",
    mapping=StatementMapping(
        date_column="date",
        date_format="%Y-%m-%d",
        amount_column="amount",
        decimal_separator=".",
        merchant_columns=["notes"],
        # One file may hold every account; the mixed-accounts check then asks for one at a time.
        own_account_column="account_name",
    ),
    required_headers=frozenset({
        "date", "amount", "notes", "category_name", "category_type", "account_name", "created_at",
    }),
)

PRESETS: tuple[Preset, ...] = (RAIFFEISENBANK, OWN_EXPORT)
PRESETS_BY_KEY = {p.key: p for p in PRESETS}


def detect_preset(headers: list[str]) -> Preset | None:
    return next((p for p in PRESETS if p.matches(headers)), None)


def mapping_applies(mapping: StatementMapping, headers: list[str]) -> bool:
    """Every column the mapping reads exists in the file."""
    folded = {fold(h) for h in headers}
    return all(fold(c) in folded for c in mapping.columns())


# ================================================================================================
#                                   Best guess for unknown files
# ================================================================================================

# Folded header keywords, best first. Matching is "header contains keyword".
_DATE_WORDS = ("datum provedeni", "datum transakce", "transaction date", "datum", "date", "dátum")
_AMOUNT_WORDS = ("zauctovana castka", "castka", "amount", "suma", "objem", "betrag", "kwota")
_DEBIT_WORDS = ("debit", "vydaj", "money out", "paid out", "withdrawal", "odchozi")
_CREDIT_WORDS = ("credit", "prijem", "money in", "paid in", "deposit", "prichozi")
_MERCHANT_WORDS = (
    "nazev obchodnika", "merchant", "obchodnik", "nazev protiuctu", "protistrana", "counterparty",
    "payee", "description", "popis", "prijemce", "nazev", "name", "zprava", "message", "details",
)
_MESSAGE_WORDS = ("zprava", "message", "poznamka", "note", "reference", "popis")
_CURRENCY_WORDS = ("mena uctu", "mena", "currency")


def _find(headers: list[str], words: tuple[str, ...], exclude: set[str] | None = None) -> str | None:
    exclude = exclude or set()
    folded = [(h, fold(h)) for h in headers if h and h not in exclude]
    for word in words:
        for header, f in folded:
            if word in f:
                return header
    return None


def guess_decimal_separator(values: list[Cell]) -> str:
    """',' when the sample amounts look like "1 234,50", otherwise '.'."""
    comma = dot = 0
    for value in values:
        if not isinstance(value, str):
            continue
        text = value.strip()
        if re.search(r",\d{1,2}$", text):
            comma += 1
        elif re.search(r"\.\d{1,2}$", text):
            dot += 1
    return "," if comma > dot else "."


def guess_mapping(headers: list[str], rows: list[list[Cell]]) -> StatementMapping | None:
    """A mapping from header names alone, preselected on the mapping screen. None if no date/amount found."""
    date_col = _find(headers, _DATE_WORDS)
    if date_col is None:
        return None
    used = {date_col}
    amount_col = _find(headers, _AMOUNT_WORDS, used)
    debit_col = credit_col = None
    if amount_col is None:
        debit_col = _find(headers, _DEBIT_WORDS, used)
        credit_col = _find(headers, _CREDIT_WORDS, used | ({debit_col} if debit_col else set()))
        if debit_col is None and credit_col is None:
            return None
    used |= {c for c in (amount_col, debit_col, credit_col) if c}
    merchant_col = _find(headers, _MERCHANT_WORDS, used)
    if merchant_col:
        used.add(merchant_col)
    message_col = _find(headers, _MESSAGE_WORDS, used)
    currency_col = _find(headers, _CURRENCY_WORDS, used)

    sample_index = [headers.index(c) for c in (amount_col, debit_col, credit_col) if c]
    sample = [row[i] for row in rows[:50] for i in sample_index if i < len(row)]

    return StatementMapping(
        date_column=date_col,
        date_format=None,
        amount_column=amount_col,
        debit_column=debit_col,
        credit_column=credit_col,
        decimal_separator="," if guess_decimal_separator(sample) == "," else ".",
        currency_column=currency_col,
        merchant_columns=[merchant_col] if merchant_col else [],
        message_columns=[message_col] if message_col else [],
    )
