"""
Bytes -> header + rows of cells, for CSV and XLSX.

Nothing here knows what a column means; that is mapping.py's job. The reader only finds the
header row and hands back every row after it, with each cell as text -- or, for XLSX cells
that are already typed, as a date or a Decimal.
"""

from __future__ import annotations

import csv
import datetime
import io
import unicodedata
from collections import Counter
from dataclasses import dataclass
from decimal import Decimal

from . import StatementFileError

# A statement covering a year of a busy account is ~2-3k rows; past this the user should
# export a shorter period rather than have one request parse an arbitrarily large file.
MAX_DATA_ROWS = 5000

# How many lines to look at when deciding the delimiter and the header row. Banks put at most a
# few lines of preamble (account name, period) above the header.
_SNIFF_LINES = 50

_DELIMITERS = (";", ",", "\t")

Cell = str | datetime.date | Decimal


@dataclass
class SheetData:
    """The table found in a file: its header and the data rows below it."""
    headers: list[str]
    # Each row is padded / cut to len(headers).
    rows: list[list[Cell]]
    # 1-based line (CSV) or sheet row (XLSX) number of each data row, for error messages.
    row_numbers: list[int]


def clean_header(value: object) -> str:
    """Header text as compared everywhere: NFC, surrounding whitespace and NBSPs stripped."""
    text = "" if value is None else str(value)
    return unicodedata.normalize("NFC", text).replace(" ", " ").strip()


def read_file(content: bytes, file_name: str) -> SheetData:
    """Dispatch on the file extension (already validated by the router)."""
    if file_name.lower().endswith(".xlsx"):
        return read_xlsx(content)
    return read_csv(content)


# ================================================================================================
#                                           CSV
# ================================================================================================

def decode_text(content: bytes) -> str:
    """UTF-8 (with or without BOM) first, then cp1250 -- what older Czech bank exports use."""
    try:
        return content.decode("utf-8-sig")
    except UnicodeDecodeError:
        pass
    try:
        return content.decode("cp1250")
    except UnicodeDecodeError as exc:
        raise StatementFileError("The file's text encoding could not be read. Export it as UTF-8 CSV.") from exc


def _parse_lines(text: str, delimiter: str) -> list[tuple[int, list[str]]]:
    """(line number, cells) for every non-blank record."""
    reader = csv.reader(io.StringIO(text, newline=""), delimiter=delimiter)
    records: list[tuple[int, list[str]]] = []
    start_line = 1
    try:
        for cells in reader:
            if any(c.strip() for c in cells):
                records.append((start_line, cells))
            start_line = reader.line_num + 1
    except csv.Error as exc:
        raise StatementFileError(f"The CSV file could not be read: {exc}") from exc
    return records


def _width(cells: list[Cell] | list[str]) -> int:
    """Number of columns up to the last non-empty cell (trailing empty cells don't count)."""
    for i in range(len(cells) - 1, -1, -1):
        cell = cells[i]
        if not (isinstance(cell, str) and not cell.strip()):
            return i + 1
    return 0


def _find_header(widths: list[int], *, padded: bool) -> int | None:
    """
    Index of the header: the first line whose column count matches the line(s) after it. Lines
    of preamble above it ("Account: ...", "Period: ...") have fewer columns and are skipped.

    CSV records keep their real field count, so the most common count is the table's. XLSX rows
    are all padded to the sheet's width and only count up to their last filled cell, so there
    the widest row near the top is taken as the header (a header names every column).
    """
    window = widths[:_SNIFF_LINES]
    candidates = [w for w in window if w >= 2]
    if not candidates:
        return None
    if padded:
        target = max(candidates)
        return window.index(target)
    target = Counter(candidates).most_common(1)[0][0]
    for i, w in enumerate(window):
        if w == target and (i + 1 >= len(widths) or widths[i + 1] == target):
            return i
    return None


