"""LDAP / Active Directory login and directory sync over LDAPS or STARTTLS.

Login: bind with the service account, find the user's DN, then bind as the user with the given
password. Certificates are verified (``LOTSE_LDAP_CA_FILE`` for a company CA). Group membership
in ``ldap_admin_group`` / ``ldap_editor_group`` sets the role on every login.
"""

from __future__ import annotations

import ssl
import uuid

from sqlalchemy.orm import Session

from app.config import settings
from app.models import User

try:
    from ldap3 import ALL_ATTRIBUTES, SUBTREE, Connection, Server, Tls
    from ldap3.utils.conv import escape_filter_chars
except ImportError:  # ldap3 is optional when LDAP is disabled
    Connection = None


class LdapError(RuntimeError):
    pass


def _server():
    if Connection is None:
        raise LdapError("ldap3 is not installed")
    if not settings.ldap_host:
        raise LdapError("No LDAP server configured")
    tls = Tls(
        validate=ssl.CERT_REQUIRED if settings.ldap_verify_cert else ssl.CERT_NONE,
        ca_certs_file=None if settings.ldap_ca_pem else (settings.ldap_ca_file or None),
        ca_certs_data=settings.ldap_ca_pem or None,
        version=ssl.PROTOCOL_TLS_CLIENT,
    )
    return Server(settings.ldap_host, port=settings.ldap_port, use_ssl=settings.ldap_mode == "ldaps",
                  tls=tls, connect_timeout=5)


def _connect(dn: str, password: str):
    conn = Connection(_server(), user=dn, password=password, receive_timeout=10, raise_exceptions=False)
    try:
        if not conn.open() and conn.closed:
            raise LdapError(f"Cannot reach {settings.ldap_host}:{settings.ldap_port}")
        if settings.ldap_mode == "starttls" and not conn.start_tls():
            raise LdapError(f"STARTTLS failed: {conn.result.get('description', '')}")
    except LdapError:
        raise
    except Exception as exc:  # socket / TLS / certificate errors from ldap3
        raise LdapError(f"{type(exc).__name__}: {exc}") from exc
    if not conn.bind():
        return None
    return conn


def _first(entry, attr: str):
    if not attr or attr not in entry:
        return None
    value = entry[attr].value
    if isinstance(value, list):
        value = value[0] if value else None
    return value


def _role_for(entry) -> str:
    groups = [g.lower() for g in (entry["memberOf"].values if "memberOf" in entry else [])]
    if settings.ldap_admin_group and settings.ldap_admin_group.lower() in groups:
        return "admin"
    if settings.ldap_editor_group and settings.ldap_editor_group.lower() in groups:
        return "editor"
    return "user"


def _save_photo(data: bytes | None) -> str | None:
    if not data or not isinstance(data, bytes | bytearray):
        return None
    name = f"ldap-{uuid.uuid4().hex}.jpg"
    (settings.upload_dir / name).write_bytes(bytes(data))
    return f"/uploads/{name}"


def _upsert(db: Session, entry) -> User:
    username = str(_first(entry, settings.ldap_attr_username) or "").lower()
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        user = User(username=username, auth_source="ldap")
        db.add(user)
    user.auth_source = "ldap"
    user.password_hash = None
    user.first_name = str(_first(entry, settings.ldap_attr_first_name) or "")
    user.last_name = str(_first(entry, settings.ldap_attr_last_name) or "")
    user.email = _first(entry, settings.ldap_attr_email)
    ldap_dept = str(_first(entry, settings.ldap_attr_department) or "").strip()
    if ldap_dept:
        if settings.ldap_departments_auto:
            from app.routers.departments import ensure_department  # local import avoids a cycle
            user.department = ensure_department(db, ldap_dept).name  # keeps the list's spelling
        else:
            user.department = ldap_dept
    user.position = str(_first(entry, settings.ldap_attr_title) or user.position or "")
    user.phone_ext = str(_first(entry, settings.ldap_attr_phone) or user.phone_ext or "")
    user.role = _role_for(entry)
    photo = _save_photo(_first(entry, settings.ldap_attr_photo))
    if photo:
        user.avatar_url = photo
    return user


def authenticate(db: Session, username: str, password: str) -> User | None:
    if not settings.ldap_enabled or not password:
        return None
    service = _connect(settings.ldap_bind_dn, settings.ldap_bind_password)
    if service is None:
        raise LdapError("Service account bind failed")
    try:
        service.search(settings.ldap_base_dn,
                       settings.ldap_user_filter.format(username=escape_filter_chars(username)),
                       SUBTREE, attributes=ALL_ATTRIBUTES)
        if len(service.entries) != 1:
            return None
        entry = service.entries[0]
    finally:
        service.unbind()
    user_conn = _connect(entry.entry_dn, password)
    if user_conn is None:
        return None
    user_conn.unbind()
    user = _upsert(db, entry)
    db.commit()
    return user


def test_connection(username: str = "") -> dict:
    """Bind with the service account, count entries under the base DN and optionally look up one user."""
    conn = _connect(settings.ldap_bind_dn, settings.ldap_bind_password)
    if conn is None:
        raise LdapError("Server reached, but the service account (bind DN / password) was rejected")
    try:
        result = {"server": f"{settings.ldap_mode}://{settings.ldap_host}:{settings.ldap_port}",
                  "tls": bool(conn.tls_started or settings.ldap_mode == "ldaps")}
        if username:
            conn.search(settings.ldap_base_dn,
                        settings.ldap_user_filter.format(username=escape_filter_chars(username)),
                        SUBTREE, attributes=ALL_ATTRIBUTES)
            if not conn.entries:
                result["user"] = None
            else:
                e = conn.entries[0]
                result["user"] = {
                    "dn": e.entry_dn,
                    "name": f"{_first(e, settings.ldap_attr_first_name) or ''} {_first(e, settings.ldap_attr_last_name) or ''}".strip(),
                    "email": _first(e, settings.ldap_attr_email),
                    "department": _first(e, settings.ldap_attr_department),
                    "role": _role_for(e),
                }
        else:
            conn.search(settings.ldap_base_dn, settings.ldap_sync_filter, SUBTREE, attributes=[], size_limit=1000)
            result["users_found"] = len(conn.entries)
        return result
    finally:
        conn.unbind()


def sync_all(db: Session) -> int:
    """Import/refresh every directory user matching ``ldap_sync_filter``. Returns the count."""
    if not settings.ldap_enabled:
        raise LdapError("LDAP is disabled")
    conn = _connect(settings.ldap_bind_dn, settings.ldap_bind_password)
    if conn is None:
        raise LdapError("Service account bind failed")
    count = 0
    try:
        entries = conn.extend.standard.paged_search(settings.ldap_base_dn, settings.ldap_sync_filter,
                                                    SUBTREE, attributes=ALL_ATTRIBUTES, generator=True)
        for raw in entries:
            if raw.get("type") != "searchResEntry":
                continue
            conn.search(raw["dn"], "(objectClass=*)", attributes=ALL_ATTRIBUTES)
            if conn.entries and _first(conn.entries[0], settings.ldap_attr_username):
                _upsert(db, conn.entries[0])
                count += 1
        db.commit()
    finally:
        conn.unbind()
    return count
