"""Niederlassungen (sites/branches). Everybody may read the list; people managers maintain it."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Branch, User
from app.security import reader, require_perm

router = APIRouter(prefix="/api/branches", tags=["branches"])


class BranchIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    sort: int = 0


def _out(db: Session, b: Branch) -> dict:
    people = db.query(func.count(User.id)).filter(User.branch_id == b.id, User.is_active.is_(True)).scalar() or 0
    return {"id": b.id, "name": b.name, "sort": b.sort, "source": b.source, "people": people}


@router.get("")
def list_branches(_: User | None = Depends(reader), db: Session = Depends(get_db)):
    return [_out(db, b) for b in db.query(Branch).order_by(Branch.sort, Branch.name).all()]


def _check_name(db: Session, name: str, own_id: int | None = None) -> str:
    name = name.strip()
    clash = db.query(Branch).filter(func.lower(Branch.name) == name.lower(), Branch.id != (own_id or 0)).first()
    if clash:
        raise HTTPException(409, "Diese Niederlassung gibt es schon.")
    return name


@router.post("", status_code=201)
def create_branch(body: BranchIn, _: User = Depends(require_perm("people")), db: Session = Depends(get_db)):
    b = Branch(name=_check_name(db, body.name), sort=body.sort)
    db.add(b)
    db.commit()
    return _out(db, b)


@router.put("/{branch_id}")
def update_branch(branch_id: int, body: BranchIn, _: User = Depends(require_perm("people")), db: Session = Depends(get_db)):
    b = db.get(Branch, branch_id)
    if not b:
        raise HTTPException(404, "Branch not found")
    b.name, b.sort = _check_name(db, body.name, b.id), body.sort
    db.commit()
    return _out(db, b)


@router.delete("/{branch_id}", status_code=204)
def delete_branch(branch_id: int, _: User = Depends(require_perm("people")), db: Session = Depends(get_db)):
    """People keep working without a branch (they then see everything); articles limited to it lose the limit."""
    b = db.get(Branch, branch_id)
    if not b:
        raise HTTPException(404, "Branch not found")
    db.query(User).filter(User.branch_id == b.id).update({User.branch_id: None})
    db.delete(b)
    db.commit()


def ensure_branch(db: Session, name: str) -> Branch:
    """For LDAP: find the branch by name (any case) or create it."""
    b = db.query(Branch).filter(func.lower(Branch.name) == name.strip().lower()).first()
    if b is None:
        b = Branch(name=name.strip(), source="ldap", sort=100)
        db.add(b)
        db.flush()
    return b
