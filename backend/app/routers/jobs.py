"""Stellenangebote: internal job postings (interne Ausschreibungen).

Switched on by an admin (setting ``jobs_enabled``). People with the ``jobs`` permission (HR, admins) create, edit,
close and delete postings; everybody who may read the portal sees the open ones on /jobs and on the home page.
Applying happens outside Lotse: a posting names a contact person (mail and phone come from the directory)."""
import datetime as dt
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.db import get_db
from app.models import Branch, JobPosting, User
from app.security import has_perm, reader, require_perm

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


class JobIn(BaseModel):
    title_de: str = Field(min_length=3, max_length=160)
    title_en: str = Field(default="", max_length=160)
    department: str = Field(default="", max_length=80)
    branch_id: int | None = None
    employment: Literal["full", "part", "mini", "apprentice", "intern", "other"] = "full"
    hours: str = Field(default="", max_length=60)
    start: str = Field(default="", max_length=60)
    description_de: str = Field(default="", max_length=60000)
    description_en: str = Field(default="", max_length=60000)
    contact_id: int | None = None
    apply_until: dt.date | None = None
    active: bool = True


def job_out(j: JobPosting, full: bool = True) -> dict:
    c = j.contact if (j.contact and j.contact.is_active) else None
    contact = {"id": c.id, "full_name": c.full_name, "department": c.department, "position": c.position,
               "email": c.email, "phone_ext": c.phone_ext, "avatar_url": c.avatar_url} if c else None
    out = {"id": j.id, "title_de": j.title_de, "title_en": j.title_en, "department": j.department,
           "branch_id": j.branch_id, "branch": j.branch.name if j.branch else None, "employment": j.employment,
           "hours": j.hours, "start": j.start, "contact_id": j.contact_id, "contact": contact,
           "apply_until": j.apply_until, "active": j.active, "open": j.is_open(), "created_at": j.created_at,
           "updated_at": j.updated_at}
    if full:
        out["description_de"] = j.description_de
        out["description_en"] = j.description_en
    return out


def _with_relations(db: Session):
    return db.query(JobPosting).options(joinedload(JobPosting.contact), joinedload(JobPosting.branch))


def _open_query(db: Session):
    today = dt.date.today()
    return _with_relations(db).filter(JobPosting.active.is_(True),
                                      or_(JobPosting.apply_until.is_(None), JobPosting.apply_until >= today))


def open_jobs(db: Session, limit: int = 4) -> list[dict]:
    """Newest open postings for the home page block; empty when the feature is switched off."""
    if not settings.jobs_enabled:
        return []
    rows = _open_query(db).order_by(JobPosting.created_at.desc(), JobPosting.id.desc()).limit(limit).all()
    return [job_out(j, full=False) for j in rows]


def _enabled() -> None:
    if not settings.jobs_enabled:
        raise HTTPException(404, "Job postings are switched off")


def _get(db: Session, job_id: int) -> JobPosting:
    j = db.get(JobPosting, job_id)
    if not j:
        raise HTTPException(404, "Posting not found")
    return j


def _apply(db: Session, j: JobPosting, body: JobIn) -> None:
    if body.branch_id is not None and db.get(Branch, body.branch_id) is None:
        raise HTTPException(404, "Branch not found")
    if body.contact_id is not None and db.get(User, body.contact_id) is None:
        raise HTTPException(404, "Contact person not found")
    for key, value in body.model_dump().items():
        setattr(j, key, value.strip() if isinstance(value, str) else value)


@router.get("")
def list_jobs(all: bool = False, viewer: User | None = Depends(reader), db: Session = Depends(get_db)):
    """Open postings for everybody; ``all=1`` adds drafts, filled and expired ones for the people who manage them."""
    _enabled()
    q = _with_relations(db) if (all and has_perm(viewer, "jobs")) else _open_query(db)
    rows = q.order_by(JobPosting.created_at.desc(), JobPosting.id.desc()).limit(500).all()
    return [job_out(j) for j in rows]


@router.get("/{job_id}")
def get_job(job_id: int, viewer: User | None = Depends(reader), db: Session = Depends(get_db)):
    _enabled()
    j = _get(db, job_id)
    if not j.is_open() and not has_perm(viewer, "jobs"):
        raise HTTPException(404, "Posting not found")
    return job_out(j)


@router.post("", status_code=201)
def create_job(body: JobIn, actor: User = Depends(require_perm("jobs")), db: Session = Depends(get_db)):
    _enabled()
    j = JobPosting(created_by=actor.id)
    _apply(db, j, body)
    db.add(j)
    db.commit()
    db.refresh(j)
    return job_out(j)


@router.put("/{job_id}")
def update_job(job_id: int, body: JobIn, _: User = Depends(require_perm("jobs")), db: Session = Depends(get_db)):
    _enabled()
    j = _get(db, job_id)
    _apply(db, j, body)
    db.commit()
    db.refresh(j)
    return job_out(j)


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: int, _: User = Depends(require_perm("jobs")), db: Session = Depends(get_db)):
    _enabled()
    db.delete(_get(db, job_id))
    db.commit()
