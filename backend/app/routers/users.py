from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import ldap_auth
from app.config import settings
from app.db import get_db
from app.models import Seat, User
from app.schemas import UserCreate, UserOut, UserUpdate
import json

from app.security import has_perm, hash_password, reader, require, require_perm
from app.routers.departments import department_names
from app.serialize import user_out
from app.uploads import save_image

router = APIRouter(prefix="/api/users", tags=["users"])


def _check_department(db: Session, name: str | None) -> None:
    names = department_names(db)
    if name and names and name not in names:
        raise HTTPException(422, f"Unknown department. Choose one of: {', '.join(names)}")


@router.get("", response_model=list[UserOut])
def directory(
    q: str = "",
    department: str = "",
    include_hidden: bool = Query(False, description="Admins only: inactive and hidden accounts"),
    viewer: User | None = Depends(reader),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if not (include_hidden and has_perm(viewer, "people")):
        query = query.filter(User.is_active.is_(True), User.show_in_directory.is_(True))
    if q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(or_(User.first_name.ilike(like), User.last_name.ilike(like),
                                 User.department.ilike(like), User.position.ilike(like),
                                 User.email.ilike(like), User.phone_ext.ilike(like)))
    if department:
        query = query.filter(User.department == department)
    full = has_perm(viewer, "people")
    return [user_out(u, full=full) for u in query.order_by(User.last_name, User.first_name).all()]


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, viewer: User | None = Depends(reader), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    hidden = user and not (user.is_active and user.show_in_directory)
    if not user or (hidden and not has_perm(viewer, "people")):
        raise HTTPException(404, "User not found")
    return user_out(user, full=has_perm(viewer, "people") or (viewer is not None and viewer.id == user.id))


def _check_email(db: Session, email: str | None, user_id: int | None = None) -> str | None:
    """E-mail addresses identify a person (also for LDAP matching) - each may exist only once."""
    if not email:
        return None
    email = email.strip().lower()
    q = db.query(User).filter(User.email.isnot(None), User.email.ilike(email))
    if user_id:
        q = q.filter(User.id != user_id)
    if q.first():
        raise HTTPException(409, "This e-mail address is already used by another account")
    return email


LDAP_FIELDS = {"first_name", "last_name", "email", "department", "position", "phone_ext", "manager_id"}


def check_manager(db: Session, user: User, manager_id: int | None) -> int | None:
    """A manager must exist and must not report (directly or indirectly) to the person - no loops."""
    if manager_id is None:
        return None
    if manager_id == user.id:
        raise HTTPException(400, "Eine Person kann nicht sich selbst vorgesetzt sein.")
    seen, current = set(), db.get(User, manager_id)
    if current is None:
        raise HTTPException(404, "Vorgesetzte Person nicht gefunden")
    while current is not None and current.id not in seen:
        if current.id == user.id:
            raise HTTPException(400, "Das ergäbe einen Kreis im Organigramm.")
        seen.add(current.id)
        current = db.get(User, current.manager_id) if current.manager_id else None
    return manager_id


def _special(user: User) -> bool:
    """Accounts with a role above 'user' or extra permissions - only admins may change those."""
    return user.role != "user" or bool(json.loads(user.permissions or "[]"))


@router.post("", response_model=UserOut, status_code=201)
def create_user(body: UserCreate, actor: User = Depends(require_perm("people")), db: Session = Depends(get_db)):
    if actor.role != "admin" and (body.role != "user" or body.permissions):
        raise HTTPException(403, "Only administrators can grant roles and permissions")
    username = body.username.lower()
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(409, "Username already exists")
    _check_department(db, body.department)
    data = body.model_dump(exclude={"password", "username", "permissions"})
    data["email"] = _check_email(db, body.email)
    user = User(username=username, password_hash=hash_password(body.password), auth_source="local",
                permissions=json.dumps(sorted(set(body.permissions))), **data)
    db.add(user)
    db.commit()
    return user_out(user, full=True)


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, body: UserUpdate, admin: User = Depends(require_perm("people")),
                db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    data = body.model_dump(exclude_unset=True)
    if admin.role != "admin":
        # People managers edit ordinary staff only and never touch roles or permissions.
        if _special(user):
            raise HTTPException(403, "Only administrators can edit accounts with special rights")
        if data.get("role", "user") != "user" or data.get("permissions"):
            raise HTTPException(403, "Only administrators can grant roles and permissions")
        data.pop("role", None)
        data.pop("permissions", None)
    if user.auth_source == "ldap" and settings.ldap_enabled:
        for f in LDAP_FIELDS & set(data):  # the directory is leading for these fields
            data.pop(f)
    if "email" in data:
        data["email"] = _check_email(db, data["email"], user.id)
    if "permissions" in data:
        perms = data.pop("permissions")
        user.permissions = json.dumps(sorted(set(perms or [])))
    if "role" in data and data["role"] != user.role:
        user.role_source = "local"  # set by an admin: LDAP group sync will not take it away
        user.role_local = None
    if "department" in data:
        _check_department(db, data["department"])
    if user.id == admin.id and (data.get("role", "admin") != "admin" or data.get("is_active") is False):
        raise HTTPException(400, "You cannot remove your own admin access")
    if "password" in data:
        password = data.pop("password")
        if password:
            if user.auth_source != "local":
                raise HTTPException(400, "Directory accounts have no local password")
            user.password_hash = hash_password(password)
    if "manager_id" in data:
        user.manager_id = check_manager(db, user, data.pop("manager_id") or None)
    if "seat_id" in data:
        seat_id = data.pop("seat_id")
        if seat_id:
            seat = db.get(Seat, seat_id)
            if not seat:
                raise HTTPException(404, "Seat not found")
            if seat.occupant and seat.occupant.id != user.id:
                seat.occupant.seat_id = None  # move the previous occupant off the desk
                db.flush()
            user.seat_id = seat_id
        else:
            user.seat_id = None
    for key, value in data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user_out(user, full=True)


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, admin: User = Depends(require_perm("people")), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if admin.role != "admin" and _special(user):
        raise HTTPException(403, "Only administrators can delete accounts with special rights")
    if user.id == admin.id:
        raise HTTPException(400, "You cannot delete your own account")
    db.delete(user)
    db.commit()


@router.post("/{user_id}/avatar", response_model=UserOut)
async def upload_avatar(user_id: int, file: UploadFile = File(...), _: User = Depends(require_perm("people")),
                        db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    user.avatar_url = await save_image(file, "avatar")
    db.commit()
    return user_out(user, full=True)


class SyncChoices(BaseModel):
    add: list[str] = []  # directory user names to create
    link: list[int] = []  # local accounts to link with their directory person (matched by user name or e-mail)
    update: bool = True  # refresh names, departments, positions of existing LDAP accounts
    deactivate: list[int] = []  # LDAP accounts no longer in the directory
    remove_departments: list[int] = []  # departments that do not exist in the directory


@router.post("/ldap-sync/preview")
def ldap_sync_preview(_: User = Depends(require("admin")), db: Session = Depends(get_db)):
    """What a sync would change. Nothing is written; the admin chooses in the dialog."""
    try:
        return ldap_auth.plan(db, ldap_auth.fetch_directory())
    except ldap_auth.LdapError as exc:
        raise HTTPException(503, str(exc))


@router.post("/ldap-sync/apply")
def ldap_sync_apply(body: SyncChoices, _: User = Depends(require("admin")), db: Session = Depends(get_db)):
    try:
        return ldap_auth.apply_plan(db, ldap_auth.fetch_directory(), body.model_dump())
    except ldap_auth.LdapError as exc:
        raise HTTPException(503, str(exc))
