"""Short surveys. A poll is for everybody or only for some departments and/or branches: then only those people
(and the people who manage polls) see it and may vote; visitors who are not signed in see only polls for everybody.
Signed-in people vote once (and may change their answer while the poll is open). Only totals are ever returned."""
import json
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Branch, Poll, PollVote, User
from app.security import current_user, has_perm, reader, require_perm

router = APIRouter(prefix="/api/polls", tags=["polls"])


class OptionIn(BaseModel):
    de: str = Field(min_length=1, max_length=120)
    en: str = Field(default="", max_length=120)


class PollIn(BaseModel):
    question_de: str = Field(min_length=3, max_length=200)
    question_en: str = Field(default="", max_length=200)
    description_de: str = Field(default="", max_length=2000)
    description_en: str = Field(default="", max_length=2000)
    options: list[OptionIn] = Field(min_length=2, max_length=12)
    multiple: bool = False
    results: Literal["always", "after_vote", "after_close"] = "after_vote"
    closes_at: datetime | None = None
    closed: bool = False
    target_departments: list[str] = Field(default=[], max_length=50)
    target_branches: list[int] = Field(default=[], max_length=50)

    @field_validator("options")
    @classmethod
    def distinct(cls, v: list[OptionIn]):
        names = [o.de.strip().lower() for o in v]
        if len(set(names)) != len(names):
            raise ValueError("Antworten müssen sich unterscheiden")
        return v


class VoteIn(BaseModel):
    choices: list[int] = Field(min_length=1, max_length=12)


def _choices(raw: str) -> list[int]:
    try:
        return [int(x) for x in json.loads(raw or "[]")]
    except (ValueError, TypeError):
        return []


def _targets(p: Poll) -> tuple[list[str], list[int]]:
    try:
        deps = [str(x) for x in json.loads(p.target_departments or "[]")]
        brs = [int(x) for x in json.loads(p.target_branches or "[]")]
    except (ValueError, TypeError):
        deps, brs = [], []
    return deps, brs


def may_see(p: Poll, viewer: User | None) -> bool:
    """Polls for everybody: all readers. Targeted polls: people of those departments/branches, and poll managers."""
    deps, brs = _targets(p)
    if not deps and not brs:
        return True
    if viewer is None:
        return False
    if has_perm(viewer, "polls"):
        return True
    return (viewer.department or "") in deps or (viewer.branch_id is not None and viewer.branch_id in brs)


def poll_out(db: Session, p: Poll, viewer: User | None) -> dict:
    options = json.loads(p.options or "[]")
    votes = db.query(PollVote).filter(PollVote.poll_id == p.id).all()
    mine = next((_choices(v.choices) for v in votes if viewer and v.user_id == viewer.id), None)
    is_open = p.is_open()
    if has_perm(viewer, "polls") or not is_open or p.results == "always":
        visible = True
    else:  # open poll: "after_vote" shows totals once I voted, "after_close" only when it is over
        visible = p.results == "after_vote" and mine is not None
    counts = [0] * len(options)
    for v in votes:
        for i in _choices(v.choices):
            if 0 <= i < len(counts):
                counts[i] += 1
    deps, brs = _targets(p)
    branch_names = {b.id: b.name for b in db.query(Branch).filter(Branch.id.in_(brs))} if brs else {}
    return {
        "id": p.id, "question_de": p.question_de, "question_en": p.question_en,
        "target_departments": deps, "target_branches": brs,
        "target_names": deps + [branch_names[b] for b in brs if b in branch_names],
        "description_de": p.description_de, "description_en": p.description_en,
        "options": options, "multiple": p.multiple, "results": p.results, "closes_at": p.closes_at,
        "closed": p.closed, "open": is_open, "created_at": p.created_at,
        "voters": len(votes), "counts": counts if visible else None, "my_choices": mine,
    }


