from datetime import datetime, timedelta, timezone

import json

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import User

_bearer = HTTPBearer(auto_error=False)
ROLE_RANK = {"user": 0, "author": 0, "hr": 0, "moderator": 0, "editor": 1, "admin": 2}

# What a person may do. Admins can grant these per person on top of the role. Everything that touches the
# system itself (general settings, LDAP, roles and permissions, LDAP sync) is NOT a permission: admins only.
PERMISSIONS = ("content_own", "content_all", "trainings", "moderate", "quicklinks", "polls", "locations", "people")
ROLE_PERMS = {
    "user": set(),
    "author": {"content_own"},
    "hr": {"content_own", "trainings", "people"},  # personnel: staff cards, trainings, own posts
    "moderator": {"content_own", "trainings", "moderate", "quicklinks", "polls"},
    "editor": {"content_own", "content_all", "trainings", "moderate", "quicklinks", "polls"},
    "admin": set(PERMISSIONS),
}


def extra_permissions(user: User | None) -> list[str]:
    try:
        return [p for p in json.loads(user.permissions or "[]") if p in PERMISSIONS] if user else []
    except (ValueError, TypeError):
        return []


def permissions_of(user: User | None) -> set[str]:
    if not user:
        return set()
    if user.role == "admin":
        return set(PERMISSIONS)
    return ROLE_PERMS.get(user.role, set()) | set(extra_permissions(user))


def has_perm(user: User | None, *perms: str) -> bool:
    """True when the user has at least one of ``perms``."""
    mine = permissions_of(user)
    return any(p in mine for p in perms)


def hash_password(password: str) -> str:
    data = password.encode()
    if len(data) > 72:  # bcrypt limit (bytes, so umlauts count double)
        raise HTTPException(422, "Password is too long (max. 72 bytes)")
    return bcrypt.hashpw(data, bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str | None) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def create_token(user: User) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.token_minutes)
    return jwt.encode({"sub": str(user.id), "role": user.role, "exp": exp}, settings.secret_key, algorithm="HS256")


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer), db: Session = Depends(get_db)
) -> User:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated",
                                 headers={"WWW-Authenticate": "Bearer"})
    if creds is None:
        raise unauthorized
    try:
        payload = jwt.decode(creds.credentials, settings.secret_key, algorithms=["HS256"])
        user = db.get(User, int(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized
    if not user or not user.is_active:
        raise unauthorized
    return user


def optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer), db: Session = Depends(get_db)
) -> User | None:
    """The signed-in user, or None for an anonymous visitor (an invalid token counts as anonymous)."""
    if creds is None:
        return None
    try:
        return current_user(creds, db)
    except HTTPException:
        return None


def reader(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer), db: Session = Depends(get_db)
) -> User | None:
    """Dependency for read-only endpoints: anonymous allowed when ``public_read`` is on."""
    if settings.public_read:
        return optional_user(creds, db)
    return current_user(creds, db)


def rank(user: User | None) -> int:
    return ROLE_RANK.get(user.role, -1) if user else -1


def require(role: str):
    """Dependency: the current user must have at least ``role`` (user < editor < admin)."""

    def checker(user: User = Depends(current_user)) -> User:
        if ROLE_RANK.get(user.role, -1) < ROLE_RANK[role]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient role")
        return user

    return checker


def require_perm(*perms: str):
    """Dependency: the current user must have one of ``perms`` (admins always pass)."""

    def checker(user: User = Depends(current_user)) -> User:
        if not has_perm(user, *perms):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return user

    return checker
