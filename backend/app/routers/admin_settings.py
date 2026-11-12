"""Admin settings editable in the web UI (company, public reading, LDAP connection)."""

import json
import re
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import crypto, ldap_auth
from app.config import EDITABLE, SECRET, settings
from app.db import SessionLocal, get_db
from app.models import CATEGORIES, AppSetting, User
from app.security import require, require_perm
from app.uploads import save_image

router = APIRouter(prefix="/api/admin/settings", tags=["admin"])


class SettingsIn(BaseModel):
    company_name: str = Field(min_length=1, max_length=120)
    public_read: bool
    color_scheme: Literal["hafen", "signal", "meer", "indigo", "nordsee", "fjord", "azur", "marine"] = "hafen"
    hidden_categories: list[str] = Field(default=[], max_length=8)  # sections the company does not use
    holiday_regions: list[str] = Field(default=["DE", "AT", "CH"], max_length=12)
    sso_enabled: bool = False
    sso_mode: Literal["kerberos", "proxy"] = "kerberos"
    sso_kerberos_hostname: str = Field(default="", max_length=255, pattern=r"^[A-Za-z0-9.\-]*$")
    sso_kerberos_keytab: str = Field(default="", max_length=500)
    sso_header: str = Field(default="X-Remote-User", pattern=r"^[A-Za-z][A-Za-z0-9-]{1,60}$")
    trusted_proxies: list[str] = Field(default=["127.0.0.1", "::1"], max_length=10)
    ldap_enabled: bool
    ldap_host: str = Field(default="", max_length=255, pattern=r"^[A-Za-z0-9.\-:\[\]]*$")
    ldap_port: int = Field(ge=1, le=65535)
    ldap_mode: Literal["ldaps", "starttls"]
    ldap_verify_cert: bool
    ldap_ca_pem: str = Field(default="", max_length=20000)
    ldap_bind_dn: str = ""
    ldap_bind_password: str | None = None  # None/empty = keep the stored password
    ldap_base_dn: str = ""
    ldap_user_filter: str = Field(default="(&(objectClass=user)(sAMAccountName={username}))")
    ldap_sync_filter: str = ""
    ldap_admin_group: str = ""
    ldap_editor_group: str = ""
    ldap_departments_auto: bool = True
    ldap_attr_username: str = "sAMAccountName"
    ldap_attr_first_name: str = "givenName"
    ldap_attr_last_name: str = "sn"
    ldap_attr_email: str = "mail"
    ldap_attr_department: str = "department"
    ldap_attr_title: str = "title"
    ldap_attr_phone: str = "telephoneNumber"
    ldap_attr_photo: str = "thumbnailPhoto"
    ldap_attr_manager: str = "manager"
    ldap_attr_branch: str = "physicalDeliveryOfficeName"
    ldap_attr_start_date: str = Field(default="whenCreated", max_length=60)
    footer_text: str = Field(default="", max_length=300)
    social_facebook: str = Field(default="", max_length=300)
    social_linkedin: str = Field(default="", max_length=300)
    social_instagram: str = Field(default="", max_length=300)
    jobs_enabled: bool = False
    portal_url: str = Field(default="", max_length=200, pattern=r"^(https?://[^\s]+)?$")
    notify_email: bool = False
    notify_mode: Literal["immediate", "weekly"] = "immediate"
    digest_weekday: int = Field(default=4, ge=0, le=6)
    digest_hour: int = Field(default=16, ge=0, le=23)
    smtp_host: str = Field(default="", max_length=255, pattern=r"^[A-Za-z0-9.\-:\[\]]*$")
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_mode: Literal["starttls", "ssl", "none"] = "starttls"
    smtp_user: str = Field(default="", max_length=200)
    smtp_password: str | None = None  # None/empty = keep the stored one
    smtp_from: str = Field(default="", max_length=200)
    notify_teams: bool = False
    teams_webhook_url: str | None = None  # None/empty = keep the stored one


class TestIn(BaseModel):
    username: str = ""


def apply_overrides(db: Session) -> None:
    """Copy stored admin settings onto the in-process settings object. Passwords are stored encrypted; values an
    older version saved in plain text are encrypted on the way."""
    rows = db.query(AppSetting).all()
    changed = False
    for row in rows:
        if row.key not in EDITABLE:
            continue
        value = json.loads(row.value)
        if row.key in SECRET:
            if value and not crypto.is_sealed(value):
                row.value = json.dumps(crypto.seal(value))
                changed = True
            value = crypto.unseal(value)
        setattr(settings, row.key, value)
    if changed:
        db.commit()
    if settings.sso_enabled and "sso_mode" not in {row.key for row in rows}:
        settings.sso_mode = "proxy"  # saved before Kerberos existed: that Windows sign-in ran through a web server


def load_overrides_at_startup() -> None:
    db = SessionLocal()
    try:
        apply_overrides(db)
    finally:
        db.close()


