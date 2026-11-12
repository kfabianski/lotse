"""Trainings (Schulungen) and mandatory reading.

Admins create a training (description + PDFs, videos, images, links), assign it to everyone, departments,
groups (e.g. "Geschäftsführung") or single people, and see who has confirmed it. Staff only ever see the
trainings assigned to them. Files live outside the public uploads folder and are served via short-lived
signed links, so a copied link stops working after a while.
"""

import csv
import hashlib
import hmac
import io
import time
import uuid
from datetime import date, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.db import get_db
from app.models import (Branch, Training, TrainingCompletion, TrainingGroup, TrainingGroupMember, TrainingMaterial,
                        TrainingTarget, User)
from app.routers.quicklinks import URL_PATTERN
from app.security import current_user, has_perm, require_perm

router = APIRouter(prefix="/api/trainings", tags=["trainings"])
files_router = APIRouter(tags=["trainings"])

LINK_SECONDS = 2 * 60 * 60  # signed file links are valid for two hours
CHUNK = 1024 * 1024


# --- schemas ------------------------------------------------------------------------------


class TargetIn(BaseModel):
    kind: Literal["all", "newcomers", "department", "group", "position", "branch", "user"]
    value: str = Field(default="", max_length=80)


class TrainingIn(BaseModel):
    title_de: str = Field(min_length=1, max_length=200)
    title_en: str = Field(default="", max_length=200)
    description_de: str = Field(default="", max_length=20000)
    description_en: str = Field(default="", max_length=20000)
    due_date: date | None = None
    active: bool = True
    open_to_all: bool = False  # voluntary for everybody (in addition to the mandatory targets)
    targets: list[TargetIn] = []


class LinkIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    url: str = Field(max_length=500, pattern=URL_PATTERN)


class GroupIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    member_ids: list[int] = []


# --- helpers ------------------------------------------------------------------------------


def _staff_query(db: Session):
    return db.query(User).filter(User.is_active.is_(True), User.show_in_directory.is_(True))


NEWCOMER_DAYS = 90  # onboarding trainings reach people this long after their first day


def assignment_map(db: Session, trainings: list[Training]) -> dict[int, set[int]]:
    """Who each training is assigned to (union of its targets, active accounts only). The staff list and the group
    members are read once for all trainings - not once per training and target."""
    staff = db.query(User.id, User.department, User.branch_id, User.position, User.start_date).filter(
        User.is_active.is_(True), User.show_in_directory.is_(True)).all()
    active = {u for (u,) in db.query(User.id).filter(User.is_active.is_(True))}
    members: dict[int, set[int]] = {}
    for group_id, user_id in db.query(TrainingGroupMember.group_id, TrainingGroupMember.user_id):
        members.setdefault(group_id, set()).add(user_id)
    since = date.today() - timedelta(days=NEWCOMER_DAYS)
    out: dict[int, set[int]] = {}
    for t in trainings:
        ids: set[int] = set()
        for x in t.targets:
            if x.kind == "all":
                ids |= {u.id for u in staff}
            elif x.kind == "newcomers":  # people in their first NEWCOMER_DAYS days (start date set by hand or from LDAP)
                ids |= {u.id for u in staff if u.start_date and u.start_date >= since}
            elif x.kind == "department":
                ids |= {u.id for u in staff if u.department == x.value}
            elif x.kind == "branch" and x.value.isdigit():
                ids |= {u.id for u in staff if u.branch_id == int(x.value)}
            elif x.kind == "position" and x.value.strip():  # job title, e.g. from LDAP "title"
                wanted = x.value.strip().casefold()
                ids |= {u.id for u in staff if (u.position or "").casefold() == wanted}
            elif x.kind == "group" and x.value.isdigit():
                ids |= members.get(int(x.value), set())
            elif x.kind == "user" and x.value.isdigit():
                ids.add(int(x.value))
        out[t.id] = ids & active
    return out


def assigned_ids(db: Session, training: Training) -> set[int]:
    """Active people one training is assigned to."""
    return assignment_map(db, [training]).get(training.id, set())


def _sign(name: str, exp: int) -> str:
    return hmac.new(settings.secret_key.encode(), f"training:{name}:{exp}".encode(), hashlib.sha256).hexdigest()[:40]


def _signed_url(name: str) -> str:
    exp = int(time.time()) + LINK_SECONDS
    return f"/api/training-files/{name}?exp={exp}&sig={_sign(name, exp)}"


