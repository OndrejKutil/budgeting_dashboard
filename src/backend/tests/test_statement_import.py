"""
Statement import (CSV / XLSX), all on synthetic data.

The fixture mimics a Raiffeisenbank export (same header, invented rows). A real export contains
personal data and is never committed.
"""

import datetime
import io
import json
import os
import sys
from decimal import Decimal
from types import SimpleNamespace

import pytest

current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.abspath(os.path.join(current_dir, "../../"))
if src_path not in sys.path:
    sys.path.insert(0, src_path)

import fastapi  # noqa: E402
from backend.helper.merchant_history import MerchantHistory  # noqa: E402
from backend.helper.statement_import import StatementFileError  # noqa: E402
from backend.helper.statement_import.balance import (  # noqa: E402
    adjustment_date,
    balance_adjustment,
    pick_starting_balance_category,
)
from backend.helper.statement_import.duplicates import mark_duplicates  # noqa: E402
from backend.helper.statement_import.mapping import (  # noqa: E402
    OWN_EXPORT,
    RAIFFEISENBANK,
    descriptor_merchant,
    detect_preset,
    fold,
    guess_mapping,
    is_holder,
)
from backend.helper.statement_import.normalize import (  # noqa: E402
    NormalizedRow,
    check_file,
    normalize_sheet,
    parse_amount,
    parse_date,
)
from backend.helper.statement_import.reader import MAX_DATA_ROWS, read_csv, read_xlsx  # noqa: E402
from backend.helper.statement_import.suggest import (  # noqa: E402
    build_model_requests,
    group_rows,
    parse_model_answer,
    scrub,
)
from backend.routers import statement_import as router_module  # noqa: E402
from backend.schemas.base import FieldSource, StatementMapping  # noqa: E402
from backend.schemas.requests import StatementCommitRequest  # noqa: E402
from starlette.datastructures import Headers, UploadFile  # noqa: E402
from starlette.requests import Request  # noqa: E402

# ================================================================================================
#                                       Synthetic fixture
# ================================================================================================

RB_HEADER = [
    "Datum provedení", "Datum zaúčtování", "Číslo účtu", "Název účtu", "Kategorie transakce",
    "Číslo protiúčtu", "Název protiúčtu", "Typ transakce", "Zpráva", "Poznámka", "VS", "KS", "SS",
    "Zaúčtovaná částka", "Měna účtu", "Původní částka", "Původní měna", "Poplatky", "Id transakce",
    "Vlastní poznámka", "Název obchodníka", "Město",
]

OWN_ACCOUNT = "1234567890/5500"
CARD_MASK = "516872XXXXXX8303"


def _rb_row(**values: str) -> list[str]:
    row = dict.fromkeys(RB_HEADER, "")
    row.update({"Číslo účtu": OWN_ACCOUNT, "Název účtu": "Petr Novák", "Měna účtu": "CZK", "Poplatky": "0"})
    row.update(values)
    return [row[h] for h in RB_HEADER]


RB_ROWS = [
    # 1. card payment with a merchant name
    _rb_row(**{"Datum provedení": "03.05.2026", "Datum zaúčtování": "05.05.2026 10:12",
               "Typ transakce": "Platba kartou", "Zpráva": "ALBERT 0412; Praha; CZ",
               "Poznámka": "ALBERT 0412; Praha; CZ", "Zaúčtovaná částka": "-1 234,50",
               "Id transakce": "900000001", "Název obchodníka": "Albert", "Město": "Praha"}),
    # 2. card payment without a merchant name (card mask in the note)
    _rb_row(**{"Datum provedení": "04.05.2026", "Datum zaúčtování": "06.05.2026 08:00",
               "Typ transakce": "Platba kartou", "Zpráva": "BAGETERIE BOULEVARD 12; Brno; CZ",
               "Poznámka": f"Karta {CARD_MASK}", "Zaúčtovaná částka": "-129,00",
               "Id transakce": "900000002", "Město": "Brno"}),
    # 3. online payment in a foreign currency
    _rb_row(**{"Datum provedení": "10.05.2026", "Datum zaúčtování": "12.05.2026 09:30",
               "Typ transakce": "Online platba kartou", "Zpráva": "40,99 EUR;SPOTIFY P2F4A1B; Stockholm; SE",
               "Zaúčtovaná částka": "-1 012,34", "Původní částka": "-40,99", "Původní měna": "EUR",
               "Id transakce": "900000003"}),
    # 4. incoming transfer with a message
    _rb_row(**{"Datum provedení": "15.05.2026", "Datum zaúčtování": "15.05.2026 14:00",
               "Typ transakce": "Příchozí platba", "Číslo protiúčtu": "2701234567/2010",
               "Název protiúčtu": "Novák Jan", "Zpráva": "padel", "Poznámka": "padel", "VS": "7788990011",
               "Zaúčtovaná částka": "12500,00", "Id transakce": "900000004"}),
    # 5. outgoing transfer, with the user's own note
    _rb_row(**{"Datum provedení": "20.05.2026", "Datum zaúčtování": "20.05.2026 07:00",
               "Typ transakce": "Odchozí platba", "Číslo protiúčtu": "5566778899/0800",
               "Název protiúčtu": "Pronajímatel s.r.o.", "Zpráva": "Nájem květen",
               "Zaúčtovaná částka": "-15 000,00", "Id transakce": "900000005", "Vlastní poznámka": "byt"}),
    # 7. transfer to the holder's own savings account (name written differently)
    _rb_row(**{"Datum provedení": "22.05.2026", "Datum zaúčtování": "22.05.2026 07:00",
               "Typ transakce": "Odchozí platba", "Číslo protiúčtu": "1234567891/5500",
               "Název protiúčtu": "NOVÁK PETR", "Zpráva": "spoření",
               "Zaúčtovaná částka": "-5 000,00", "Id transakce": "900000007"}),
    # 6. ATM withdrawal, with a non-zero fee
    _rb_row(**{"Datum provedení": "25.05.2026", "Datum zaúčtování": "26.05.2026 11:11",
               "Typ transakce": "Výběr z bankomatu", "Zpráva": "ATM PRAHA CENTRUM 0042; Praha; CZ",
               "Zaúčtovaná částka": "-2 000,00", "Poplatky": "-15,00", "Id transakce": "900000006"}),
]


