from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import ldap_auth
from app.db import get_db
from app.models import Seat, User
from app.schemas import UserCreate, UserOut, UserUpdate
from app.security import hash_password, reader, require
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
    if not (include_hidden and viewer and viewer.role == "admin"):
        query = query.filter(User.is_active.is_(True), User.show_in_directory.is_(True))
    if q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(or_(User.first_name.ilike(like), User.last_name.ilike(like),
                                 User.department.ilike(like), User.position.ilike(like),
                                 User.email.ilike(like), User.phone_ext.ilike(like)))
    if department:
        query = query.filter(User.department == department)
    return [user_out(u) for u in query.order_by(User.last_name, User.first_name).all()]


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, viewer: User | None = Depends(reader), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    hidden = user and not (user.is_active and user.show_in_directory)
    if not user or (hidden and (not viewer or viewer.role != "admin")):
        raise HTTPException(404, "User not found")
    return user_out(user)


@router.post("", response_model=UserOut, status_code=201)
def create_user(body: UserCreate, _: User = Depends(require("admin")), db: Session = Depends(get_db)):
    username = body.username.lower()
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(409, "Username already exists")
    _check_department(db, body.department)
    data = body.model_dump(exclude={"password", "username"})
    user = User(username=username, password_hash=hash_password(body.password), auth_source="local", **data)
    db.add(user)
    db.commit()
    return user_out(user)


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, body: UserUpdate, admin: User = Depends(require("admin")),
                db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    data = body.model_dump(exclude_unset=True)
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
    return user_out(user)


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, admin: User = Depends(require("admin")), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == admin.id:
        raise HTTPException(400, "You cannot delete your own account")
    db.delete(user)
    db.commit()


@router.post("/{user_id}/avatar", response_model=UserOut)
async def upload_avatar(user_id: int, file: UploadFile = File(...), _: User = Depends(require("admin")),
                        db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    user.avatar_url = await save_image(file, "avatar")
    db.commit()
    return user_out(user)


@router.post("/ldap-sync")
def ldap_sync(_: User = Depends(require("admin")), db: Session = Depends(get_db)):
    try:
        return {"synced": ldap_auth.sync_all(db)}
    except ldap_auth.LdapError as exc:
        raise HTTPException(503, str(exc))