def _material_out(m: TrainingMaterial) -> dict:
    return {"id": m.id, "kind": m.kind, "name": m.name, "size": m.size,
            "url": m.url if m.kind == "link" else _signed_url(m.file)}


def _done(db: Session, training: Training, user_id: int) -> TrainingCompletion | None:
    c = db.get(TrainingCompletion, (training.id, user_id))
    return c if c and c.version >= training.version else None


def _training(db: Session, training_id: int) -> Training:
    t = db.get(Training, training_id)
    if not t:
        raise HTTPException(404, "Training not found")
    return t


def _visible_to(db: Session, training: Training, user: User) -> bool:
    return has_perm(user, "trainings") or (training.active and (training.open_to_all or user.id in assigned_ids(db, training)))


def _detail(db: Session, t: Training, user: User, ids: set[int] | None = None) -> dict:
    done = _done(db, t, user.id)
    earlier = db.get(TrainingCompletion, (t.id, user.id))
    assigned = user.id in (assigned_ids(db, t) if ids is None else ids)
    return {
        "id": t.id, "title_de": t.title_de, "title_en": t.title_en, "description_de": t.description_de,
        "description_en": t.description_en, "due_date": t.due_date, "active": t.active, "version": t.version,
        "materials": [_material_out(m) for m in t.materials], "assigned": assigned,
        "optional": bool(t.open_to_all and not assigned), "open_to_all": t.open_to_all,
        "completed_at": done.completed_at if done else None, "renewed": bool(earlier and not done and assigned),
        "overdue": bool(assigned and t.due_date and not done and t.due_date < date.today()),
    }


def _report(db: Session, t: Training, ids: set[int] | None = None) -> dict:
    ids = assigned_ids(db, t) if ids is None else ids
    people = db.query(User).filter(User.id.in_(ids)).order_by(User.last_name, User.first_name).all() if ids else []
    rows = {c.user_id: c for c in db.query(TrainingCompletion).filter(TrainingCompletion.training_id == t.id)}
    done, open_ = [], []
    for u in people:
        brief = {"id": u.id, "full_name": u.full_name, "department": u.department, "position": u.position,
                 "avatar_url": u.avatar_url}
        c = rows.get(u.id)
        if c and c.version >= t.version:
            done.append({**brief, "completed_at": c.completed_at})
        else:
            open_.append({**brief, "earlier_round": bool(c)})
    done.sort(key=lambda x: x["completed_at"], reverse=True)
    voluntary = []  # people who did it without being assigned (open-to-all trainings)
    others = [uid for uid in rows if uid not in ids]
    for u in (db.query(User).filter(User.id.in_(others)).all() if others else []):
        c = rows[u.id]
        if c.version >= t.version:
            voluntary.append({"id": u.id, "full_name": u.full_name, "department": u.department, "position": u.position,
                              "avatar_url": u.avatar_url, "completed_at": c.completed_at})
    voluntary.sort(key=lambda x: x["completed_at"], reverse=True)
    return {"version": t.version, "done": done, "open": open_, "voluntary": voluntary}


def _admin_row(db: Session, t: Training, ids: set[int] | None = None) -> dict:
    r = _report(db, t, ids)
    return {"id": t.id, "title_de": t.title_de, "title_en": t.title_en, "description_de": t.description_de,
            "description_en": t.description_en, "due_date": t.due_date, "active": t.active, "version": t.version,
            "open_to_all": t.open_to_all, "voluntary": len(r["voluntary"]),
            "targets": [{"kind": x.kind, "value": x.value} for x in t.targets],
            "materials": [_material_out(m) for m in t.materials],
            "assigned": len(r["done"]) + len(r["open"]), "done": len(r["done"]), "updated_at": t.updated_at}


# --- staff ----------------------------------------------------------------------------------


