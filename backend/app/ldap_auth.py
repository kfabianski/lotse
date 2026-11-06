"""LDAP / Active Directory login and directory sync over LDAPS or STARTTLS.

Login: bind with the service account, find the user's DN, then bind as the user with the given
password. Certificates are verified (``LOTSE_LDAP_CA_FILE`` for a company CA). Group membership
in ``ldap_admin_group`` / ``ldap_editor_group`` sets the role on every login.
"""

from __future__ import annotations

import hashlib
import json
import ssl

from sqlalchemy.orm import Session

from app.config import settings
from app.models import Department, User

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
    """Store an AD photo once: the file name is the content hash, so the same photo is never written twice."""
    if not data or not isinstance(data, bytes | bytearray):
        return None
    name = f"ldap-{hashlib.sha1(bytes(data)).hexdigest()[:24]}.jpg"
    path = settings.upload_dir / name
    if not path.exists():
        path.write_bytes(bytes(data))
    return f"/uploads/{name}"


def entry_data(entry) -> dict:
    """The fields Lotse takes from one directory entry (normalised)."""
    email = _first(entry, settings.ldap_attr_email)
    return {
        "username": str(_first(entry, settings.ldap_attr_username) or "").strip().lower(),
        "first_name": str(_first(entry, settings.ldap_attr_first_name) or ""),
        "last_name": str(_first(entry, settings.ldap_attr_last_name) or ""),
        "email": str(email).strip().lower() if email else None,
        "department": str(_first(entry, settings.ldap_attr_department) or "").strip(),
        "position": str(_first(entry, settings.ldap_attr_title) or ""),
        "phone_ext": str(_first(entry, settings.ldap_attr_phone) or ""),
        "role": _role_for(entry),
        "photo": _first(entry, settings.ldap_attr_photo),
        "dn": str(getattr(entry, "entry_dn", "") or ""),
        "manager_dn": str(_first(entry, settings.ldap_attr_manager) or "").strip(),
    }


def _special(user: User) -> bool:
    return user.role != "user" or bool(json.loads(user.permissions or "[]"))


def match(db: Session, data: dict) -> tuple[User | None, str]:
    """Find the Lotse account for a directory person: by user name, otherwise by e-mail address
    (unique per person - names can be spelled differently). Returns (user, "username" | "email" | "")."""
    user = db.query(User).filter(User.username == data["username"]).first()
    if user:
        return user, "username"
    if data["email"]:
        user = db.query(User).filter(User.email.isnot(None), User.email.ilike(data["email"])).first()
        if user:
            return user, "email"
    return None, ""


def apply_data(db: Session, user: User, data: dict) -> None:
    """Write the directory data onto the account. LDAP is leading for these fields."""
    user.auth_source = "ldap"
    user.password_hash = None
    user.first_name = data["first_name"]
    user.last_name = data["last_name"]
    user.email = data["email"]
    if data["department"]:
        if settings.ldap_departments_auto:
            from app.routers.departments import ensure_department  # local import avoids a cycle
            user.department = ensure_department(db, data["department"]).name  # keeps the list's spelling
        else:
            user.department = data["department"]
    user.position = data["position"] or user.position or ""
    user.phone_ext = data["phone_ext"] or user.phone_ext or ""
    # AD groups grant admin/editor and take it away again; a role an admin set in Lotse stays.
    if data["role"] != "user":
        if user.role_source == "local" and user.role != data["role"]:
            user.role_local = user.role  # remember what the admin set in Lotse
        user.role, user.role_source = data["role"], "ldap"
    elif user.role_source == "ldap" or not user.role:
        # no (longer) in an AD group: back to the role set in Lotse, otherwise employee
        if user.role_local:
            user.role, user.role_source, user.role_local = user.role_local, "local", None
        else:
            user.role, user.role_source = "user", "ldap"
    photo = _save_photo(data["photo"])
    if photo:
        user.avatar_url = photo
    if data.get("dn"):
        user.ldap_dn = data["dn"]


