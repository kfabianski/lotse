from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile, status
from sqlalchemy.orm import Session

from app import ldap_auth, ratelimit, sso_kerberos
from app.config import settings
from app.db import get_db
from app.models import User
from app.schemas import LoginIn, MeUpdate, TokenOut, UserOut
from app.security import create_token, current_user, hash_password, verify_password
from app.serialize import user_out
from app.uploads import save_image

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/config")
def public_config():
    """What the login screen needs to know before anyone is signed in."""
    return {"company_name": settings.company_name, "color_scheme": settings.color_scheme, "footer_text": settings.footer_text, "ldap_enabled": settings.ldap_enabled,
            "hidden_categories": list(settings.hidden_categories or []),
            "public_read": settings.public_read, "login_image_url": settings.login_image_url or None,
            "ldap_departments_auto": settings.ldap_enabled and settings.ldap_departments_auto,
            "ldap_branch_attr": bool(settings.ldap_enabled and settings.ldap_attr_branch),
            "sso_enabled": settings.sso_enabled and settings.ldap_enabled, "sso_mode": settings.sso_mode,
            "social_facebook": settings.social_facebook, "social_linkedin": settings.social_linkedin,
            "social_instagram": settings.social_instagram}


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    username = body.username.strip().lower()
    ip = ratelimit.client_ip(request)
    wait = ratelimit.wait_seconds(username, ip)
    if wait:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, f"Too many failed attempts - try again in {wait} seconds",
                            headers={"Retry-After": str(wait)})
    user = db.query(User).filter(User.username == username).first()
    if user and user.auth_source == "local":
        if not verify_password(body.password, user.password_hash):
            user = None
    elif settings.ldap_enabled:
        try:
            user = ldap_auth.authenticate(db, username, body.password)
        except ldap_auth.LdapError as exc:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Directory unavailable") from exc
    else:
        user = None
    if not user or not user.is_active:
        wait = ratelimit.failed(username, ip)
        if wait:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, f"Too many failed attempts - try again in {wait} seconds",
                                headers={"Retry-After": str(wait)})
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong username or password")
    ratelimit.succeeded(username)
    return {"access_token": create_token(user), "user": user_out(user, full=True)}


def _windows_name(raw: str) -> str:
    """'FIRMA\\m.mustermann' or 'm.mustermann@FIRMA.LOCAL' -> 'm.mustermann'."""
    name = raw.strip().split("\\")[-1].split("@")[0].strip().lower()
    return name if name and len(name) <= 80 and all(c.isalnum() or c in "._-$" for c in name) else ""


@router.get("/sso")
def windows_sign_in(request: Request, response: Response, db: Session = Depends(get_db)):
    """Windows sign-in. "kerberos": Lotse verifies the browser's Kerberos ticket itself. "proxy": trusted only
    from the configured reverse proxy, which has verified the Windows account."""
    if not (settings.sso_enabled and settings.ldap_enabled):
        raise HTTPException(404, "Windows sign-in is not enabled")
    response.headers["Cache-Control"] = "no-store"
    if settings.sso_mode == "kerberos":
        principal, final_token = sso_kerberos.authenticate(request)
        if final_token:
            response.headers["WWW-Authenticate"] = f"Negotiate {final_token}"  # mutual authentication
    else:
        if not request.client or request.client.host not in settings.trusted_proxies:
            raise HTTPException(403, "Windows sign-in only via the company web server")
        principal = request.headers.get(settings.sso_header, "")
    username = _windows_name(principal)
    if not username:
        raise HTTPException(401, "No Windows account was passed on")
    user = db.query(User).filter(User.username == username).first()
    if user is not None and user.auth_source != "ldap":
        raise HTTPException(403, "This account is not a directory (LDAP) account")
    try:
        user = ldap_auth.lookup_and_upsert(db, username) or user
    except ldap_auth.LdapError as exc:
        if user is None:
            raise HTTPException(503, "Directory unavailable") from exc
    if not user or not user.is_active:
        raise HTTPException(403, "No active account for this Windows user")
    return {"access_token": create_token(user), "user": user_out(user, full=True)}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user_out(user, full=True)


@router.patch("/me", response_model=UserOut)
def update_me(body: MeUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.language:
        user.language = body.language
    if body.phone_ext is not None:
        user.phone_ext = body.phone_ext.strip()
    if body.notify_articles is not None:
        user.notify_articles = body.notify_articles
    if body.notify_ideas is not None:
        user.notify_ideas = body.notify_ideas
    if body.color_scheme is not None:
        user.color_scheme = body.color_scheme or None
    if body.new_password:
        if user.auth_source != "local":
            raise HTTPException(400, "Directory accounts change their password in Windows/LDAP")
        if not verify_password(body.current_password or "", user.password_hash):
            raise HTTPException(400, "Current password is wrong")
        user.password_hash = hash_password(body.new_password)
    db.commit()
    return user_out(user, full=True)


@router.post("/me/avatar", response_model=UserOut)
async def upload_my_avatar(file: UploadFile = File(...), user: User = Depends(current_user),
                           db: Session = Depends(get_db)):
    user.avatar_url = await save_image(file, "avatar")
    db.commit()
    return user_out(user, full=True)