def _csv_bytes(header: list[str], rows: list[list[str]], delimiter: str = ";", encoding: str = "utf-8-sig",
               preamble: list[str] | None = None, quote: bool = True) -> bytes:
    def fmt(cells: list[str]) -> str:
        return delimiter.join(f'"{c}"' if quote else c for c in cells)
    lines = list(preamble or []) + [fmt(header)] + [fmt(r) for r in rows]
    return ("\r\n".join(lines) + "\r\n").encode(encoding)


def _rb_sheet():
    return read_csv(_csv_bytes(RB_HEADER, RB_ROWS))


def _rb_rows():
    return normalize_sheet(_rb_sheet(), RAIFFEISENBANK.mapping, RAIFFEISENBANK)


# ================================================================================================
#                                           Reader
# ================================================================================================

def test_reader_utf8_bom_semicolon_and_header():
    sheet = _rb_sheet()
    assert sheet.headers[0] == "Datum provedení"  # BOM stripped
    assert sheet.headers == RB_HEADER
    assert len(sheet.rows) == len(RB_ROWS)
    assert sheet.row_numbers[0] == 2


def test_reader_cp1250():
    data = _csv_bytes(["Datum", "Částka", "Popis"], [["01.05.2026", "-10,00", "Žluťoučký kůň"]], encoding="cp1250")
    sheet = read_csv(data)
    assert sheet.headers == ["Datum", "Částka", "Popis"]
    assert sheet.rows[0][2] == "Žluťoučký kůň"


@pytest.mark.parametrize("delimiter", [";", ",", "\t"])
def test_reader_each_delimiter(delimiter):
    data = _csv_bytes(["Date", "Amount", "Description"],
                      [["2026-05-01", "-10.50", "Shop, Inc."], ["2026-05-02", "20.00", "Pay"]],
                      delimiter=delimiter)
    sheet = read_csv(data)
    assert sheet.headers == ["Date", "Amount", "Description"]
    assert sheet.rows[0][2] == "Shop, Inc."


def test_reader_skips_preamble_lines():
    data = _csv_bytes(["Date", "Amount", "Description"], [["2026-05-01", "-1.00", "A"], ["2026-05-02", "-2.00", "B"]],
                      delimiter=",", quote=False,
                      preamble=["Account statement", "Period: May 2026", ""])
    sheet = read_csv(data)
    assert sheet.headers == ["Date", "Amount", "Description"]
    assert [r[2] for r in sheet.rows] == ["A", "B"]
    assert sheet.row_numbers == [5, 6]


def test_reader_xlsx_typed_cells():
    from openpyxl import Workbook
    wb = Workbook()
    ws = wb.active
    ws.append(["Statement for May"])
    ws.append(["Date", "Amount", "Description"])
    ws.append([datetime.datetime(2026, 5, 3), -1234.5, "Albert"])
    ws.append([datetime.datetime(2026, 5, 4), 100, "Refund"])
    buffer = io.BytesIO()
    wb.save(buffer)

    sheet = read_xlsx(buffer.getvalue())
    assert sheet.headers == ["Date", "Amount", "Description"]
    assert sheet.rows[0][0] == datetime.date(2026, 5, 3)
    assert sheet.rows[0][1] == Decimal("-1234.5")

    mapping = StatementMapping(date_column="Date", amount_column="Amount", merchant_columns=["Description"],
                               decimal_separator=".")
    rows = normalize_sheet(sheet, mapping, None)
    assert [(r.date, r.amount, r.merchant) for r in rows] == [
        (datetime.date(2026, 5, 3), Decimal("-1234.5"), "Albert"),
        (datetime.date(2026, 5, 4), Decimal("100"), "Refund"),
    ]


def test_reader_row_limit():
    rows = [["2026-05-01", "-1.00", "x"]] * (MAX_DATA_ROWS + 1)
    with pytest.raises(StatementFileError) as exc:
        read_csv(_csv_bytes(["Date", "Amount", "Description"], rows, delimiter=","))
    assert "shorter period" in exc.value.message


def test_reader_empty_table_is_an_error():
    with pytest.raises(StatementFileError):
        read_csv(b"just one line\n")


# ================================================================================================
#                                       Raiffeisen preset
# ================================================================================================

def test_raiffeisen_preset_is_detected():
    assert detect_preset(RB_HEADER) is RAIFFEISENBANK