def resolve_manager(db: Session, user: User, manager_dn: str) -> bool:
    """Set ``user.manager_id`` from the directory DN of the manager (when that person is in Lotse).
    Returns True when something changed. Never creates a loop."""
    manager = None
    if manager_dn:
        manager = db.query(User).filter(User.ldap_dn.isnot(None), User.ldap_dn.ilike(manager_dn)).first()
        if manager is None or manager.id == user.id:
            return False  # manager not (yet) in Lotse: keep what is there
        seen, cur = {user.id}, manager
        while cur is not None and cur.manager_id:
            if cur.manager_id in seen:
                return False
            seen.add(cur.manager_id)
            cur = db.get(User, cur.manager_id)
    new = manager.id if manager else None
    if user.manager_id != new:
        user.manager_id = new
        return True
    return False


def _upsert(db: Session, entry) -> User:
    """Login: create or refresh the account. An existing local account with the same e-mail address is linked
    instead of creating a duplicate - but never automatically when it has special rights (admin decides)."""
    data = entry_data(entry)
    user, how = match(db, data)
    if user is not None and how == "email" and user.auth_source == "local" and _special(user):
        raise LdapError("A local account with this e-mail address has special rights - "
                        "an administrator must link it in the LDAP sync first")
    if user is None:
        user = User(username=data["username"], auth_source="ldap", role="user", role_source="ldap")
        db.add(user)
    elif how == "email":
        user.username = data["username"]  # linked: from now on the directory user name is used
    apply_data(db, user, data)
    db.flush()
    resolve_manager(db, user, data.get("manager_dn", ""))
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


def lookup_and_upsert(db: Session, username: str) -> User | None:
    """SSO: the proxy has already verified the Windows user; fetch their directory data and sign them in."""
    if not settings.ldap_enabled:
        return None
    conn = _connect(settings.ldap_bind_dn, settings.ldap_bind_password)
    if conn is None:
        raise LdapError("Service account bind failed")
    try:
        conn.search(settings.ldap_base_dn, settings.ldap_user_filter.format(username=escape_filter_chars(username)),
                    SUBTREE, attributes=ALL_ATTRIBUTES)
        if len(conn.entries) != 1:
            return None
        entry = conn.entries[0]
    finally:
        conn.unbind()
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


def fetch_directory() -> list[dict]:
    """All directory people matching ``ldap_sync_filter`` as normalised dicts (see ``entry_data``)."""
    if not settings.ldap_enabled:
        raise LdapError("LDAP is disabled")
    conn = _connect(settings.ldap_bind_dn, settings.ldap_bind_password)
    if conn is None:
        raise LdapError("Service account bind failed")
    out = []
    try:
        entries = conn.extend.standard.paged_search(settings.ldap_base_dn, settings.ldap_sync_filter,
                                                    SUBTREE, attributes=ALL_ATTRIBUTES, generator=True)
        for raw in entries:
            if raw.get("type") != "searchResEntry":
                continue
            conn.search(raw["dn"], "(objectClass=*)", attributes=ALL_ATTRIBUTES)
            if conn.entries:
                data = entry_data(conn.entries[0])
                if data["username"]:
                    out.append(data)
    finally:
        conn.unbind()
    return out


FIELDS = ("first_name", "last_name", "email", "department", "position", "phone_ext")


