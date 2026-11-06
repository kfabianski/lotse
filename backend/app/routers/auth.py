from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app import ldap_auth
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
    return {"company_name": settings.company_name, "ldap_enabled": settings.ldap_enabled,
            "public_read": settings.public_read, "login_image_url": settings.login_image_url or None}


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    username = body.username.strip().lower()
    user = db.query(User).filter(User.username == username).first()
    if user and user.auth_source == "local":
        if not verify_password(body.password, user.password_hash):
            user = None
    elif settings.ldap_enabled:
        try:
            user = ldap_auth.authenticate(db, username, body.password)
        except ldap_auth.LdapError as exc:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, f"Directory unavailable: {exc}")
    else:
        user = None
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong username or password")
    return {"access_token": create_token(user), "user": user_out(user)}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user_out(user)


@router.patch("/me", response_model=UserOut)
def update_me(body: MeUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.language:
        user.language = body.language
    if body.phone_ext is not None:
        user.phone_ext = body.phone_ext.strip()
    if body.new_password:
        if user.auth_source != "local":
            raise HTTPException(400, "Directory accounts change their password in Windows/LDAP")
        if not verify_password(body.current_password or "", user.password_hash):
            raise HTTPException(400, "Current password is wrong")
        user.password_hash = hash_password(body.new_password)
    db.commit()
    return user_out(user)


@router.post("/me/avatar", response_model=UserOut)
async def upload_my_avatar(file: UploadFile = File(...), user: User = Depends(current_user),
                           db: Session = Depends(get_db)):
    user.avatar_url = await save_image(file, "avatar")
    db.commit()
    return user_out(user)
