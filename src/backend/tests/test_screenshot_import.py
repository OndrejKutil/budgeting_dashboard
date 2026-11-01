"""
Unit tests for turning a stage-two model answer into a reviewable draft.

`_build_draft` is the trust boundary of screenshot import: whatever the model says, only ids from
the user's own lists may come out of it, and the history rule / user instructions precedence is
decided here.
"""

import datetime
import os
import sys
from decimal import Decimal

current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.abspath(os.path.join(current_dir, "../../"))
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from backend.helper.merchant_history import MerchantHistory  # noqa: E402
from backend.routers.screenshot_import import (  # noqa: E402
    UserContext,
    _build_draft,
    _tag_link_rows,
)
from backend.schemas.base import FieldSource  # noqa: E402

GROCERIES, EATING_OUT, SALARY = 3, 7, 9


def _ctx(accounts=None):
    return UserContext(
        categories=[
            {"id": GROCERIES, "name": "Potraviny", "type": "expense", "spending_type": "Core"},
            {"id": EATING_OUT, "name": "Jídlo venku", "type": "expense", "spending_type": "Fun"},
            {"id": SALARY, "name": "Výplata", "type": "income", "spending_type": "Income"},
        ],
        accounts=accounts if accounts is not None else [
            {"id": "acc-moneta", "name": "Moneta", "type": "checking", "currency": "CZK"},
            {"id": "acc-revolut", "name": "Revolut", "type": "checking", "currency": "EUR"},
        ],
        tags=[{"id": 1, "name": "Vacation"}, {"id": 2, "name": "Work"}],
        savings_funds=[{"id": "fund-japan", "name": "Japan"}],
    )


def _item(**overrides):
    item = {
        "amount": 129.0,
        "currency": "CZK",
        "date": "2026-10-30",
        "merchant": "Bageterie Boulevard",
        "notes": "Bageterie Boulevard",
        "category_id_fk": GROCERIES,
        "account_id_fk": "acc-moneta",
        "savings_fund_id_fk": None,
        "tag_ids": [],
        "new_tag_names": [],
        "confidence": 0.8,
        "unresolved_fields": [],
        "warnings": [],
    }
    item.update(overrides)
    return item


def _history_rule():
    history = MerchantHistory([
        {"notes": "Bageterie Boulevard", "category_id_fk": EATING_OUT, "account_id_fk": "acc-revolut"},
        {"notes": "Bageterie Boulevard", "category_id_fk": EATING_OUT, "account_id_fk": "acc-revolut"},
    ])
    return history.match("Bageterie Boulevard")


def test_happy_path_expense_is_negative_and_model_sourced():
    draft, hits = _build_draft(_item(), _ctx())
    assert hits == 0
    assert draft.amount == Decimal("-129.0")
    assert draft.date == datetime.date(2026, 10, 30)
    assert draft.category_id_fk == GROCERIES
    assert draft.field_sources["category_id_fk"] == FieldSource.MODEL
    assert draft.notes == "Bageterie Boulevard"


def test_income_category_makes_amount_positive():
    draft, _ = _build_draft(_item(amount=-50000, category_id_fk=SALARY), _ctx())
    assert draft.amount == Decimal("50000")


def test_unknown_ids_from_the_model_are_dropped():
    draft, _ = _build_draft(
        _item(category_id_fk=999, account_id_fk="acc-hallucinated", savings_fund_id_fk="fund-x", tag_ids=[1, 42]),
        _ctx(),
    )
    assert draft.category_id_fk is None
    assert draft.field_sources["category_id_fk"] == FieldSource.NONE
    assert draft.account_id_fk is None
    assert draft.field_sources["account_id_fk"] == FieldSource.NONE
    assert draft.savings_fund_id_fk is None
    assert draft.tags == [1]


def test_string_category_id_is_accepted():
    draft, _ = _build_draft(_item(category_id_fk=str(EATING_OUT)), _ctx())
    assert draft.category_id_fk == EATING_OUT


def test_fund_and_tags_pass_through_when_valid():
    draft, _ = _build_draft(_item(savings_fund_id_fk="fund-japan", tag_ids=[2, 2, "1"]), _ctx())
    assert draft.savings_fund_id_fk == "fund-japan"
    assert draft.tags == [2, 1]


def test_new_tag_names_matching_existing_tags_become_ids():
    draft, _ = _build_draft(
        _item(new_tag_names=["vacation", "  Japan   2026 ", "japan 2026", "", 5]),
        _ctx(),
    )
    assert draft.tags == [1]
    assert draft.new_tag_names == ["Japan 2026"]


def test_notes_falls_back_to_merchant():
    item = _item()
    del item["notes"]
    draft, _ = _build_draft(item, _ctx())
    assert draft.notes == "Bageterie Boulevard"


def test_notes_follows_instruction_label():
    draft, _ = _build_draft(_item(notes="Work lunch"), _ctx())
    assert draft.notes == "Work lunch"


def test_history_rule_overrides_model_category():
    draft, hits = _build_draft(_item(category_id_fk=GROCERIES), _ctx(), _history_rule())
    assert draft.category_id_fk == EATING_OUT
    assert draft.field_sources["category_id_fk"] == FieldSource.RULE
    # Model already picked an account, so history doesn't touch it.
    assert draft.account_id_fk == "acc-moneta"
    assert hits == 1


def test_history_rule_fills_unresolved_account():
    draft, hits = _build_draft(_item(account_id_fk=None, currency=None), _ctx(), _history_rule())
    assert draft.account_id_fk == "acc-revolut"
    assert draft.field_sources["account_id_fk"] == FieldSource.RULE
    assert draft.currency == "EUR"
    assert hits == 2


def test_history_rule_is_skipped_when_user_gave_instructions():
    draft, hits = _build_draft(
        _item(category_id_fk=GROCERIES), _ctx(), _history_rule(), instructions_given=True
    )
    assert draft.category_id_fk == GROCERIES
    assert draft.field_sources["category_id_fk"] == FieldSource.MODEL
    assert hits == 0


def test_single_account_is_default_filled():
    ctx = _ctx(accounts=[{"id": "acc-only", "name": "Main", "type": "checking", "currency": "CZK"}])
    draft, _ = _build_draft(_item(account_id_fk=None), ctx)
    assert draft.account_id_fk == "acc-only"
    assert draft.field_sources["account_id_fk"] == FieldSource.DEFAULT


def test_unparseable_date_becomes_a_warning():
    draft, _ = _build_draft(_item(date="yesterday"), _ctx())
    assert draft.date is None
    assert draft.field_sources["date"] == FieldSource.NONE
    assert any("yesterday" in w for w in draft.warnings)


def test_tag_link_rows_pairs_inserted_rows_with_requested_tags():
    inserted = [{"id_pk": "t1"}, {"id_pk": "t2"}, {"id_pk": "t3"}]
    rows = _tag_link_rows(inserted, [[1, 2, 1], None, [2]], "user-1")
    assert rows == [
        {"transaction_id_fk": "t1", "tag_id_fk": 1, "user_id_fk": "user-1"},
        {"transaction_id_fk": "t1", "tag_id_fk": 2, "user_id_fk": "user-1"},
        {"transaction_id_fk": "t3", "tag_id_fk": 2, "user_id_fk": "user-1"},
    ]