def test_raiffeisen_rows():
    rows = _rb_rows()
    assert all(r.error is None for r in rows)
    expected = [
        # date, amount, merchant, message, note, kind
        (datetime.date(2026, 5, 3), Decimal("-1234.50"), "Albert", "", "Albert", "card"),
        (datetime.date(2026, 5, 4), Decimal("-129.00"), "BAGETERIE BOULEVARD", "", "BAGETERIE BOULEVARD", "card"),
        (datetime.date(2026, 5, 10), Decimal("-1012.34"), "SPOTIFY", "", "SPOTIFY", "card"),
        (datetime.date(2026, 5, 15), Decimal("12500.00"), "Novák Jan", "padel", "Novák Jan · padel", "transfer_in"),
        (datetime.date(2026, 5, 20), Decimal("-15000.00"), "Pronajímatel s.r.o.", "Nájem květen",
         "Pronajímatel s.r.o. · Nájem květen · byt", "transfer_out"),
        (datetime.date(2026, 5, 22), Decimal("-5000.00"), "NOVÁK PETR", "spoření", "NOVÁK PETR · spoření",
         "transfer_out"),
        (datetime.date(2026, 5, 25), Decimal("-2000.00"), "ATM PRAHA CENTRUM", "", "ATM PRAHA CENTRUM", "cash"),
    ]
    actual = [(r.date, r.amount, r.merchant, r.message, r.notes, r.kind) for r in rows]
    assert actual == expected


def test_raiffeisen_own_transfer_needs_the_full_name():
    # Only the transfer to "NOVÁK PETR" is the holder; "Novák Jan" just shares the surname.
    assert [r.own_transfer for r in _rb_rows()] == [False, False, False, False, False, True, False]


@pytest.mark.parametrize("counterparty, holder, expected", [
    ("DVOŘÁK TOMÁŠ", "Tomáš Dvořák", True),
    ("Tomas Dvorak", "Tomáš Dvořák", True),
    ("Jana Dvořáková", "Tomáš Dvořák", False),
    ("Petr Dvořák", "Tomáš Dvořák", False),
    ("Dvořák", "Dvořák", False),  # one word is not enough to call it the holder
    ("Ing. Tomáš Dvořák", "DVOŘÁK TOMÁŠ", True),
    ("Tomáš Jan Dvořák", "Tomáš Dvořák", True),
    ("Dvořák Tomáš", "Běžný účet", False),
])
def test_is_holder(counterparty, holder, expected):
    assert is_holder(counterparty, holder) is expected


def test_holder_name_is_redacted_even_when_detection_misses():
    # The counterparty spells the name with a typo, so it isn't detected as an own transfer --
    # the holder's name must still not reach the model.
    rows = [_row(merchant="Tomášš DVOŘÁK", message="Dvořák spoření", holder="Tomáš Dvořák"),
            _row(merchant="Jana Dvořáková", holder="Tomáš Dvořák")]
    payload = json.dumps(build_model_requests(group_rows(rows), set()), ensure_ascii=False)
    assert "dvorak" not in fold(payload).replace("dvorakova", "")
    assert "Jana Dvořáková" in payload


def test_raiffeisen_fee_warning_only_on_non_zero_fee():
    rows = _rb_rows()
    assert [r.warning is not None for r in rows] == [False, False, False, False, False, False, True]


@pytest.mark.parametrize("message, merchant", [
    ("ALBERT 0412; Praha; CZ", "ALBERT"),
    ("40,99 EUR;SPOTIFY P2F4A1B; Stockholm; SE", "SPOTIFY"),
    ("PAYPAL *STEAM 4029357733; LU", "PAYPAL *STEAM"),
    ("12345", "12345"),  # nothing left after trimming -> keep it
    ("", ""),
])
def test_descriptor_merchant(message, merchant):
    assert descriptor_merchant(message) == merchant


def test_own_export_preset():
    header = ["date", "amount", "notes", "category_name", "category_type", "spending_type",
              "account_name", "account_type", "savings_fund_name", "created_at"]
    rows = [["2026-05-01", "-120.5", "Lidl", "Groceries", "expense", "Core", "Main", "checking", "", "x"]]
    sheet = read_csv(_csv_bytes(header, rows, delimiter=",", quote=False))
    assert detect_preset(sheet.headers) is OWN_EXPORT
    [row] = normalize_sheet(sheet, OWN_EXPORT.mapping, OWN_EXPORT)
    assert (row.date, row.amount, row.notes) == (datetime.date(2026, 5, 1), Decimal("-120.5"), "Lidl")


# ================================================================================================
#                                       Values and mappings
# ================================================================================================

@pytest.mark.parametrize("text, sep, expected", [
    ("-1 234,50", ",", Decimal("-1234.50")),
    ("1.234,50", ",", Decimal("1234.50")),
    ("1 234,50 Kč", ",", Decimal("1234.50")),
    ("1,234.50", ".", Decimal("1234.50")),
    ("(12.00)", ".", Decimal("-12.00")),
    ("12,00-", ",", Decimal("-12.00")),
    ("+5", ".", Decimal("5")),
    ("", ",", None),
])
def test_parse_amount(text, sep, expected):
    assert parse_amount(text, sep) == expected


def test_parse_amount_rejects_garbage():
    with pytest.raises(ValueError):
        parse_amount("abc", ",")


@pytest.mark.parametrize("text, sep", [("12.50", ","), ("1,5", "."), ("1.23,4,5", ",")])
def test_parse_amount_rejects_wrong_separator_instead_of_rescaling(text, sep):
    with pytest.raises(ValueError):
        parse_amount(text, sep)


@pytest.mark.parametrize("text, fmt, expected", [
    ("03.05.2026", "%d.%m.%Y", datetime.date(2026, 5, 3)),
    ("03.05.2026 10:12", "%d.%m.%Y", datetime.date(2026, 5, 3)),
    ("3. 5. 2026", None, datetime.date(2026, 5, 3)),
    ("2026-05-03", None, datetime.date(2026, 5, 3)),
    ("2026-05-03T10:00:00", None, datetime.date(2026, 5, 3)),
])
def test_parse_date(text, fmt, expected):
    assert parse_date(text, fmt) == expected


