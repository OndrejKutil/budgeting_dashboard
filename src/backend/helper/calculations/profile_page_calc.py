from ...auth.auth import api_key_auth, get_current_user
from ...helper import environment as env
from ...schemas.base import (
    IdentityData,
    ProfileData
)

from typing import Any


def _extract_identity_data(user_data: Any) -> list[IdentityData]:
    """
    Extract identity information from user data.
    """
    identities = getattr(user_data, 'identities', []) or []
    
    return [
        IdentityData(
            id=getattr(identity, 'id', None),
            identity_id=getattr(identity, 'identity_id', None),
            user_id=getattr(identity, 'user_id', None),
            provider=getattr(identity, 'provider', None),
            identity_data=getattr(identity, 'identity_data', {}),
            created_at=getattr(identity, 'created_at', None),
            last_sign_in_at=getattr(identity, 'last_sign_in_at', None),
            updated_at=getattr(identity, 'updated_at', None)
        )
        for identity in identities
    ]


def _build_profile_data(user_data: Any) -> ProfileData:
    """
    Build a ProfileData object from Supabase user data.
    """
    return ProfileData(
        # Core identity
        id=getattr(user_data, 'id', None),
        aud=getattr(user_data, 'aud', None),
        role=getattr(user_data, 'role', None),
        is_anonymous=getattr(user_data, 'is_anonymous', False),
        
        # Email information
        email=getattr(user_data, 'email', None),
        email_confirmed_at=getattr(user_data, 'email_confirmed_at', None),
        email_change_sent_at=getattr(user_data, 'email_change_sent_at', None),
        new_email=getattr(user_data, 'new_email', None),
        
        # Phone information
        phone=getattr(user_data, 'phone', ""),
        phone_confirmed_at=getattr(user_data, 'phone_confirmed_at', None),
        new_phone=getattr(user_data, 'new_phone', None),
        
        # Authentication timestamps
        created_at=getattr(user_data, 'created_at', None),
        updated_at=getattr(user_data, 'updated_at', None),
        last_sign_in_at=getattr(user_data, 'last_sign_in_at', None),
        confirmed_at=getattr(user_data, 'confirmed_at', None),
        confirmation_sent_at=getattr(user_data, 'confirmation_sent_at', None),
        recovery_sent_at=getattr(user_data, 'recovery_sent_at', None),
        invited_at=getattr(user_data, 'invited_at', None),
        
        # Metadata
        app_metadata=getattr(user_data, 'app_metadata', {}),
        user_metadata=getattr(user_data, 'user_metadata', {}),
        
        # Identity and security
        identities=_extract_identity_data(user_data),
        factors=getattr(user_data, 'factors', None),
        action_link=getattr(user_data, 'action_link', None)
    )