def _get(db: Session, poll_id: int) -> Poll:
    p = db.get(Poll, poll_id)
    if not p:
        raise HTTPException(404, "Poll not found")
    return p


@router.get("")
def list_polls(state: Literal["all", "open", "closed"] = "all", limit: int = Query(50, ge=1, le=200),
               viewer: User | None = Depends(reader), db: Session = Depends(get_db)):
    out = [poll_out(db, p, viewer) for p in db.query(Poll).order_by(Poll.created_at.desc()).all() if may_see(p, viewer)]
    if state != "all":
        out = [x for x in out if x["open"] == (state == "open")]
    out.sort(key=lambda x: (not x["open"], -x["id"]))  # open polls first, newest first
    return out[:limit]


@router.get("/{poll_id}")
def get_poll(poll_id: int, viewer: User | None = Depends(reader), db: Session = Depends(get_db)):
    p = _get(db, poll_id)
    if not may_see(p, viewer):
        raise HTTPException(404, "Poll not found")
    return poll_out(db, p, viewer)


@router.post("/{poll_id}/vote")
def vote(poll_id: int, body: VoteIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = _get(db, poll_id)
    if not may_see(p, user):
        raise HTTPException(404, "Poll not found")
    if not p.is_open():
        raise HTTPException(409, "Die Umfrage ist beendet.")
    n = len(json.loads(p.options or "[]"))
    picks = sorted(set(body.choices))
    if any(i < 0 or i >= n for i in picks) or (not p.multiple and len(picks) != 1):
        raise HTTPException(422, "Ungültige Auswahl")
    row = db.get(PollVote, (p.id, user.id))
    if row:
        row.choices, row.created_at = json.dumps(picks), datetime.now()
    else:
        db.add(PollVote(poll_id=p.id, user_id=user.id, choices=json.dumps(picks)))
    db.commit()
    return poll_out(db, p, user)


@router.delete("/{poll_id}/vote")
def withdraw(poll_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = _get(db, poll_id)
    if not p.is_open():
        raise HTTPException(409, "Die Umfrage ist beendet.")
    row = db.get(PollVote, (p.id, user.id))
    if row:
        db.delete(row)
        db.commit()
    return poll_out(db, p, user)


def _apply(p: Poll, body: PollIn, has_votes: bool) -> None:
    new_options = [{"de": o.de.strip(), "en": o.en.strip()} for o in body.options]
    if has_votes and len(new_options) != len(json.loads(p.options or "[]")):
        # the indexes stored in the votes would point to other answers
        raise HTTPException(409, "Es gibt schon Stimmen – Antworten können umbenannt, aber nicht hinzugefügt oder entfernt werden.")
    for k, v in body.model_dump(exclude={"options", "target_departments", "target_branches"}).items():
        setattr(p, k, v.strip() if isinstance(v, str) else v)
    p.options = json.dumps(new_options, ensure_ascii=False)
    p.target_departments = json.dumps(sorted({d.strip() for d in body.target_departments if d.strip()}), ensure_ascii=False)
    p.target_branches = json.dumps(sorted(set(body.target_branches)))


@router.post("", status_code=201)
def create_poll(body: PollIn, user: User = Depends(require_perm("polls")), db: Session = Depends(get_db)):
    p = Poll(created_by=user.id)
    _apply(p, body, False)
    db.add(p)
    db.commit()
    return poll_out(db, p, user)


@router.put("/{poll_id}")
def update_poll(poll_id: int, body: PollIn, user: User = Depends(require_perm("polls")), db: Session = Depends(get_db)):
    p = _get(db, poll_id)
    _apply(p, body, db.query(PollVote).filter(PollVote.poll_id == p.id).count() > 0)
    db.commit()
    return poll_out(db, p, user)


@router.delete("/{poll_id}", status_code=204)
def delete_poll(poll_id: int, _: User = Depends(require_perm("polls")), db: Session = Depends(get_db)):
    db.delete(_get(db, poll_id))
    db.commit()
