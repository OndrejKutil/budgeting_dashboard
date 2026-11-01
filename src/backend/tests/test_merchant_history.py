"""
Unit tests for merchant-history matching used by screenshot import.

The history is what keeps a merchant the user has already filed by hand (Bageterie Boulevard ->
eating out) from being re-guessed by the model on every import, so normalization and the
"consistent enough to apply without the model" threshold are the parts worth pinning down.
"""

import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.abspath(os.path.join(current_dir, "../../"))
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from backend.helper.merchant_history import MerchantHistory, normalize_merchant  # noqa: E402

EATING_OUT = 7
GROCERIES = 3


def _row(note, category, account="acc-1"):
    return {"notes": note, "category_id_fk": category, "account_id_fk": account}


def test_normalize_drops_case_diacritics_digits_and_noise():
    assert normalize_merchant("Bageterie Boulevard Anděl 12") == "bageterie boulevard andel"
    assert normalize_merchant("BAGETERIE BOULEVARD, ANDEL") == "bageterie boulevard andel"
    assert normalize_merchant("ALBERT CR, a.s.") == "albert"
    assert normalize_merchant("Rohlik.cz s.r.o.") == "rohlik"
    assert normalize_merchant("SumUp *Kavárna Pod Lípou") == "kavarna pod lipou"


def test_normalize_empty_inputs():
    assert normalize_merchant(None) == ""
    assert normalize_merchant("") == ""
    assert normalize_merchant("123 / 456") == ""


def test_exact_match_repeated_and_consistent_is_a_rule():
    history = MerchantHistory([
        _row("Bageterie Boulevard", EATING_OUT),
        _row("bageterie boulevard", EATING_OUT),
        _row("Bageterie Boulevard", EATING_OUT),
    ])
    [match] = history.match("BAGETERIE BOULEVARD")
    assert match.exact
    assert match.category_id == EATING_OUT
    assert match.count == 3
    assert match.is_rule


def test_single_occurrence_is_a_hint_not_a_rule():
    history = MerchantHistory([_row("Bageterie Boulevard", EATING_OUT)])
    [match] = history.match("Bageterie Boulevard")
    assert match.exact and not match.is_rule


def test_inconsistent_history_is_not_a_rule():
    history = MerchantHistory([
        _row("Albert", GROCERIES),
        _row("Albert", EATING_OUT),
        _row("Albert", GROCERIES),
    ])
    [match] = history.match("Albert")
    assert match.category_id == GROCERIES
    assert round(match.category_share, 2) == 0.67
    assert not match.is_rule


def test_partial_token_match_is_found_but_never_a_rule():
    history = MerchantHistory([
        _row("Bageterie Boulevard Anděl", EATING_OUT),
        _row("Bageterie Boulevard Anděl", EATING_OUT),
    ])
    [match] = history.match("Bageterie Boulevard")
    assert not match.exact
    assert match.category_id == EATING_OUT
    assert not match.is_rule


def test_unrelated_merchant_has_no_match():
    history = MerchantHistory([_row("Lidl", GROCERIES)])
    assert history.match("Bageterie Boulevard") == []
    assert history.match(None) == []


def test_rows_without_notes_or_category_are_ignored():
    history = MerchantHistory([
        _row(None, GROCERIES),
        _row("Lidl", None),
        _row("   ", GROCERIES),
    ])
    assert len(history) == 0


def test_dominant_account_is_reported():
    history = MerchantHistory([
        _row("Lidl", GROCERIES, "acc-a"),
        _row("Lidl", GROCERIES, "acc-a"),
        _row("Lidl", GROCERIES, "acc-b"),
    ])
    [match] = history.match("Lidl")
    assert match.account_id == "acc-a"
    assert round(match.account_share, 2) == 0.67