def current_view() -> dict:
    data = {key: getattr(settings, key) for key in sorted(EDITABLE) if key not in SECRET}
    data["ldap_bind_password_set"] = bool(settings.ldap_bind_password)
    data["smtp_password_set"] = bool(settings.smtp_password)
    data["teams_webhook_url_set"] = bool(settings.teams_webhook_url)
    return data


@router.get("")
def get_settings(_: User = Depends(require("admin"))):
    return current_view()


@router.put("")
def save_settings(body: SettingsIn, _: User = Depends(require("admin")), db: Session = Depends(get_db)):
    from app.public_holidays import valid_region
    bad = [r for r in body.holiday_regions if not valid_region(r)]
    if bad:
        raise HTTPException(422, f"Unknown holiday region: {', '.join(bad)}")
    body.holiday_regions = list(dict.fromkeys(body.holiday_regions))
    hidden = [c for c in body.hidden_categories if c not in CATEGORIES or c in ("news", "events")]
    if hidden:
        raise HTTPException(422, f"These sections cannot be hidden: {', '.join(hidden)}")
    body.hidden_categories = list(dict.fromkeys(body.hidden_categories))
    import ipaddress
    try:
        body.trusted_proxies = [str(ipaddress.ip_address(x.strip())) for x in body.trusted_proxies if x.strip()]
    except ValueError:
        raise HTTPException(422, "Trusted proxies must be IP addresses")
    if body.sso_enabled and not body.ldap_enabled:
        raise HTTPException(422, "Windows sign-in needs LDAP")
    if body.sso_enabled and body.sso_mode == "proxy" and not body.trusted_proxies:
        raise HTTPException(422, "Windows sign-in via a web server needs at least one trusted proxy address")
    if body.sso_enabled and body.sso_mode == "kerberos":
        from app import sso_kerberos
        if not sso_kerberos.available():
            raise HTTPException(422, "Kerberos sign-in needs the pyspnego package - see deploy/kerberos/README.md")
    for field, host in (("social_facebook", "facebook.com"), ("social_linkedin", "linkedin.com"), ("social_instagram", "instagram.com")):
        url = getattr(body, field).strip()
        if url and not re.match(rf"^https://([a-z0-9-]+\.)?{re.escape(host)}/\S+$", url, re.I):
            raise HTTPException(422, f"Bitte die vollständige Adresse der Seite eintragen, z. B. https://www.{host}/…")
        setattr(body, field, url)
    if "{username}" not in body.ldap_user_filter:
        raise HTTPException(422, "The user filter must contain {username}")
    if body.ldap_ca_pem.strip() and "BEGIN CERTIFICATE" not in body.ldap_ca_pem:
        raise HTTPException(422, "The CA certificate must be in PEM format (-----BEGIN CERTIFICATE-----)")
    if body.ldap_enabled and not (body.ldap_host and body.ldap_base_dn):
        raise HTTPException(422, "Enter the LDAP server and base DN before enabling LDAP")
    if body.teams_webhook_url and not body.teams_webhook_url.startswith("https://"):
        raise HTTPException(422, "The Teams webhook must be an https:// address")
    if body.notify_email and not (body.smtp_host and "@" in body.smtp_from):
        raise HTTPException(422, "E-mail notifications need an SMTP server and a sender address")
    if body.notify_teams and not (body.teams_webhook_url or settings.teams_webhook_url):
        raise HTTPException(422, "Teams notifications need the webhook address")
    values = body.model_dump()
    for secret in ("ldap_bind_password", "smtp_password", "teams_webhook_url"):
        if not values[secret]:
            values.pop(secret)  # keep the stored one
    for key, value in values.items():
        stored = crypto.seal(value) if key in SECRET else value  # passwords never sit in the database in plain text
        row = db.get(AppSetting, key)
        if row is None:
            db.add(AppSetting(key=key, value=json.dumps(stored)))
        else:
            row.value = json.dumps(stored)
        setattr(settings, key, value)
    db.commit()
    return current_view()


def _store(db: Session, key: str, value) -> None:
    row = db.get(AppSetting, key)
    if row is None:
        db.add(AppSetting(key=key, value=json.dumps(value)))
    else:
        row.value = json.dumps(value)
    setattr(settings, key, value)
    db.commit()


@router.post("/login-image")
async def upload_login_image(file: UploadFile = File(...), _: User = Depends(require("admin")),
                             db: Session = Depends(get_db)):
    """Own photo for the sign-in page (e.g. the team in the office)."""
    _store(db, "login_image_url", await save_image(file, "login"))
    return current_view()


@router.delete("/login-image")
def reset_login_image(_: User = Depends(require("admin")), db: Session = Depends(get_db)):
    _store(db, "login_image_url", "")
    return current_view()


class MailTestIn(BaseModel):
    to: str = Field(min_length=3, max_length=200, pattern=r"^[^@\s]+@[^@\s]+$")