@router.get("/mine")
def my_trainings(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """The trainings assigned to the signed-in person, plus the voluntary ones open to everybody."""
    out = []
    active = db.query(Training).filter(Training.active.is_(True)).options(selectinload(Training.targets)).all()
    assigned = assignment_map(db, active)
    for t in active:
        if not t.open_to_all and user.id not in assigned.get(t.id, set()):
            continue
        d = _detail(db, t, user, assigned.get(t.id, set()))
        d.pop("description_de"), d.pop("description_en")
        d["materials"] = [{"kind": m["kind"]} for m in d["materials"]]
        out.append(d)
    out.sort(key=lambda d: (d["completed_at"] is not None, d["optional"], d["due_date"] or date.max))
    return out


@router.get("/{training_id}")
def get_training(training_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = _training(db, training_id)
    if not _visible_to(db, t, user):
        raise HTTPException(404, "Training not found")  # do not reveal trainings of other people
    return _detail(db, t, user)


@router.post("/{training_id}/complete")
def complete(training_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = _training(db, training_id)
    if not t.active or not (t.open_to_all or user.id in assigned_ids(db, t)):
        raise HTTPException(404, "Training not found")
    row = db.get(TrainingCompletion, (t.id, user.id))
    if row is None:
        row = TrainingCompletion(training_id=t.id, user_id=user.id)
        db.add(row)
    row.version = t.version
    row.completed_at = datetime.now()
    db.commit()
    return _detail(db, t, user)


@router.get("/{training_id}/certificate.pdf")
def certificate(training_id: int, user_id: int | None = None, lang: str = Query("de", pattern="^(de|en)$"),
                me: User = Depends(current_user), db: Session = Depends(get_db)):
    """Printable proof (PDF) that a person confirmed the training - for the person themselves, or for any person
    when the caller manages trainings. Exists only after the confirmation of the current round."""
    from app.certificate import training_certificate
    t = _training(db, training_id)
    person = me
    if user_id and user_id != me.id:
        if not has_perm(me, "trainings"):
            raise HTTPException(403, "Only training managers can download other people's certificates")
        person = db.get(User, user_id)
        if not person:
            raise HTTPException(404, "User not found")
    elif not _visible_to(db, t, me):
        raise HTTPException(404, "Training not found")
    done = _done(db, t, person.id)
    if not done:
        raise HTTPException(409, "Not confirmed yet - the certificate exists only after the confirmation")
    manager = db.get(User, person.manager_id) if person.manager_id else None
    branch = db.get(Branch, person.branch_id) if person.branch_id else None
    pdf = training_certificate(t, person, done, manager, branch.name if branch else "", lang)
    safe = "".join(c for c in person.username if c.isalnum() or c in "._-") or str(person.id)
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="schulungsnachweis-{t.id}-{safe}.pdf"'})


# --- admin ----------------------------------------------------------------------------------


@router.get("")
def list_all(_: User = Depends(require_perm("trainings")), db: Session = Depends(get_db)):
    ts = db.query(Training).options(selectinload(Training.targets), selectinload(Training.materials)) \
        .order_by(Training.active.desc(), Training.updated_at.desc()).all()
    assigned = assignment_map(db, ts)
    return [_admin_row(db, t, assigned.get(t.id, set())) for t in ts]


def _apply(db: Session, t: Training, body: TrainingIn) -> None:
    for k, v in body.model_dump(exclude={"targets"}).items():
        setattr(t, k, v)
    seen, targets = set(), []
    for x in body.targets:
        valueless = x.kind in ("all", "newcomers")
        key = (x.kind, "" if valueless else x.value.strip())
        if key in seen or (not valueless and not key[1]):
            continue
        seen.add(key)
        targets.append(TrainingTarget(kind=key[0], value=key[1]))
    t.targets = targets


@router.post("", status_code=201)
def create(body: TrainingIn, admin: User = Depends(require_perm("trainings")), db: Session = Depends(get_db)):
    t = Training(created_by=admin.id)
    _apply(db, t, body)
    db.add(t)
    db.commit()
    return _admin_row(db, t)


@router.put("/{training_id}")
def update(training_id: int, body: TrainingIn, _: User = Depends(require_perm("trainings")), db: Session = Depends(get_db)):
    t = _training(db, training_id)
    _apply(db, t, body)
    db.commit()
    return _admin_row(db, t)


@router.post("/{training_id}/renew")
def renew(training_id: int, _: User = Depends(require_perm("trainings")), db: Session = Depends(get_db)):
    """New round (e.g. yearly instruction or changed content): everyone has to confirm again."""
    t = _training(db, training_id)
    t.version += 1
    db.commit()
    return _admin_row(db, t)


@router.delete("/{training_id}", status_code=204)
def delete(training_id: int, _: User = Depends(require_perm("trainings")), db: Session = Depends(get_db)):
    t = _training(db, training_id)
    files = [m.file for m in t.materials if m.file]
    db.delete(t)
    db.commit()
    for name in files:
        (settings.training_dir / name).unlink(missing_ok=True)


@router.get("/{training_id}/report")
def report(training_id: int, _: User = Depends(require_perm("trainings")), db: Session = Depends(get_db)):
    return _report(db, _training(db, training_id))


@router.get("/{training_id}/report.csv")
def report_csv(training_id: int, _: User = Depends(require_perm("trainings")), db: Session = Depends(get_db)):
    """Proof for audits: who confirmed which round when, and who is still open."""
    t = _training(db, training_id)
    r = _report(db, t)
    out = io.StringIO()
    w = csv.writer(out, delimiter=";")
    w.writerow(["Schulung", t.title_de])
    w.writerow(["Runde", t.version])
    w.writerow(["Fällig bis", t.due_date.strftime("%d.%m.%Y") if t.due_date else ""])
    w.writerow(["Stand", datetime.now().strftime("%d.%m.%Y %H:%M")])
    w.writerow([])
    w.writerow(["Name", "Abteilung", "Position", "Status", "Bestätigt am"])
    for p in r["done"]:
        w.writerow([p["full_name"], p["department"], p["position"], "erledigt", p["completed_at"].strftime("%d.%m.%Y %H:%M")])
    for p in r["open"]:
        w.writerow([p["full_name"], p["department"], p["position"], "offen", ""])
    for p in r["voluntary"]:
        w.writerow([p["full_name"], p["department"], p["position"], "freiwillig erledigt", p["completed_at"].strftime("%d.%m.%Y %H:%M")])
    return Response("﻿" + out.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="schulung-{t.id}.csv"'})


# --- materials ------------------------------------------------------------------------------

_KINDS = {  # extension: (kind, size limit attribute, magic check)
    ".pdf": ("pdf", "max_pdf_mb", lambda h: h.startswith(b"%PDF-")),
    ".mp4": ("video", "max_video_mb", lambda h: h[4:8] == b"ftyp"),
    ".webm": ("video", "max_video_mb", lambda h: h.startswith(b"\x1a\x45\xdf\xa3")),
    ".jpg": ("image", "max_upload_mb", lambda h: h.startswith(b"\xff\xd8\xff")),
    ".png": ("image", "max_upload_mb", lambda h: h.startswith(b"\x89PNG")),
    ".webp": ("image", "max_upload_mb", lambda h: h.startswith(b"RIFF") and h[8:12] == b"WEBP"),
}
_EXT_BY_TYPE = {"application/pdf": ".pdf", "video/mp4": ".mp4", "video/webm": ".webm", "image/jpeg": ".jpg",
                "image/png": ".png", "image/webp": ".webp"}


@router.post("/{training_id}/materials", status_code=201)
async def upload_material(training_id: int, file: UploadFile = File(...), name: str = Form(""),
                          _: User = Depends(require_perm("trainings")), db: Session = Depends(get_db)):
    t = _training(db, training_id)
    original = (file.filename or "").rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    ext = _EXT_BY_TYPE.get(file.content_type or "") or ("." + original.rsplit(".", 1)[-1].lower() if "." in original else "")
    if ext == ".jpeg":
        ext = ".jpg"
    if ext not in _KINDS:
        raise HTTPException(415, "Allowed: PDF, MP4/WebM video, JPEG/PNG/WebP image")
    kind, limit_attr, check = _KINDS[ext]
    limit = getattr(settings, limit_attr) * 1024 * 1024
    stored = f"tr-{uuid.uuid4().hex}{ext}"
    path = settings.training_dir / stored
    size = 0
    head = b""
    try:
        with path.open("wb") as fh:  # streamed to disk: videos can be large
            while chunk := await file.read(CHUNK):
                if not head:
                    head = chunk[:16]
                    if not check(head):
                        raise HTTPException(415, "File content does not match its type")
                size += len(chunk)
                if size > limit:
                    raise HTTPException(413, f"File is larger than {getattr(settings, limit_attr)} MB")
                fh.write(chunk)
    except HTTPException:
        path.unlink(missing_ok=True)
        raise
    if size == 0:
        path.unlink(missing_ok=True)
        raise HTTPException(400, "Empty file")
    m = TrainingMaterial(training_id=t.id, kind=kind, name=(name or original or stored)[:200], file=stored, size=size,
                         sort=len(t.materials))
    db.add(m)
    db.commit()
    return _material_out(m)


@router.post("/{training_id}/links", status_code=201)
def add_link(training_id: int, body: LinkIn, _: User = Depends(require_perm("trainings")), db: Session = Depends(get_db)):
    t = _training(db, training_id)
    m = TrainingMaterial(training_id=t.id, kind="link", name=body.name, url=body.url, sort=len(t.materials))
    db.add(m)
    db.commit()
    return _material_out(m)


@router.delete("/materials/{material_id}", status_code=204)
def delete_material(material_id: int, _: User = Depends(require_perm("trainings")), db: Session = Depends(get_db)):
    m = db.get(TrainingMaterial, material_id)
    if not m:
        raise HTTPException(404, "Material not found")
    name = m.file
    db.delete(m)
    db.commit()
    if name:
        (settings.training_dir / name).unlink(missing_ok=True)


@router.get("/positions/all")
def positions(_: User = Depends(require_perm("trainings")), db: Session = Depends(get_db)):
    """Job titles in use (from the profiles / LDAP) for assigning trainings by function."""
    rows = _staff_query(db).with_entities(User.position).filter(User.position != "").distinct().all()
    return sorted({p for (p,) in rows if p}, key=str.lower)


# --- groups (admin) -------------------------------------------------------------------------


def _group_out(g: TrainingGroup) -> dict:
    return {"id": g.id, "name": g.name, "member_ids": [m.user_id for m in g.members]}


@router.get("/groups/all")
def list_groups(_: User = Depends(require_perm("trainings")), db: Session = Depends(get_db)):
    return [_group_out(g) for g in db.query(TrainingGroup).order_by(TrainingGroup.name)]


def _save_group(db: Session, g: TrainingGroup, body: GroupIn) -> None:
    name = body.name.strip()
    clash = db.query(TrainingGroup).filter(TrainingGroup.name == name, TrainingGroup.id != (g.id or 0)).first()
    if clash:
        raise HTTPException(409, "A group with this name already exists")
    g.name = name
    valid = {u for (u,) in db.query(User.id).filter(User.id.in_(body.member_ids))} if body.member_ids else set()
    g.members = [TrainingGroupMember(user_id=u) for u in sorted(valid)]


@router.post("/groups", status_code=201)
def create_group(body: GroupIn, _: User = Depends(require_perm("trainings")), db: Session = Depends(get_db)):
    g = TrainingGroup()
    _save_group(db, g, body)
    db.add(g)
    db.commit()
    return _group_out(g)


@router.put("/groups/{group_id}")
def update_group(group_id: int, body: GroupIn, _: User = Depends(require_perm("trainings")), db: Session = Depends(get_db)):
    g = db.get(TrainingGroup, group_id)
    if not g:
        raise HTTPException(404, "Group not found")
    _save_group(db, g, body)
    db.commit()
    return _group_out(g)


@router.delete("/groups/{group_id}", status_code=204)
def delete_group(group_id: int, _: User = Depends(require_perm("trainings")), db: Session = Depends(get_db)):
    g = db.get(TrainingGroup, group_id)
    if not g:
        raise HTTPException(404, "Group not found")
    db.query(TrainingTarget).filter(TrainingTarget.kind == "group", TrainingTarget.value == str(group_id)).delete()
    db.delete(g)
    db.commit()


# --- files via signed links ------------------------------------------------------------------

_MEDIA = {".pdf": "application/pdf", ".mp4": "video/mp4", ".webm": "video/webm", ".jpg": "image/jpeg",
          ".png": "image/png", ".webp": "image/webp"}


@files_router.get("/api/training-files/{name}", include_in_schema=False)
def training_file(name: str, exp: int = Query(...), sig: str = Query(...)):
    if not (name.startswith("tr-") and "/" not in name and "\\" not in name and ".." not in name):
        raise HTTPException(404)
    if exp < time.time() or not hmac.compare_digest(sig, _sign(name, exp)):
        raise HTTPException(403, "Link expired - please reopen the training")
    path = settings.training_dir / name
    ext = "." + name.rsplit(".", 1)[-1]
    if not path.is_file() or ext not in _MEDIA:
        raise HTTPException(404)
    headers = {"Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff"}
    if ext == ".pdf":  # shown in the portal's own viewer (iframe on this site)
        headers.update({"Content-Security-Policy": "frame-ancestors 'self'", "X-Frame-Options": "SAMEORIGIN"})
    else:
        headers["Content-Security-Policy"] = "default-src 'none'; media-src 'self'; img-src 'self'; sandbox"
    return FileResponse(path, media_type=_MEDIA[ext], headers=headers, content_disposition_type="inline")
