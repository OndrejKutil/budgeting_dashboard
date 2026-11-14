"""
Unit tests for the recurring auto-post notification plumbing.

The posting itself happens in Postgres (post_due_recurring(), run by pg_cron), so what's
testable here is the backend's side of the contract: flattening a posting row into a
notification, the partial-update request, route ordering, and that the Python date stepping
used for manual posts matches the month-end clamping the SQL job relies on.
"""

import os
import sys
from datetime import date

import pytest
from pydantic import ValidationError

current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.abspath(os.path.join(current_dir, "../../"))
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from backend.routers.recurring import _advance_date, _to_notification, router  # noqa: E402
from backend.schemas.requests import RecurringRequest, RecurringToggleRequest  # noqa: E402

# ================================================================================================
#                                   _to_notification
# ================================================================================================

def _posting(tx):
    return {
        "recurring_postings_id_pk": "p-1",
        "user_id_fk": "u-1",
        "recurring_id_fk": "r-1",
        "transaction_id_fk": "t-1",
        "occurrence_date": "2026-11-01",
        "posted_at": "2026-11-01T03:15:00+00:00",
        "acknowledged_at": None,
        "fct_transactions": tx,
    }


def test_notification_flattens_embedded_transaction():
    n = _to_notification(_posting({
        "id_pk": "t-1",
        "user_id_fk": "u-1",
        "account_id_fk": "a-1",
        "category_id_fk": 7,
        "amount": "-1290.5",
        "date": "2026-11-01",
        "notes": "Rent",
        "created_at": None,
        "savings_fund_id_fk": None,
        "fct_transaction_tags": [{"tag_id_fk": 3, "dim_tags": {"tags_id_pk": 3, "tag_name": "Home"}}],
    }))

    assert n is not None
    assert n.posting_id == "p-1"
    assert n.transaction_id == "t-1"
    assert n.occurrence_date == date(2026, 11, 1)
    assert float(n.transaction.amount) == -1290.5
    assert n.transaction.notes == "Rent"
    assert n.transaction.category_id_fk == 7
    assert [t.tag_name for t in n.transaction.tags or []] == ["Home"]


def test_notification_without_transaction_is_skipped():
    # Embedded row missing (transaction deleted between the cascade and the read): no notification.
    assert _to_notification(_posting(None)) is None


# ================================================================================================
#                                   Requests
# ================================================================================================

def test_toggle_request_omits_unset_fields():
    assert RecurringToggleRequest(auto_post=True).model_dump(exclude_none=True) == {"auto_post": True}
    assert RecurringToggleRequest().model_dump(exclude_none=True) == {}


def test_toggle_request_rejects_non_bool():
    with pytest.raises(ValidationError):
        RecurringToggleRequest(is_active="maybe")


def test_recurring_request_defaults_auto_post_off():
    body = RecurringRequest(
        account_id_fk="a-1", category_id_fk=1, amount="-100", cadence="monthly", next_date=date(2026, 12, 1)
    )
    assert body.auto_post is False


# ================================================================================================
#                                   Routing
# ================================================================================================

def test_notification_routes_precede_template_id_routes():
    # "/notifications/..." must be matched before any "/{recurring_id}..." route of the same method.
    paths = [(r.path, sorted(r.methods)) for r in router.routes]
    notif_get = paths.index(("/notifications", ["GET"]))
    ack_all = paths.index(("/notifications/ack-all", ["POST"]))
    post_one = paths.index(("/{recurring_id}/post", ["POST"]))
    assert notif_get < post_one
    assert ack_all < post_one


# ================================================================================================
#                                   Date stepping (mirrors post_due_recurring())
# ================================================================================================

@pytest.mark.parametrize(
    ("start", "cadence", "expected"),
    [
        (date(2026, 1, 31), "monthly", date(2026, 2, 28)),
        (date(2026, 11, 30), "quarterly", date(2027, 2, 28)),
        (date(2028, 2, 29), "yearly", date(2029, 2, 28)),
        (date(2026, 12, 28), "weekly", date(2027, 1, 4)),
        (date(2026, 12, 28), "biweekly", date(2027, 1, 11)),
    ],
)
def test_advance_date_clamps_like_postgres_intervals(start, cadence, expected):
    assert _advance_date(start, cadence) == expected