def plan(db: Session, people: list[dict]) -> dict:
    """What a sync would change - nothing is written. The admin chooses what to apply."""
    by_username = {p["username"]: p for p in people}
    by_dn = {p["dn"].lower(): p for p in people if p.get("dn")}
    emails = {}
    for p in people:
        if p["email"]:
            emails.setdefault(p["email"], []).append(p["username"])
    result = {"new": [], "link": [], "update": [], "reactivate": [], "missing": [], "departments_new": [],
              "departments_other": [], "duplicate_emails": [{"email": e, "usernames": u} for e, u in emails.items() if len(u) > 1],
              "total": len(people)}
    seen_ids = set()
    for p in people:
        user, how = match(db, p)
        name = f"{p['first_name']} {p['last_name']}".strip() or p["username"]
        if user is None:
            dup = bool(p["email"] and len(emails.get(p["email"], [])) > 1)
            result["new"].append({"username": p["username"], "name": name, "email": p["email"], "department": p["department"],
                                  "duplicate_email": dup})  # same e-mail twice in the directory: fix it there first
            continue
        seen_ids.add(user.id)
        if user.auth_source == "local":
            result["link"].append({"user_id": user.id, "local_username": user.username, "ldap_username": p["username"],
                                   "name": name, "email": p["email"], "matched_by": how, "special": _special(user),
                                   "role": user.role})
            continue
        changes = []
        for f in FIELDS:
            new = p[f] or ("" if f != "email" else None)
            old = getattr(user, f)
            if f == "department" and new and settings.ldap_departments_auto:
                existing = db.query(Department).filter(Department.name.ilike(new)).first()
                new = existing.name if existing else new
            if f in ("position", "phone_ext") and not new:
                continue  # empty directory values keep what is there
            if (old or "") != (new or ""):
                changes.append({"field": f, "old": old or "", "new": new or ""})
        new_mgr = by_dn.get((p.get("manager_dn") or "").lower())
        if p.get("manager_dn") and new_mgr is not None:
            mgr_user, _ = match(db, new_mgr)
            new_name = mgr_user.full_name if mgr_user else f"{new_mgr['first_name']} {new_mgr['last_name']}".strip()
            old_name = db.get(User, user.manager_id).full_name if user.manager_id and db.get(User, user.manager_id) else ""
            if new_name != old_name:
                changes.append({"field": "manager", "old": old_name, "new": new_name})
        if changes:
            result["update"].append({"user_id": user.id, "name": user.full_name, "changes": changes})
        if not user.is_active:
            result["reactivate"].append({"user_id": user.id, "name": user.full_name})
    for u in db.query(User).filter(User.auth_source == "ldap", User.is_active.is_(True)).all():
        if u.id not in seen_ids and u.username not in by_username:
            result["missing"].append({"user_id": u.id, "name": u.full_name, "username": u.username, "department": u.department})
    ldap_depts = {p["department"].lower(): p["department"] for p in people if p["department"]}
    existing = {d.name.lower(): d for d in db.query(Department).all()}
    result["departments_new"] = sorted(v for k, v in ldap_depts.items() if k not in existing)
    for key, d in existing.items():
        if key not in ldap_depts:
            remaining = [u for u in db.query(User).filter(User.department == d.name, User.is_active.is_(True))
                         if not (u.auth_source == "ldap" or u.id in seen_ids)]  # LDAP people get their LDAP department
            result["departments_other"].append({"id": d.id, "name": d.name, "source": d.source,
                                                 "people_left": len(remaining)})
    return result


def apply_plan(db: Session, people: list[dict], choices: dict) -> dict:
    """Apply the admin's choices: add / link / update / reactivate / deactivate people, remove departments."""
    add = set(choices.get("add", []))
    link = set(choices.get("link", []))
    deactivate = set(choices.get("deactivate", []))
    remove_depts = set(choices.get("remove_departments", []))
    do_update = bool(choices.get("update", True))
    counts: dict[str, int] = {}
    for p in people:
        if p["email"]:
            counts[p["email"]] = counts.get(p["email"], 0) + 1
    done = {"added": 0, "linked": 0, "updated": 0, "deactivated": 0, "departments_removed": 0}
    for p in people:
        user, how = match(db, p)
        if user is None:
            if p["username"] in add and not (p["email"] and counts.get(p["email"], 0) > 1):
                user = User(username=p["username"], auth_source="ldap", role="user", role_source="ldap")
                db.add(user)
                apply_data(db, user, p)
                done["added"] += 1
            continue
        if user.auth_source == "local":
            if user.id in link:
                if how == "email":
                    clash = db.query(User).filter(User.username == p["username"], User.id != user.id).first()
                    if clash is None:
                        user.username = p["username"]
                apply_data(db, user, p)
                user.is_active = True
                done["linked"] += 1
            continue
        if do_update:
            apply_data(db, user, p)
            user.is_active = True
            done["updated"] += 1
        db.flush()
    managers = 0  # second pass: everybody exists now, so "manager" DNs can be resolved
    for p in people:
        user, _ = match(db, p)
        if user is not None and user.auth_source == "ldap" and (do_update or user.id in link or p["username"] in add):
            managers += resolve_manager(db, user, p.get("manager_dn", ""))
    done["managers"] = managers
    for uid in deactivate:
        u = db.get(User, uid)
        if u and u.auth_source == "ldap" and u.is_active:
            u.is_active = False
            done["deactivated"] += 1
    db.flush()
    for did in remove_depts:
        d = db.get(Department, did)
        if d and not db.query(User).filter(User.department == d.name, User.is_active.is_(True)).count():
            db.query(User).filter(User.department == d.name).update({User.department: ""})  # inactive leftovers
            db.delete(d)
            done["departments_removed"] += 1
    db.commit()
    return done
