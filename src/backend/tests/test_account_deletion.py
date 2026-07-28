"""
Unit tests for the account-deletion re-authentication gate.

Deleting an account is irreversible and used to require nothing beyond the ambient JWT. These
cover the two pieces that decide which credential is demanded and whether it is accepted.
"""

from types import SimpleNamespace

from helper.identity import has_password_identity
from schemas.requests import DeleteAccountRequest

# ================================================================================================
#                                   Identity detection
# ================================================================================================

def test_password_identity_detected():
    """An account with an email identity can re-authenticate with a password."""
    user = SimpleNamespace(identities=[SimpleNamespace(provider="email")])
    assert has_password_identity(user) is True


def test_oauth_only_account_has_no_password():
    """GitHub/Google-only accounts have no password, so they must confirm another way."""
    user = SimpleNamespace(identities=[SimpleNamespace(provider="github")])
    assert has_password_identity(user) is False


def test_linked_account_with_both_identities_uses_password():
    """Linking GitHub to a password account must not downgrade it to email confirmation."""
    user = SimpleNamespace(identities=[
        SimpleNamespace(provider="google"),
        SimpleNamespace(provider="email"),
    ])
    assert has_password_identity(user) is True


def test_missing_or_empty_identities_is_not_password():
    """Absent identity data must never be read as 'has a password'."""
    assert has_password_identity(SimpleNamespace()) is False
    assert has_password_identity(SimpleNamespace(identities=None)) is False
    assert has_password_identity(SimpleNamespace(identities=[])) is False


def test_identities_as_dicts():
    """The raw REST payload delivers identities as dicts rather than objects."""
    assert has_password_identity({"identities": [{"provider": "email"}]}) is True
    assert has_password_identity({"identities": [{"provider": "github"}]}) is False


# ================================================================================================
#                                   Request schema
# ================================================================================================

def test_delete_account_request_accepts_password():
    body = DeleteAccountRequest(password="hunter2", email_confirmation=None)
    assert body.password == "hunter2"
    assert body.email_confirmation is None


def test_delete_account_request_accepts_email_confirmation():
    body = DeleteAccountRequest(password=None, email_confirmation="user@example.com")
    assert body.email_confirmation == "user@example.com"
    assert body.password is None


def test_delete_account_request_allows_empty_body():
    """Both fields are optional at the schema level; which one is required is decided
    server-side from the user's identities, and a missing credential is rejected there."""
    body = DeleteAccountRequest.model_validate({})
    assert body.password is None
    assert body.email_confirmation is None
