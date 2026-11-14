"""
One raw row -> one normalised row: date, signed amount, merchant, message, note, kind.

A row that can't be read gets `error` set and is left out of the import; it never fails the
whole file. File-level checks (mixed accounts, wrong currency) live here too, since they read
the same normalised rows.
"""

from __future__ import annotations

import datetime
import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from ...schemas.base import StatementMapping
from ..merchant_history import normalize_merchant
from . import StatementFileError
from .mapping import Preset, RowCells, fold
from .reader import Cell, SheetData, cell_text

# Stored notes are capped well below StatementCommitRow.notes (1000) -- a transfer message can
# be long, and the note is for reading in a list.
MAX_NOTE_CHARS = 300
NOTE_SEPARATOR = " · "

# Tried in order when a mapping has no date_format (custom mappings from the mapping screen).
# Day-first before month-first: every bank this app is likely to see writes dates day-first.
_DATE_FORMATS = ("%d.%m.%Y", "%d.%m.%y", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%y", "%m/%d/%Y")


@dataclass
class NormalizedRow:
    row_number: int
    date: datetime.date | None
    amount: Decimal | None
    merchant: str
    message: str
    notes: str
    kind: str | None
    currency: str | None
    own_account: str | None
    warning: str | None = None
    error: str | None = None
    # Money moved to/from the account holder themselves; never sent to the model.
    own_transfer: bool = False
    # The holder's name from the file (never stored or sent; only used to redact the model payload).
    holder: str = ""

    @property
    def merchant_key(self) -> str:
        return normalize_merchant(self.merchant)

    @property
    def direction(self) -> str:
        return "in" if self.amount is not None and self.amount > 0 else "out"


# ================================================================================================
#                                       Value parsing
# ================================================================================================

def parse_amount(value: Cell, decimal_separator: str) -> Decimal | None:
    """
    "-1 234,50", "1.234,50", "1,234.50", "(12.00)", "12,00-", "-1 234,50 Kč" -> Decimal.
    Empty -> None. Anything else unreadable raises ValueError.
    """
    if isinstance(value, Decimal):
        return value
    if isinstance(value, datetime.date):
        raise ValueError("a date where an amount was expected")
    text = value.strip()
    if not text:
        return None
    negative = False
    if text.startswith("(") and text.endswith(")"):
        negative, text = True, text[1:-1]
    # Drop currency symbols/codes and every kind of space used as a thousands separator.
    text = re.sub(r"[^\d,.+\-']", "", text).replace("'", "")
    if text.endswith("-"):
        negative, text = True, text[:-1]
    if text.startswith("-"):
        negative, text = not negative, text[1:]
    elif text.startswith("+"):
        text = text[1:]
    thousands = "." if decimal_separator == "," else ","
    # The other separator is only a thousands mark in groups of three ("1.234,50"). Anything
    # else ("12.50" read with ',') means the separator choice is wrong: an error on the row
    # beats silently importing 1250.
    integer_part = text.split(decimal_separator)[0]
    if thousands in integer_part and not re.fullmatch(rf"\d{{1,3}}(?:\{thousands}\d{{3}})+", integer_part):
        raise ValueError(f"'{value}' doesn't match the decimal separator '{decimal_separator}'")
    if text.count(decimal_separator) > 1:
        raise ValueError(f"'{value}' is not an amount")
    text = text.replace(thousands, "").replace(decimal_separator, ".")
    if not text or text.count(".") > 1:
        raise ValueError(f"'{value}' is not an amount")
    try:
        amount = Decimal(text)
    except InvalidOperation as exc:
        raise ValueError(f"'{value}' is not an amount") from exc
    return -amount if negative else amount


def parse_date(value: Cell, date_format: str | None) -> datetime.date:
    """A date cell; a time part after the date ("01.05.2026 14:02") is ignored."""
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, datetime.date):
        return value
    if isinstance(value, Decimal):
        raise ValueError(f"'{value}' is not a date")
    text = value.strip()
    if not text:
        raise ValueError("the date is empty")
    # "1. 5. 2026" -> "1.5.2026"
    compact = re.sub(r"\.\s+", ".", text)
    candidates = [compact, compact.split()[0], compact.split("T")[0]]
    formats = (date_format,) if date_format else _DATE_FORMATS
    for fmt in formats:
        for candidate in candidates:
            try:
                return datetime.datetime.strptime(candidate, fmt).date()
            except ValueError:
                continue
    raise ValueError(f"'{text}' is not a date")


