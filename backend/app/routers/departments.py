from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import DEFAULT_DEPARTMENTS, Department, Room, TrainingTarget, User
from app.security import reader, require_perm

router = APIRouter(prefix="/api/departments", tags=["departments"])


class DepartmentIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: str = Field(default="#64748b", pattern=r"^#[0-9A-Fa-f]{6}$")
    sort: int = 0


class DepartmentOut(DepartmentIn):
    id: int
    count: int = 0
    source: str = "manual"


# Older department names -> the official list (one-time migration of existing accounts).
LEGACY = {
    "Logistik": "Versand", "Lager": "Versand", "Buchhaltung": "Finanzen", "Finanzbuchhaltung": "Finanzen",
    "Controlling": "Finanzen", "Personal": "Verwaltung", "HR": "Verwaltung", "Geschäftsführung": "Verwaltung",
    "Marketing": "Vertrieb", "Verkauf": "Vertrieb", "Produktmanagement": "Einkauf", "Beschaffung": "Einkauf",
    "Qualität": "Fulfillment", "EDV": "IT",
}


def ensure_defaults(db: Session) -> None:
    """Create the standard departments the first time the app runs and map old names onto them."""
    if db.query(Department).count() == 0:
        for i, (name, color) in enumerate(DEFAULT_DEPARTMENTS):
            db.add(Department(name=name, color=color, sort=i))
        db.flush()
    names = set(department_names(db))
    for old, new in LEGACY.items():
        if old not in names and new in names:
            db.query(User).filter(User.department == old).update({User.department: new})
    db.commit()


PALETTE = ["#d97706", "#64748b", "#0891b2", "#3557f5", "#e0484d", "#13995b", "#8b5cf6", "#db2777", "#65a30d", "#0d9488"]


def ensure_department(db: Session, name: str, source: str = "ldap") -> Department | None:
    """Return the department called ``name`` (case-insensitive), creating it if needed."""
    name = (name or "").strip()
    if not name:
        return None
    dept = db.query(Department).filter(func.lower(Department.name) == name.lower()).first()
    if dept is None:
        count = db.query(Department).count()
        last = db.query(func.max(Department.sort)).scalar()
        dept = Department(name=name, color=PALETTE[count % len(PALETTE)], sort=(last or 0) + 1, source=source)
        db.add(dept)
        db.flush()
    return dept


def department_names(db: Session) -> list[str]:
    return [d.name for d in db.query(Department).order_by(Department.sort, Department.name)]


def _out(db: Session, dept: Department, counts: dict[str, int] | None = None) -> dict:
    if counts is None:
        counts = {dept.name: db.query(User).filter(User.department == dept.name, User.is_active.is_(True)).count()}
    return {"id": dept.id, "name": dept.name, "color": dept.color, "sort": dept.sort, "source": dept.source,
            "count": counts.get(dept.name, 0)}


@router.get("", response_model=list[DepartmentOut])
def list_departments(_: User | None = Depends(reader), db: Session = Depends(get_db)):
    counts = dict(db.query(User.department, func.count()).filter(User.is_active.is_(True),
                                                               User.show_in_directory.is_(True))
                  .group_by(User.department).all())
    return [_out(db, d, counts) for d in db.query(Department).order_by(Department.sort, Department.name)]


@router.post("", response_model=DepartmentOut, status_code=201)
def create_department(body: DepartmentIn, _: User = Depends(require_perm("people")), db: Session = Depends(get_db)):
    name = body.name.strip()
    if db.query(Department).filter(func.lower(Department.name) == name.lower()).first():
        raise HTTPException(409, "Department already exists")
    dept = Department(name=name, color=body.color, sort=body.sort)
    db.add(dept)
    db.commit()
    return _out(db, dept)


@router.put("/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: int, body: DepartmentIn, _: User = Depends(require_perm("people")),
                      db: Session = Depends(get_db)):
    dept = db.get(Department, dept_id)
    if not dept:
        raise HTTPException(404, "Department not found")
    name = body.name.strip()
    clash = db.query(Department).filter(func.lower(Department.name) == name.lower(), Department.id != dept_id).first()
    if clash:
        raise HTTPException(409, "Department already exists")
    if name != dept.name and dept.source == "ldap" and settings.ldap_enabled and settings.ldap_departments_auto:
        raise HTTPException(409, "This department comes from LDAP - rename it in the directory")
    if name != dept.name:  # rename: move everyone along - people, rooms on the plan and training assignments
        db.query(User).filter(User.department == dept.name).update({User.department: name})
        db.query(Room).filter(Room.department == dept.name).update({Room.department: name})
        db.query(TrainingTarget).filter(TrainingTarget.kind == "department", TrainingTarget.value == dept.name) \
            .update({TrainingTarget.value: name})
    dept.name, dept.color, dept.sort = name, body.color, body.sort
    db.commit()
    return _out(db, dept)


@router.delete("/{dept_id}", status_code=204)
def delete_department(dept_id: int, _: User = Depends(require_perm("people")), db: Session = Depends(get_db)):
    dept = db.get(Department, dept_id)
    if not dept:
        raise HTTPException(404, "Department not found")
    if db.query(User).filter(User.department == dept.name).count():
        raise HTTPException(409, "Move the people in this department to another one first")
    db.delete(dept)
    db.commit()
