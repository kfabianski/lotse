"""Windows sign-in without IIS: Lotse checks the browser's Kerberos ticket itself (HTTP Negotiate / SPNEGO, RFC 4559).

Windows server (domain member): SSPI with the account the Lotse service runs as. As SYSTEM that is the computer
account, so the SPN HTTP/<address of the portal> goes onto the computer object (see deploy/kerberos/README.md).
Linux server: MIT Kerberos via gssapi with a keytab (setting sso_kerberos_keytab).

Kerberos needs one round trip. If the browser falls back to NTLM (e.g. the portal is opened by IP address), the
handshake takes several requests on the same connection; the half-finished context is kept per connection for a
minute. Lotse runs as one process, so this in-memory store is enough.
"""

import base64
import binascii
import logging
import os
import threading
import time

from fastapi import HTTPException, Request

from app.config import settings

log = logging.getLogger("lotse.sso")

_TTL = 60  # seconds a half-finished NTLM handshake is kept
_MAX_PENDING = 500
_pending: dict[str, tuple[float, object]] = {}
_lock = threading.Lock()


def available() -> bool:
    try:
        import spnego  # noqa: F401
    except ImportError:
        return False
    return True


def _challenge(detail: str, token: str | None = None) -> HTTPException:
    return HTTPException(401, detail, headers={"WWW-Authenticate": f"Negotiate {token}" if token else "Negotiate"})


def _new_context():
    import spnego

    if settings.sso_kerberos_keytab:
        os.environ["KRB5_KTNAME"] = settings.sso_kerberos_keytab  # Linux/gssapi; ignored by Windows SSPI
    return spnego.server(hostname=settings.sso_kerberos_hostname or "unspecified", service="HTTP", protocol="negotiate")


def authenticate(request: Request) -> tuple[str, str | None]:
    """Return (Windows principal, final token for the browser) or raise 401 with the next Negotiate challenge."""
    if not available():
        raise HTTPException(503, "Kerberos sign-in needs the pyspnego package - see deploy/kerberos/README.md")
    scheme, _, data = request.headers.get("authorization", "").partition(" ")
    if scheme.lower() != "negotiate" or not data.strip():
        raise _challenge("Windows sign-in needed")
    try:
        token = base64.b64decode(data.strip(), validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(400, "Malformed Negotiate token")

    key = f"{request.client.host}:{request.client.port}" if request.client else ""
    now = time.monotonic()
    with _lock:
        for k, (started, _) in list(_pending.items()):
            if now - started > _TTL:
                del _pending[k]
        entry = _pending.pop(key, None) if key else None
    ctx = entry[1] if entry else _new_context()
    try:
        out = ctx.step(token)
    except Exception as exc:  # wrong SPN, clock skew, unknown realm, NTLM rejected ...
        log.warning("Kerberos sign-in failed: %s", exc)
        raise _challenge("Windows sign-in failed") from exc
    out_b64 = base64.b64encode(out).decode("ascii") if out else None
    if not ctx.complete:
        if key:
            with _lock:
                if len(_pending) < _MAX_PENDING:
                    _pending[key] = (now, ctx)
        raise _challenge("Windows sign-in continues", out_b64)
    return str(ctx.client_principal or ""), out_b64
