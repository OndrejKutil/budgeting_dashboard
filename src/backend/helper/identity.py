"""
Identity helpers.

Kept free of heavy imports (no httpx / supabase) so the auth decisions here stay unit-testable
on their own.
"""

from typing import Any


def has_password_identity(user_data: Any) -> bool:
    """
    True when the account can sign in with a password.

    Accounts created through GitHub or Google have only an OAuth identity and no password, so
    they cannot be re-authenticated with one — callers must fall back to a different confirmation
    (see `routers.profile._verify_deletion_credentials`).

    Reads attributes defensively because the shape differs between the Supabase client's user
    object and the raw REST payload.
    """
    identities = getattr(user_data, "identities", None)
    if identities is None and isinstance(user_data, dict):
        identities = user_data.get("identities")

    for identity in identities or []:
        provider = (
            identity.get("provider")
            if isinstance(identity, dict)
            else getattr(identity, "provider", None)
        )
        if provider == "email":
            return True

    return False