def _sniff_delimiter(text: str) -> str:
    """The delimiter among ; , tab that gives the most lines of one consistent width."""
    sample = "\n".join(text.splitlines()[:_SNIFF_LINES])
    best, best_score = ";", -1
    for delimiter in _DELIMITERS:
        try:
            records = _parse_lines(sample, delimiter)
        except StatementFileError:
            continue
        widths = [len(cells) for _, cells in records]
        common = Counter(w for w in widths if w >= 2).most_common(1)
        if not common:
            continue
        width, count = common[0]
        # Many consistent lines beat few; among equals prefer more columns.
        score = count * 1000 + width
        if score > best_score:
            best, best_score = delimiter, score
    return best


def read_csv(content: bytes) -> SheetData:
    text = decode_text(content)
    delimiter = _sniff_delimiter(text)
    records = _parse_lines(text, delimiter)
    return _to_sheet([list[Cell](cells) for _, cells in records], [n for n, _ in records], padded=False)


# ================================================================================================
#                                           XLSX
# ================================================================================================

def _xlsx_cell(value: object) -> Cell:
    if value is None:
        return ""
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, datetime.date):
        return value
    if isinstance(value, bool):
        return str(value)
    if isinstance(value, int | float):
        return Decimal(str(value))
    if isinstance(value, Decimal):
        return value
    return str(value).strip()


def read_xlsx(content: bytes) -> SheetData:
    # Imported here so a missing optional wheel only breaks XLSX, never module import.
    from openpyxl import load_workbook

    try:
        workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    except Exception as exc:  # noqa: BLE001 -- openpyxl raises many types for a bad file
        raise StatementFileError("The XLSX file could not be opened. Is it a valid Excel workbook?") from exc
    try:
        if not workbook.worksheets:
            raise StatementFileError("The XLSX file has no sheets.")
        sheet = workbook.worksheets[0]
        rows: list[list[Cell]] = []
        numbers: list[int] = []
        for number, values in enumerate(sheet.iter_rows(values_only=True), start=1):
            cells = [_xlsx_cell(v) for v in values]
            if _width(cells) == 0:
                continue
            rows.append(cells)
            numbers.append(number)
            # Header + data limit + a little preamble; anything past this is rejected below.
            if len(rows) > MAX_DATA_ROWS + _SNIFF_LINES:
                break
    finally:
        workbook.close()
    return _to_sheet(rows, numbers, padded=True)


# ================================================================================================
#                                           Shared
# ================================================================================================

def _to_sheet(records: list[list[Cell]], numbers: list[int], *, padded: bool) -> SheetData:
    if not records:
        raise StatementFileError("The file contains no rows.")
    widths = [_width(cells) if padded else len(cells) for cells in records]
    header_index = _find_header(widths, padded=padded)
    if header_index is None:
        raise StatementFileError("No table with a header row was found in the file.")

    width = widths[header_index]
    headers = [clean_header(c) for c in records[header_index][:width]]

    rows: list[list[Cell]] = []
    row_numbers: list[int] = []
    for cells, number in zip(records[header_index + 1:], numbers[header_index + 1:], strict=True):
        row: list[Cell] = [c.strip() if isinstance(c, str) else c for c in cells[:width]]
        row.extend([""] * (width - len(row)))
        rows.append(row)
        row_numbers.append(number)

    if not rows:
        raise StatementFileError("The file has a header but no transactions.")
    if len(rows) > MAX_DATA_ROWS:
        raise StatementFileError(
            f"The file has more than {MAX_DATA_ROWS:,} rows. Export a shorter period and import it in parts."
        )
    return SheetData(headers=headers, rows=rows, row_numbers=row_numbers)


def cell_text(cell: Cell) -> str:
    """A cell as display text (sample rows on the mapping screen, merchant text)."""
    if isinstance(cell, datetime.date):
        return cell.isoformat()
    if isinstance(cell, Decimal):
        return format(cell, "f")
    return cell