def test_debit_credit_columns():
    mapping = StatementMapping(date_column="Date", debit_column="Out", credit_column="In",
                               merchant_columns=["Who"], decimal_separator=",")
    sheet = read_csv(_csv_bytes(["Date", "Out", "In", "Who"], [
        ["01.05.2026", "1 000,00", "", "Shop"],
        ["02.05.2026", "-50,00", "", "Shop"],
        ["03.05.2026", "", "2 500,50", "Employer"],
        ["04.05.2026", "", "", "Nothing"],
    ]))
    rows = normalize_sheet(sheet, mapping, None)
    assert [r.amount for r in rows[:3]] == [Decimal("-1000.00"), Decimal("-50.00"), Decimal("2500.50")]
    assert rows[3].error is not None


def test_bad_row_is_left_out_not_fatal():
    mapping = StatementMapping(date_column="Date", amount_column="Amount", decimal_separator=".")
    sheet = read_csv(_csv_bytes(["Date", "Amount"], [["2026-05-01", "-1.00"], ["yesterday", "-2.00"]], delimiter=","))
    rows = normalize_sheet(sheet, mapping, None)
    assert rows[0].error is None
    assert rows[1].error and "date" in rows[1].error


def test_guess_mapping_from_headers():
    headers = ["Datum", "Částka", "Měna", "Popis transakce", "Zpráva pro příjemce"]
    sheet = read_csv(_csv_bytes(headers, [["01.05.2026", "-1 234,50", "CZK", "Shop", "hi"]]))
    mapping = guess_mapping(sheet.headers, sheet.rows)
    assert mapping is not None
    assert (mapping.date_column, mapping.amount_column, mapping.decimal_separator) == ("Datum", "Částka", ",")
    assert mapping.merchant_columns == ["Popis transakce"]
    assert mapping.currency_column == "Měna"


def test_mapping_needs_an_amount():
    with pytest.raises(ValueError):
        StatementMapping(date_column="Date")


# ================================================================================================
#                                       File-level checks
# ================================================================================================

def _row(**kw) -> NormalizedRow:
    base = dict(row_number=1, date=datetime.date(2026, 5, 1), amount=Decimal("-1"), merchant="x", message="",
                notes="x", kind=None, currency="CZK", own_account="A")
    base.update(kw)
    return NormalizedRow(**base)  # type: ignore[arg-type]


def test_mixed_accounts_rejected():
    with pytest.raises(StatementFileError, match="different accounts"):
        check_file([_row(own_account="A"), _row(own_account="B")], "CZK", "Main")


def test_wrong_currency_rejected():
    with pytest.raises(StatementFileError, match="EUR"):
        check_file([_row(currency="EUR")], "CZK", "Main")


def test_matching_currency_accepted():
    assert check_file(_rb_rows(), "CZK", "Main") == "CZK"


def test_rows_with_errors_dont_count_for_file_checks():
    assert check_file([_row(), _row(own_account="B", error="bad")], "CZK", None) == "CZK"


# ================================================================================================
#                                           Duplicates
# ================================================================================================

def test_duplicates_are_a_multiset():
    d = datetime.date(2026, 5, 1)
    rows = [_row(date=d, amount=Decimal("-100.00")), _row(date=d, amount=Decimal("-100")),
            _row(date=d, amount=Decimal("-50"))]
    # One identical row in the ledger -> exactly one of the two file rows is a duplicate.
    assert mark_duplicates(rows, [("2026-05-01", -100.0)]) == {0}
    assert mark_duplicates(rows, [("2026-05-01", "-100"), ("2026-05-01", -100)]) == {0, 1}


def test_duplicates_need_same_date():
    rows = [_row(date=datetime.date(2026, 5, 1), amount=Decimal("-100"))]
    assert mark_duplicates(rows, [("2026-05-02", -100)]) == set()


def test_rows_with_errors_are_never_duplicates():
    rows = [_row(amount=Decimal("-1"), error="bad")]
    assert mark_duplicates(rows, [("2026-05-01", -1)]) == set()


# ================================================================================================
#                                           Suggestions
# ================================================================================================

def test_scrub():
    assert scrub(f"Platba kartou {CARD_MASK}") == "Platba kartou"
    assert scrub("VS 7788990011 nájem") == "VS nájem"
    assert scrub("ALBERT 0412") == "ALBERT"
    assert scrub("Shop 12") == "Shop 12"
    assert scrub("4029357733") == ""


def test_model_payload_contains_nothing_identifying():
    rows = _rb_rows()
    payload = json.dumps(build_model_requests(group_rows(rows), set()), ensure_ascii=False)

    forbidden = [OWN_ACCOUNT, "1234567890", "2701234567", "5566778899", CARD_MASK, "8303", "7788990011",
                 "900000001", "Praha", "Brno", "Stockholm", "Petr", "NOVÁK PETR", "spoření", "2026",
                 "05.2026", "1 234,50",
                 "1234.5", "12500", "15000", "1012", "129", "40,99", "statement.csv"]
    for value in forbidden:
        assert value not in payload, value
    # ...but the merchants, directions and messages are there.
    assert "Albert" in payload and "padel" in payload
    # A family member sharing the holder's surname keeps only the first name.
    assert '"merchant": "Jan"' in payload and "Novák" not in payload
    assert '"direction": "in"' in payload


