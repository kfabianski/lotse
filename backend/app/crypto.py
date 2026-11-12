"""Secrets at rest. The passwords an administrator enters in the settings (LDAP service account, SMTP, Teams
webhook) are stored in the ``app_settings`` table encrypted with a key derived from the Lotse secret key
(``LOTSE_SECRET_KEY`` or ``data/.secret_key``). Values saved by older versions in plain text are re-encrypted
the next time the settings are loaded. A changed secret key makes the stored secrets unreadable; they are then
treated as empty and have to be entered again."""
import base64
import hashlib
import logging

from app.config import settings

log = logging.getLogger("lotse.crypto")
PREFIX = "enc1:"


def _fernet():
    try:
        from cryptography.fernet import Fernet
    except ImportError:  # should not happen: pyspnego depends on cryptography
        return None
    key = base64.urlsafe_b64encode(hashlib.sha256(("lotse-settings:" + settings.secret_key).encode()).digest())
    return Fernet(key)


def is_sealed(stored: str | None) -> bool:
    return bool(stored) and str(stored).startswith(PREFIX)


def seal(value: str | None) -> str:
    """Encrypt for storage; empty values stay empty."""
    f = _fernet()
    if not value or f is None:
        if value and f is None:
            log.warning("cryptography is not installed - a password is stored in plain text")
        return value or ""
    return PREFIX + f.encrypt(value.encode()).decode()


def unseal(stored: str | None) -> str:
    """Decrypt a stored value; plain text from older versions is returned as is."""
    if not stored or not is_sealed(stored):
        return stored or ""
    f = _fernet()
    if f is None:
        log.warning("cryptography is not installed - an encrypted password cannot be read")
        return ""
    try:
        return f.decrypt(str(stored)[len(PREFIX):].encode()).decode()
    except Exception:  # noqa: BLE001 - wrong key or damaged value
        log.warning("a stored password cannot be decrypted (was the secret key changed?) - please enter it again in the settings")
        return ""