@router.post("/mail-test")
def mail_test(body: MailTestIn, _: User = Depends(require("admin"))):
    """Send a test mail with the saved settings; returns the reason when it fails."""
    import smtplib

    from app import notify
    if not (settings.smtp_host and settings.smtp_from):
        return {"ok": False, "error": "SMTP-Server und Absender eintragen und speichern."}
    msg = notify._message(body.to, "Test: Benachrichtigungen funktionieren",
                          "Diese Test-Nachricht kommt aus dem Intranet. Alles bereit.",
                          notify._html("Test erfolgreich", "Diese Test-Nachricht kommt aus dem Intranet. Alles bereit.",
                                       notify.portal("/"), "Intranet öffnen", ""))
    try:
        with notify._smtp() as server:
            server.send_message(msg)
        return {"ok": True}
    except (OSError, smtplib.SMTPException) as exc:
        return {"ok": False, "error": str(exc)[:300]}


@router.post("/teams-test")
def teams_test(_: User = Depends(require("admin"))):
    from app import notify
    if not settings.teams_webhook_url:
        return {"ok": False, "error": "Webhook-Adresse eintragen und speichern."}
    ok = notify.post_teams("Test aus dem Intranet", "Die Verbindung zu Teams funktioniert.", notify.portal("/"))
    return {"ok": ok, **({} if ok else {"error": "Teams hat die Nachricht nicht angenommen."})}


@router.post("/ldap-test")
def ldap_test(body: TestIn, _: User = Depends(require("admin"))):
    """Try the saved LDAP settings. Returns ok/error instead of raising, so the UI can show the reason."""
    try:
        return {"ok": True, **ldap_auth.test_connection(body.username.strip())}
    except ldap_auth.LdapError as exc:
        return {"ok": False, "error": str(exc)}


# --- editable notification mails -------------------------------------------------------------------------
class TemplateIn(BaseModel):
    subject: str = Field("", max_length=300)
    body: str = Field("", max_length=30000)


class TemplatesIn(BaseModel):
    article: TemplateIn
    idea: TemplateIn
    training: TemplateIn
    digest: TemplateIn


class PreviewIn(BaseModel):
    kind: Literal["article", "idea", "training", "digest"]
    subject: str = Field("", max_length=300)
    body: str = Field("", max_length=30000)
    to: str = Field("", max_length=200)


def _templates_view(db: Session) -> dict:
    from app import mail_templates as mt
    return {"templates": mt.load(db), "defaults": mt.DEFAULTS,
            "shortcodes": {k: {**v, **mt.COMMON} for k, v in mt.SHORTCODES.items()}}


# Mail texts: admins and people with the "mails" permission (e.g. HR). They change the texts for the whole
# portal, but never see or change the mailbox (SMTP) or Teams settings.
@router.get("/mail-templates")
def get_mail_templates(_: User = Depends(require_perm("mails")), db: Session = Depends(get_db)):
    return _templates_view(db)


@router.put("/mail-templates")
def save_mail_templates(body: TemplatesIn, _: User = Depends(require_perm("mails")), db: Session = Depends(get_db)):
    from app import mail_templates as mt
    mt.save(db, body.model_dump())
    return _templates_view(db)


def _sample(body: PreviewIn, me: User):
    from app import mail_templates as mt
    from app import notify
    tpl = {"subject": body.subject or mt.DEFAULTS[body.kind]["subject"], "body": body.body or mt.DEFAULTS[body.kind]["body"]}
    values = {**mt.SAMPLE[body.kind], **notify._person(me)}
    url = notify.portal(values.pop("path"))
    if not url.startswith("http"):
        url = "https://intranet.example" + url  # preview only: show the button even without a portal address
    return mt.render(body.kind, tpl, values, url)


@router.post("/mail-templates/preview")
def preview_mail_template(body: PreviewIn, me: User = Depends(require_perm("mails"))):
    """Renders the (unsaved) template with example data."""
    subject, page, _ = _sample(body, me)
    return {"subject": subject, "html": page}


@router.post("/mail-templates/test")
def test_mail_template(body: PreviewIn, me: User = Depends(require_perm("mails"))):
    import smtplib

    from app import notify
    if me.role != "admin":
        body.to = me.email or ""  # non-admins can only send the test to themselves
    if not re.match(r"^[^@\s]+@[^@\s]+$", body.to or ""):
        raise HTTPException(422, "E-Mail-Adresse fehlt")
    if not (settings.smtp_host and settings.smtp_from):
        return {"ok": False, "error": "SMTP-Server und Absender eintragen und speichern."}
    subject, page, text = _sample(body, me)
    try:
        with notify._smtp() as server:
            server.send_message(notify._message(body.to, "[Test] " + subject, text, page))
        return {"ok": True}
    except (OSError, smtplib.SMTPException) as exc:
        return {"ok": False, "error": str(exc)[:300]}