def test_merchant_left_empty_by_scrubbing_is_not_sent():
    rows = [_row(merchant="4029357733"), _row(merchant="Lidl")]
    [chunk] = build_model_requests(group_rows(rows), set())
    assert [item["merchant"] for item in chunk] == ["Lidl"]


def test_model_answer_validation():
    raw = json.dumps({"merchants": [
        {"index": 0, "category_id": 3, "confidence": 0.9},   # kept
        {"index": 1, "category_id": 999, "confidence": 0.9},  # unknown id
        {"index": 2, "category_id": 3, "confidence": 0.5},   # too unsure
        {"index": 7, "category_id": 3, "confidence": 0.9},   # not sent
        {"index": "3", "category_id": "4", "confidence": "0.8"},
    ]})
    assert parse_model_answer(raw, {0, 1, 2, 3}, {3, 4}) == {0: 3, 3: 4}


CATEGORIES = [
    {"categories_id_pk": 3, "category_name": "Groceries", "type": "expense", "spending_type": "Core", "is_active": True},
    {"categories_id_pk": 4, "category_name": "Salary", "type": "income", "spending_type": "Income", "is_active": True},
    {"categories_id_pk": 8, "category_name": "Exclude", "type": "exclude", "spending_type": "Core", "is_active": True},
]


