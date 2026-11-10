import secrets
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", env_prefix="LOTSE_", extra="ignore")

    company_name: str = "Muster GmbH"
    color_scheme: str = "hafen"  # colour scheme of the portal, picked by the admin
    login_image_url: str = ""  # own photo for the sign-in page; empty = bundled illustration
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'data' / 'lotse.db').as_posix()}"
    upload_dir: Path = BACKEND_DIR / "data" / "uploads"
    frontend_dist: Path = BACKEND_DIR.parent / "frontend" / "dist"
    secret_key: str = ""  # empty = random key generated once and kept in data/.secret_key
    token_minutes: int = 60 * 12
    cors_origins: list[str] = ["http://localhost:5173"]
    max_upload_mb: int = 8
    max_pdf_mb: int = 25
    max_video_mb: int = 500  # training videos
    training_dir: Path = BACKEND_DIR / "data" / "trainings"  # NOT public: served only via signed links
    # True: everyone on the network can read everything without signing in; sign-in is only needed
    # to post or edit. False: the whole intranet requires sign-in.
    public_read: bool = True
    # Public holidays shown in the calendar: country ("DE") or country-region ("DE-NI", "AT-9", "CH-ZH").
    holiday_regions: list[str] = ["DE", "AT", "CH"]
    # Windows sign-in (SSO) for people signed in to their company PC. Two ways (deploy/kerberos/README.md):
    #   "kerberos": Lotse checks the browser's Kerberos ticket itself (no IIS; needs pyspnego and an SPN).
    #   "proxy":    a web server with Windows authentication passes the user in a header; only requests
    #               from the trusted proxy addresses are believed.
    sso_enabled: bool = False
    sso_mode: str = "kerberos"
    sso_kerberos_hostname: str = ""  # address of the portal as in the SPN, e.g. intranet.firma.local; empty = any
    sso_kerberos_keytab: str = ""  # Linux only: path to the keytab with HTTP/<address>
    sso_header: str = "X-Remote-User"
    trusted_proxies: list[str] = ["127.0.0.1", "::1"]

    # Notifications (e-mail via SMTP, Microsoft Teams channel webhook)
    portal_url: str = ""  # address of the intranet for links in mails, e.g. https://intranet.firma.local
    notify_email: bool = False
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_mode: str = "starttls"  # starttls | ssl | none
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""  # e.g. intranet@firma.de
    notify_teams: bool = False
    teams_webhook_url: str = ""

    # LDAP / Active Directory. With ldaps:// (or start_tls) the server certificate is verified.
    ldap_enabled: bool = False
    ldap_host: str = ""  # IP address or host name of the domain controller, e.g. 10.0.0.5 or dc01.firma.local
    ldap_port: int = 636
    ldap_mode: str = "ldaps"  # "ldaps" (SSL, usually 636) or "starttls" (usually 389)
    ldap_ca_file: str | None = None  # PEM file with the company CA; None = system trust store
    ldap_ca_pem: str = ""  # same, pasted as text in the admin settings (wins over ldap_ca_file)
    ldap_verify_cert: bool = True
    ldap_bind_dn: str = ""  # service account used to look users up
    ldap_bind_password: str = ""
    ldap_base_dn: str = "DC=firma,DC=local"
    ldap_user_filter: str = "(&(objectClass=user)(sAMAccountName={username}))"
    ldap_sync_filter: str = "(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))"
    ldap_attr_username: str = "sAMAccountName"
    ldap_attr_first_name: str = "givenName"
    ldap_attr_last_name: str = "sn"
    ldap_attr_email: str = "mail"
    ldap_attr_department: str = "department"
    ldap_attr_title: str = "title"
    ldap_attr_phone: str = "telephoneNumber"
    ldap_attr_photo: str = "thumbnailPhoto"
    ldap_attr_manager: str = "manager"
    ldap_attr_branch: str = "physicalDeliveryOfficeName"  # Niederlassung; empty = set by hand
    ldap_attr_start_date: str = "whenCreated"  # first day (only filled when empty); new accounts otherwise get today
    footer_text: str = ""  # free text in the page footer, e.g. address or imprint note
    ldap_departments_auto: bool = True  # create departments from the LDAP "department" attribute
    ldap_admin_group: str = ""  # full DN; members become admins
    ldap_editor_group: str = ""  # full DN; members become editors


# Settings an administrator may change in the web UI; stored in the app_settings table and applied
# on top of the .env values at startup and on every save.
EDITABLE = {
    "company_name", "public_read", "color_scheme", "login_image_url", "holiday_regions", "sso_enabled", "sso_mode", "sso_kerberos_hostname", "sso_kerberos_keytab", "sso_header", "trusted_proxies", "ldap_enabled", "ldap_host", "ldap_port", "ldap_mode", "ldap_ca_pem",
    "ldap_verify_cert", "ldap_bind_dn", "ldap_bind_password", "ldap_base_dn", "ldap_user_filter",
    "ldap_sync_filter", "ldap_admin_group", "ldap_departments_auto", "ldap_editor_group", "ldap_attr_username", "ldap_attr_first_name",
    "ldap_attr_last_name", "ldap_attr_email", "ldap_attr_department", "ldap_attr_title", "ldap_attr_phone",
    "ldap_attr_photo", "ldap_attr_manager", "ldap_attr_branch", "ldap_attr_start_date", "footer_text", "portal_url", "notify_email", "smtp_host", "smtp_port", "smtp_mode",
    "smtp_user", "smtp_password", "smtp_from", "notify_teams", "teams_webhook_url",
}
SECRET = {"ldap_bind_password", "smtp_password", "teams_webhook_url"}  # never sent back to the browser

settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
settings.training_dir.mkdir(parents=True, exist_ok=True)
if not settings.secret_key:
    _key_file = BACKEND_DIR / "data" / ".secret_key"
    _key_file.parent.mkdir(parents=True, exist_ok=True)
    if not _key_file.exists():
        _key_file.write_text(secrets.token_urlsafe(48), encoding="utf-8")
    settings.secret_key = _key_file.read_text(encoding="utf-8").strip()
