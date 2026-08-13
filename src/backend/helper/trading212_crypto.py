"""
At-rest encryption for a user's Trading212 API key + secret.

Fernet (AES-128-CBC + HMAC, authenticated) rather than something bespoke -- this is one
credential pair for one user, not a high-throughput encryption workload, so a well-reviewed
library primitive beats a hand-rolled cipher. The key lives only in `T212_ENCRYPTION_KEY`
(backend process env), never in Postgres -- so a database dump alone can never recover a
connected user's broker credentials.
"""

import json
import logging

from cryptography.fernet import Fernet, InvalidToken

from . import environment as env

logger = logging.getLogger(__name__)


class T212CredentialsError(Exception):
    """Raised when stored T212 credentials cannot be decrypted (wrong/rotated key, or corrupt data)."""


def _fernet() -> Fernet:
    if not env.T212_ENCRYPTION_KEY:
        raise OSError("T212_ENCRYPTION_KEY is not set.")
    return Fernet(env.T212_ENCRYPTION_KEY.encode("utf-8"))


def encrypt_credentials(api_key: str, api_secret: str) -> str:
    """Encrypt a T212 API key + secret pair into one opaque token for storage."""
    payload = json.dumps({"api_key": api_key, "api_secret": api_secret}).encode("utf-8")
    return _fernet().encrypt(payload).decode("utf-8")


def decrypt_credentials(token: str) -> tuple[str, str]:
    """Decrypt a stored token back into (api_key, api_secret)."""
    try:
        payload = _fernet().decrypt(token.encode("utf-8"))
        data = json.loads(payload)
        return data["api_key"], data["api_secret"]
    except (InvalidToken, KeyError, ValueError) as e:
        logger.error("Failed to decrypt stored T212 credentials")
        logger.info(f"Decryption error: {e}")
        raise T212CredentialsError("Stored Trading212 credentials could not be decrypted.") from e