class _FakeLLM:
    def __init__(self, answer=None, error=None):
        self.answer, self.error, self.calls = answer, error, []

    def complete_json(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return self.answer(json.loads(kwargs["user_content"]))


def test_history_then_model(monkeypatch):
    rows = _rb_rows()
    history = MerchantHistory([
        {"notes": "Albert", "category_id_fk": 3, "account_id_fk": "a"},
        {"notes": "Albert", "category_id_fk": 3, "account_id_fk": "a"},
    ])

    def answer(payload):
        return json.dumps({"merchants": [
            {"index": m["index"], "category_id": 4 if m["direction"] == "in" else None, "confidence": 0.9}
            for m in payload["merchants"]
        ]})

    llm = _FakeLLM(answer)
    monkeypatch.setattr(router_module, "get_llm_client", lambda: llm)
    suggestions, available = router_module.suggest_categories(rows, CATEGORIES, history)

    assert available is True
    assert suggestions[0].category_id == 3 and suggestions[0].source == "rule"
    assert suggestions[3].category_id == 4 and suggestions[3].source == "model"
    assert 1 not in suggestions
    # Albert was answered by history, so it is not sent to the model.
    sent = json.loads(llm.calls[0]["user_content"])["merchants"]
    assert "Albert" not in [m["merchant"] for m in sent]


def test_ai_opt_out_uses_history_only(monkeypatch):
    llm = _FakeLLM(error=AssertionError("the model must not be called"))
    monkeypatch.setattr(router_module, "get_llm_client", lambda: llm)
    history = MerchantHistory([
        {"notes": "Albert", "category_id_fk": 3, "account_id_fk": "a"},
        {"notes": "Albert", "category_id_fk": 3, "account_id_fk": "a"},
    ])
    suggestions, available = router_module.suggest_categories(_rb_rows(), CATEGORIES, history, use_ai=False)
    assert available is True
    assert llm.calls == []
    assert {i: s.source for i, s in suggestions.items()} == {0: "rule"}


def test_provider_failure_returns_preview_without_suggestions(monkeypatch):
    llm = _FakeLLM(error=RuntimeError("rate limited"))
    monkeypatch.setattr(router_module, "get_llm_client", lambda: llm)
    suggestions, available = router_module.suggest_categories(_rb_rows(), CATEGORIES, MerchantHistory([]))
    assert available is False
    assert suggestions == {}


# ================================================================================================
#                                       Starting balance
# ================================================================================================

def test_balance_adjustment_maths():
    # Account had 1000 before; the file adds -300; the bank says 5000 now -> +4300.
    assert balance_adjustment(Decimal("5000"), Decimal("1000"), Decimal("-300")) == Decimal("4300")
    assert balance_adjustment(Decimal("700"), Decimal("1000"), Decimal("-300")) == Decimal("0")
    assert adjustment_date(datetime.date(2026, 5, 1)) == datetime.date(2026, 4, 30)


def test_starting_balance_category_lookup_order():
    named = {"categories_id_pk": 5, "category_name": "starting balance", "type": "exclude", "is_active": True}
    other_exclude = {"categories_id_pk": 6, "category_name": "Transfers", "type": "exclude", "is_active": True}
    inactive_named = {"categories_id_pk": 7, "category_name": "Starting Balance", "type": "exclude", "is_active": False}
    wrong_type = {"categories_id_pk": 9, "category_name": "Starting Balance", "type": "income", "is_active": True}

    assert pick_starting_balance_category([other_exclude, named]) == 5
    assert pick_starting_balance_category([inactive_named, wrong_type, other_exclude]) == 6
    assert pick_starting_balance_category([inactive_named, wrong_type]) is None


# ================================================================================================
#                                   Endpoints (fake Supabase client)
# ================================================================================================

USER = {"user_id": "u-1", "access_token": "token"}
FUND = "f0000000-0000-0000-0000-000000000001"


class _Query:
    def __init__(self, db, table):
        self.db, self.table, self.op, self.payload, self.filters = db, table, "select", None, {}

    def select(self, *a, **k):
        self.op = "select"
        return self

    def insert(self, payload):
        self.op, self.payload = "insert", payload
        return self

    def delete(self):
        self.op = "delete"
        return self

    def eq(self, column, value):
        self.filters[column] = value
        return self

    def lte(self, column, value):
        self.filters[("lte", column)] = value
        return self

    @property
    def not_(self):
        return self

    def __getattr__(self, name):  # gte, lte, order, limit, range, is_ ...
        return lambda *a, **k: self

    def execute(self):
        return SimpleNamespace(data=self.db.handle(self))


class _FakeDB:
    def __init__(self, transactions=None, categories=None, fail_transaction_insert=False):
        self.accounts = [{"accounts_id_pk": "11111111-0000-0000-0000-000000000000", "account_name": "Raiffeisenbank", "currency": "CZK"}]
        self.categories = list(CATEGORIES if categories is None else categories)
        self.transactions = list(transactions or [])
        self.batches: list[dict] = []
        self.funds = [FUND]
        self.fail_transaction_insert = fail_transaction_insert
        self.log: list[tuple[str, str]] = []

    def table(self, name):
        return _Query(self, name)

    def handle(self, q):
        self.log.append((q.table, q.op))
        if q.table == "dim_accounts":
            return [a for a in self.accounts if a["accounts_id_pk"] == q.filters.get("accounts_id_pk")]
        if q.table == "dim_categories_users":
            if q.op == "insert":
                row = {**q.payload, "categories_id_pk": 100}
                self.categories.append(row)
                return [row]
            return self.categories
        if q.table == "dim_categories":
            return [{"spending_type": "Core"}]
        if q.table == "fct_transactions":
            if q.op == "insert":
                if self.fail_transaction_insert:
                    raise RuntimeError("insert failed")
                self.transactions.extend(q.payload)
                return q.payload
            if q.op == "delete":
                batch = q.filters.get("import_batch_id_fk")
                gone = [t for t in self.transactions if t.get("import_batch_id_fk") == batch]
                self.transactions = [t for t in self.transactions if t not in gone]
                return gone
            as_of = q.filters.get(("lte", "date"))
            eqs = {k: v for k, v in q.filters.items() if isinstance(k, str)}
            return [
                t for t in self.transactions
                if (as_of is None or str(t.get("date")) <= as_of) and all(t.get(k) == v for k, v in eqs.items())
            ]
        if q.table == "dim_savings_funds":
            return [{"savings_funds_id_pk": f} for f in self.funds]
        if q.table == "fct_import_batches":
            if q.op == "insert":
                row = {**q.payload, "import_batch_id_pk": "11111111-1111-1111-1111-111111111111",
                       "created_at": "2026-11-14T10:00:00+00:00"}
                self.batches.append(row)
                return [row]
            if q.op == "delete":
                bid = q.filters.get("import_batch_id_pk")
                self.batches = [b for b in self.batches if b["import_batch_id_pk"] != bid]
                return []
            bid = q.filters.get("import_batch_id_pk")
            return [b for b in self.batches if bid is None or b["import_batch_id_pk"] == bid]
        raise AssertionError(q.table)


def _request():
    return Request({"type": "http", "method": "POST", "path": "/", "headers": [], "query_string": b""})


@pytest.fixture
def endpoints(monkeypatch):
    monkeypatch.setattr(router_module.limiter, "enabled", False)
    monkeypatch.setattr(router_module, "is_feature_enabled", lambda token, key: True)
    db = _FakeDB()
    monkeypatch.setattr(router_module, "get_db_client", lambda token: db)
    return db


def _commit_request(**overrides):
    body = {
        "account_id": "11111111-0000-0000-0000-000000000000",
        "file_name": "statement.csv",
        "preset": "raiffeisenbank",
        "rows": [
            {"date": "2026-05-03", "amount": "-1234.50", "notes": "Albert", "category_id_fk": 3},
            {"date": "2026-05-15", "amount": "12500", "notes": "Novák Jan · padel", "category_id_fk": 4},
        ],
    }
    body.update(overrides)
    return StatementCommitRequest.model_validate(body)


async def test_commit_writes_batch_and_rows(endpoints):
    result = await router_module.commit_statement(request=_request(), payload=_commit_request(), user=USER, api_key="k")
    assert result.data.rows_written == 2
    assert result.data.balance_adjustment is None
    assert [t["import_batch_id_fk"] for t in endpoints.transactions] == [result.data.batch.import_batch_id_pk] * 2
    assert endpoints.batches[0]["row_count"] == 2
    assert endpoints.batches[0]["date_from"] == "2026-05-03"


async def test_commit_rejects_unknown_category(endpoints):
    body = _commit_request(rows=[{"date": "2026-05-03", "amount": "-1", "notes": "x", "category_id_fk": 999}])
    with pytest.raises(fastapi.HTTPException) as exc:
        await router_module.commit_statement(request=_request(), payload=body, user=USER, api_key="k")
    assert exc.value.status_code == 400
    assert endpoints.batches == []


async def test_commit_rejects_foreign_account(endpoints):
    with pytest.raises(fastapi.HTTPException) as exc:
        await router_module.commit_statement(
            request=_request(), payload=_commit_request(account_id="99999999-0000-0000-0000-000000000000"), user=USER, api_key="k"
        )
    assert exc.value.status_code == 404


async def test_commit_deletes_batch_when_insert_fails(endpoints):
    endpoints.fail_transaction_insert = True
    with pytest.raises(fastapi.HTTPException) as exc:
        await router_module.commit_statement(request=_request(), payload=_commit_request(), user=USER, api_key="k")
    assert exc.value.status_code == 500
    assert endpoints.batches == []
    assert ("fct_import_batches", "delete") in endpoints.log


async def test_commit_adds_starting_balance(endpoints):
    endpoints.transactions = [{"account_id_fk": "11111111-0000-0000-0000-000000000000", "id_pk": "t0", "amount": 1000, "date": "2026-01-01"}]
    endpoints.categories = [c for c in CATEGORIES if c["type"] != "exclude"]  # forces creating one
    result = await router_module.commit_statement(
        request=_request(), payload=_commit_request(closing_balance="20000"), user=USER, api_key="k"
    )
    # 20000 - (1000 + (-1234.50 + 12500)) = 7734.50
    assert result.data.balance_adjustment == Decimal("7734.50")
    adjustment = endpoints.transactions[-1]
    assert adjustment["amount"] == 7734.50
    assert adjustment["date"] == "2026-05-02"
    assert adjustment["notes"] == "Starting balance"
    assert adjustment["category_id_fk"] == 100
    assert endpoints.categories[-1]["category_name"] == "Starting Balance"
    assert endpoints.categories[-1]["type"] == "exclude"


async def test_starting_balance_ignores_later_transactions(endpoints):
    # A November row already in the ledger must not count against a balance stated for May.
    endpoints.transactions = [
        {"account_id_fk": "11111111-0000-0000-0000-000000000000", "id_pk": "t0", "amount": 1000, "date": "2026-01-01"},
        {"account_id_fk": "11111111-0000-0000-0000-000000000000", "id_pk": "t1", "amount": -400, "date": "2026-11-01"},
    ]
    result = await router_module.commit_statement(
        request=_request(), payload=_commit_request(closing_balance="20000"), user=USER, api_key="k"
    )
    assert result.data.balance_adjustment == Decimal("7734.50")
    # Exclude-type category already exists -> no new category is created.
    assert endpoints.transactions[-1]["category_id_fk"] == 8


async def test_commit_fund_rows_and_opening_balance(endpoints):
    account = "11111111-0000-0000-0000-000000000000"
    # Already in the fund before the file: 1000 (a contribution of -1000 from the account).
    endpoints.transactions = [
        {"account_id_fk": account, "id_pk": "t0", "amount": 5000, "date": "2026-01-01"},
        {"account_id_fk": account, "id_pk": "t1", "amount": -1000, "date": "2026-02-01", "savings_fund_id_fk": FUND},
    ]
    body = _commit_request(fund_balances=[{"savings_fund_id_fk": FUND, "balance": "50000"}])
    result = await router_module.commit_statement(request=_request(), payload=body, user=USER, api_key="k")

    # 50000 - 1000 already in the fund = 49000 opening.
    assert result.data.fund_adjustments == {FUND: Decimal("49000")}
    fund_row = endpoints.transactions[-1]
    assert (fund_row["amount"], fund_row["savings_fund_id_fk"], fund_row["date"]) == (-49000.0, FUND, "2026-05-02")
    # No closing balance given: the account row only gives the opening back, so the account balance
    # is exactly what it would be without the fund opening.
    account_row = endpoints.transactions[-2]
    assert account_row["amount"] == 49000.0 and account_row["savings_fund_id_fk"] is None
    assert result.data.balance_adjustment == Decimal("49000")
    imported = [t for t in endpoints.transactions if t.get("import_batch_id_fk")]
    assert all(t["savings_fund_id_fk"] is None for t in imported[:2])


async def test_commit_fund_opening_with_closing_balance(endpoints):
    body = _commit_request(
        closing_balance="20000",
        fund_balances=[{"savings_fund_id_fk": FUND, "balance": "3000"}],
    )
    result = await router_module.commit_statement(request=_request(), payload=body, user=USER, api_key="k")
    # Account correction 20000 - 11265.50 = 8734.50, plus the 3000 given back for the fund opening.
    assert result.data.balance_adjustment == Decimal("11734.50")
    account_total = sum(Decimal(str(t["amount"])) for t in endpoints.transactions)
    assert account_total == Decimal("20000")  # the account ends exactly at the stated balance


async def test_commit_rejects_unknown_fund(endpoints):
    body = _commit_request(
        fund_balances=[{"savings_fund_id_fk": "f9999999-0000-0000-0000-000000000000", "balance": "1"}]
    )
    with pytest.raises(fastapi.HTTPException) as exc:
        await router_module.commit_statement(request=_request(), payload=body, user=USER, api_key="k")
    assert exc.value.status_code == 400
    assert endpoints.batches == []


async def test_balance_date_covers_rows_after_the_last_imported_one(endpoints):
    account = "11111111-0000-0000-0000-000000000000"
    # Already in the ledger on the file's last day, after the last row being imported.
    endpoints.transactions = [{"account_id_fk": account, "id_pk": "t0", "amount": -500, "date": "2026-05-25"}]
    body = _commit_request(closing_balance="20000", balance_date="2026-05-25")
    result = await router_module.commit_statement(request=_request(), payload=body, user=USER, api_key="k")
    assert sum(Decimal(str(t["amount"])) for t in endpoints.transactions) == Decimal("20000")
    assert result.data.balance_adjustment == Decimal("9234.50")


async def test_commit_skips_zero_adjustment(endpoints):
    result = await router_module.commit_statement(
        request=_request(), payload=_commit_request(closing_balance="11265.50"), user=USER, api_key="k"
    )
    assert result.data.balance_adjustment is None
    assert len(endpoints.transactions) == 2


async def test_undo_deletes_transactions_then_batch(endpoints):
    result = await router_module.commit_statement(request=_request(), payload=_commit_request(), user=USER, api_key="k")
    batch_id = result.data.batch.import_batch_id_pk
    undo = await router_module.undo_batch(request=_request(), batch_id=batch_id, user=USER, api_key="k")
    assert undo.data.transactions_deleted == 2
    assert endpoints.transactions == [] and endpoints.batches == []
    tx_delete = endpoints.log.index(("fct_transactions", "delete"))
    batch_delete = endpoints.log.index(("fct_import_batches", "delete"))
    assert tx_delete < batch_delete


async def test_undo_unknown_batch_is_404(endpoints):
    for batch_id in ("not-a-uuid", "22222222-2222-2222-2222-222222222222"):
        with pytest.raises(fastapi.HTTPException) as exc:
            await router_module.undo_batch(request=_request(), batch_id=batch_id, user=USER, api_key="k")
        assert exc.value.status_code == 404


def _upload(data: bytes, name: str = "statement.csv", content_type: str = "text/csv") -> UploadFile:
    return UploadFile(file=io.BytesIO(data), filename=name, headers=Headers({"content-type": content_type}))


async def test_preview_raiffeisen_file(endpoints, monkeypatch):
    monkeypatch.setattr(router_module, "_load_history", lambda token: MerchantHistory([]))
    monkeypatch.setattr(router_module, "get_llm_client", lambda: _FakeLLM(error=RuntimeError("down")))
    endpoints.transactions = [{"account_id_fk": "11111111-0000-0000-0000-000000000000", "id_pk": "t0", "date": "2026-05-03", "amount": -1234.5}]

    result = await router_module.preview_statement(
        request=_request(), file=_upload(_csv_bytes(RB_HEADER, RB_ROWS)), account_id="11111111-0000-0000-0000-000000000000", mapping=None,
        user=USER, api_key="k",
    )
    data = result.data
    assert data.needs_mapping is False
    assert data.preset is not None and data.preset.key == "raiffeisenbank"
    assert (data.date_from, data.date_to, data.currency) == (datetime.date(2026, 5, 3), datetime.date(2026, 5, 25), "CZK")
    assert [r.duplicate for r in data.rows] == [True, False, False, False, False, False, False]
    assert [r.own_transfer for r in data.rows] == [False, False, False, False, False, True, False]
    assert data.suggestions_available is False
    assert all(r.category_source == FieldSource.NONE for r in data.rows)
    assert data.rows[0].merchant_key == "albert"


async def test_preview_unknown_file_needs_mapping(endpoints):
    data = _csv_bytes(["Booking day", "Value", "Text"], [["01.05.2026", "-1,00", "x"]] * 3)
    result = await router_module.preview_statement(
        request=_request(), file=_upload(data), account_id="11111111-0000-0000-0000-000000000000", mapping=None, user=USER, api_key="k",
    )
    assert result.data.needs_mapping is True
    assert result.data.headers == ["Booking day", "Value", "Text"]
    assert len(result.data.sample_rows) == 3
    assert result.data.rows == []


@pytest.mark.parametrize("name, content_type, data, status_code", [
    ("statement.pdf", "application/pdf", b"%PDF", 415),
    ("statement.csv", "image/png", b"x", 415),
    ("statement.csv", "text/csv", b"", 400),
    ("statement.csv", "text/csv", b"x" * (5 * 1024 * 1024 + 1), 413),
], ids=["pdf", "image", "empty", "too-large"])
async def test_preview_rejections(endpoints, name, content_type, data, status_code):
    with pytest.raises(fastapi.HTTPException) as exc:
        await router_module.preview_statement(
            request=_request(), file=_upload(data, name, content_type), account_id="11111111-0000-0000-0000-000000000000", mapping=None,
            user=USER, api_key="k",
        )
    assert exc.value.status_code == status_code


async def test_preview_accepts_unusual_csv_content_type(endpoints, monkeypatch):
    monkeypatch.setattr(router_module, "_load_history", lambda token: MerchantHistory([]))
    monkeypatch.setattr(router_module, "get_llm_client", lambda: _FakeLLM(error=RuntimeError("down")))
    result = await router_module.preview_statement(
        request=_request(), file=_upload(_csv_bytes(RB_HEADER, RB_ROWS), content_type="text/comma-separated-values"),
        account_id="11111111-0000-0000-0000-000000000000", mapping=None, user=USER, api_key="k",
    )
    assert len(result.data.rows) == len(RB_ROWS)


async def test_preview_foreign_account_is_404(endpoints):
    with pytest.raises(fastapi.HTTPException) as exc:
        await router_module.preview_statement(
            request=_request(), file=_upload(_csv_bytes(RB_HEADER, RB_ROWS)), account_id="nope", mapping=None,
            user=USER, api_key="k",
        )
    assert exc.value.status_code == 404


async def test_feature_flag_off_is_403_everywhere(endpoints, monkeypatch):
    monkeypatch.setattr(router_module, "is_feature_enabled", lambda token, key: False)
    calls = [
        router_module.preview_statement(request=_request(), file=_upload(b"x"), account_id=None, mapping=None,
                                        user=USER, api_key="k"),
        router_module.commit_statement(request=_request(), payload=_commit_request(), user=USER, api_key="k"),
        router_module.list_batches(request=_request(), user=USER, api_key="k"),
        router_module.undo_batch(request=_request(), batch_id="11111111-1111-1111-1111-111111111111",
                                 user=USER, api_key="k"),
    ]
    for call in calls:
        with pytest.raises(fastapi.HTTPException) as exc:
            await call
        assert exc.value.status_code == 403