def build_note(merchant: str, message: str, extra: str = "") -> str:
    parts: list[str] = []
    for part in (merchant, message, extra):
        part = " ".join(part.split())
        if part and fold(part) not in {fold(p) for p in parts}:
            parts.append(part)
    note = NOTE_SEPARATOR.join(parts)
    return note[:MAX_NOTE_CHARS].rstrip()


# ================================================================================================
#                                       Rows
# ================================================================================================

def _row_cells(headers: list[str], row: list[Cell]) -> RowCells:
    cells: RowCells = {}
    for header, cell in zip(headers, row, strict=False):
        cells.setdefault(fold(header), cell)
    return cells


def _get(cells: RowCells, column: str | None) -> Cell:
    if not column:
        return ""
    return cells.get(fold(column), "")


def _text(cells: RowCells, column: str | None) -> str:
    return " ".join(cell_text(_get(cells, column)).split())


def _amount(cells: RowCells, mapping: StatementMapping) -> Decimal | None:
    sep = mapping.decimal_separator
    if mapping.amount_column:
        return parse_amount(_get(cells, mapping.amount_column), sep)
    debit = parse_amount(_get(cells, mapping.debit_column), sep) if mapping.debit_column else None
    credit = parse_amount(_get(cells, mapping.credit_column), sep) if mapping.credit_column else None
    if debit is None and credit is None:
        return None
    # Debit columns are written positive or negative depending on the bank; either way it's money out.
    return (credit or Decimal(0)) - abs(debit or Decimal(0))


def normalize_row(
    row_number: int,
    cells: RowCells,
    mapping: StatementMapping,
    preset: Preset | None,
) -> NormalizedRow:
    currency = _text(cells, mapping.currency_column).upper() or None
    own_account = _text(cells, mapping.own_account_column) or None
    base = NormalizedRow(
        row_number=row_number, date=None, amount=None, merchant="", message="", notes="",
        kind=None, currency=currency, own_account=own_account,
    )
    try:
        base.date = parse_date(_get(cells, mapping.date_column), mapping.date_format)
    except ValueError as exc:
        base.error = f"Couldn't read the date: {exc}"
        return base
    try:
        amount = _amount(cells, mapping)
    except ValueError as exc:
        base.error = f"Couldn't read the amount: {exc}"
        return base
    if amount is None:
        base.error = "The amount is empty."
        return base
    if amount == 0:
        base.error = "The amount is zero."
        return base
    base.amount = amount

    if preset is not None and preset.row_fn is not None:
        fields = preset.row_fn(cells, amount)
        base.merchant, base.message, base.kind, base.warning = (
            fields.merchant, fields.message, fields.kind, fields.warning,
        )
        base.own_transfer = fields.own_transfer
        base.holder = fields.holder
        extra = fields.extra_note
    else:
        base.merchant = next((t for c in mapping.merchant_columns if (t := _text(cells, c))), "")
        messages: list[str] = []
        for column in mapping.message_columns:
            text = _text(cells, column)
            if text and fold(text) != fold(base.merchant) and text not in messages:
                messages.append(text)
        base.message = NOTE_SEPARATOR.join(messages)
        if not base.merchant and base.message:
            base.merchant, base.message = base.message, ""
        extra = ""

    base.notes = build_note(base.merchant, base.message, extra)
    return base


def normalize_sheet(sheet: SheetData, mapping: StatementMapping, preset: Preset | None) -> list[NormalizedRow]:
    return [
        normalize_row(number, _row_cells(sheet.headers, row), mapping, preset)
        for row, number in zip(sheet.rows, sheet.row_numbers, strict=True)
    ]


# ================================================================================================
#                                       File-level checks
# ================================================================================================

def check_file(rows: list[NormalizedRow], account_currency: str | None, account_name: str | None) -> str | None:
    """
    Reject a file mixing several of the user's accounts, or in another currency than the account.
    Returns the file's currency (None when the file has no currency column).
    """
    valid = [r for r in rows if r.error is None]
    accounts = {r.own_account for r in valid if r.own_account}
    if len(accounts) > 1:
        raise StatementFileError(
            f"This file contains transactions from {len(accounts)} different accounts. "
            "Export one account at a time and import each file into its own account."
        )
    currencies = {r.currency for r in valid if r.currency}
    if len(currencies) > 1:
        raise StatementFileError(
            "This file mixes several currencies (" + ", ".join(sorted(currencies)) + "). "
            "Export one account at a time."
        )
    file_currency = next(iter(currencies), None)
    if file_currency and account_currency and file_currency != account_currency.upper():
        raise StatementFileError(
            f"This file is in {file_currency}, but the account "
            f"{('“' + account_name + '” ') if account_name else ''}is in {account_currency}. "
            "Pick the account the file belongs to."
        )
    return file_currency
