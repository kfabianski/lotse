"""Jubiläen: anniversaries entered by HR or admins (years of service, a round birthday, retirement, ...).

Nothing is computed from personal data: a person with the ``jubilees`` permission enters each entry by hand.
Everybody who may read the portal sees the entries of the coming weeks on the home page."""
import datetime as dt
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models import Jubilee, User
from app.security import has_perm, reader, require_perm

router = APIRouter(prefix="/api/jubilees", tags=["jubilees"])
PAST_DAYS, AHEAD_DAYS = 7, 45  # window shown on the home page


class JubileeIn(BaseModel):
    user_id: int | None = None  # linked account (optional)
    name: str = Field(default="", max_length=160)  # shown when no account is linked
    kind: Literal["service", "birthday", "retirement", "other"] = "service"
    years: int | None = Field(default=None, ge=1, le=99)
    date: dt.date
    text_de: str = Field(default="", max_length=300)
    text_en: str = Field(default="", max_length=300)


def jubilee_out(j: Jubilee) -> dict:
    u = j.user if (j.user and j.user.is_active) else None
    person = {"id": u.id, "full_name": u.full_name, "department": u.department, "position": u.position,
              "avatar_url": u.avatar_url} if u else None
    return {"id": j.id, "user_id": j.user_id, "person": person, "name": (u.full_name if u else "") or j.name,
            "kind": j.kind, "years": j.years, "date": j.on_date, "text_de": j.text_de, "text_en": j.text_en,
            "created_at": j.created_at}


def upcoming(db: Session, limit: int = 8) -> list[dict]:
    """Entries from the last few days up to a few weeks ahead - the home page block."""
    today = dt.date.today()
    rows = (db.query(Jubilee).options(joinedload(Jubilee.user))
            .filter(Jubilee.on_date >= today - dt.timedelta(days=PAST_DAYS),
                    Jubilee.on_date <= today + dt.timedelta(days=AHEAD_DAYS))
            .order_by(Jubilee.on_date, Jubilee.id).limit(limit).all())
    return [jubilee_out(j) for j in rows]


def _get(db: Session, jubilee_id: int) -> Jubilee:
    j = db.get(Jubilee, jubilee_id)
    if not j:
        raise HTTPException(404, "Entry not found")
    return j


def _apply(db: Session, j: Jubilee, body: JubileeIn) -> None:
    if body.user_id:
        if db.get(User, body.user_id) is None:
            raise HTTPException(404, "Person not found")
    elif not body.name.strip():
        raise HTTPException(422, "Choose a person or enter a name")
    j.user_id = body.user_id or None
    j.name = body.name.strip()
    j.kind = body.kind
    j.years = body.years
    j.on_date = body.date
    j.text_de = body.text_de.strip()
    j.text_en = body.text_en.strip()


@router.get("")
def list_jubilees(all: bool = False, viewer: User | None = Depends(reader), db: Session = Depends(get_db)):
    """Home window for everybody; ``all=1`` gives the complete list to the people who manage it."""
    if all and has_perm(viewer, "jubilees"):
        rows = db.query(Jubilee).options(joinedload(Jubilee.user)).order_by(Jubilee.on_date.desc(), Jubilee.id.desc()).limit(500).all()
        return [jubilee_out(j) for j in rows]
    return upcoming(db, limit=50)


@router.post("", status_code=201)
def create_jubilee(body: JubileeIn, actor: User = Depends(require_perm("jubilees")), db: Session = Depends(get_db)):
    j = Jubilee(created_by=actor.id)
    _apply(db, j, body)
    db.add(j)
    db.commit()
    db.refresh(j)
    return jubilee_out(j)


@router.put("/{jubilee_id}")
def update_jubilee(jubilee_id: int, body: JubileeIn, _: User = Depends(require_perm("jubilees")), db: Session = Depends(get_db)):
    j = _get(db, jubilee_id)
    _apply(db, j, body)
    db.commit()
    db.refresh(j)
    return jubilee_out(j)


@router.delete("/{jubilee_id}", status_code=204)
def delete_jubilee(jubilee_id: int, _: User = Depends(require_perm("jubilees")), db: Session = Depends(get_db)):
    db.delete(_get(db, jubilee_id))
    db.commit()
