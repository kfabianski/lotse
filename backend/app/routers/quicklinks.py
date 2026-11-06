"""Quick-access tiles on the home page (company tools, shared mailboxes, phone numbers), managed by admins."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import QuickLink, User
from app.security import has_perm, reader, require_perm

router = APIRouter(prefix="/api/quicklinks", tags=["quicklinks"])

Icon = Literal["link", "clock", "mail", "receipt", "calculator", "lifebuoy", "monitor", "truck", "package", "users",
               "calendar", "file", "globe", "phone", "printer", "wifi", "cart", "building", "book", "wrench",
               "euro", "shield", "message", "car"]
# Only web links, mail, phone or a path inside the portal - never javascript: or data: URLs.
URL_PATTERN = r"^(https?://[^\s<>\"']+|mailto:[^\s@<>\"']+@[^\s<>\"']+|tel:[+0-9 ()/.-]{2,40}|/[^\s<>\"']*)$"


class QuickLinkIn(BaseModel):
    title_de: str = Field(min_length=1, max_length=80)
    title_en: str = Field(default="", max_length=80)
    subtitle_de: str = Field(default="", max_length=120)
    subtitle_en: str = Field(default="", max_length=120)
    url: str = Field(max_length=500, pattern=URL_PATTERN)
    icon: Icon = "link"
    color: str = Field(default="#3557f5", pattern=r"^#[0-9A-Fa-f]{6}$")
    sort: int = 0
    active: bool = True

    @field_validator("url", mode="before")
    @classmethod
    def normalise(cls, v: str) -> str:
        """Plain e-mail addresses become mailto: links."""
        v = (v or "").strip()
        if "@" in v and ":" not in v and "/" not in v:
            return f"mailto:{v}"
        return v


class QuickLinkOut(QuickLinkIn):
    id: int


def _out(q: QuickLink) -> dict:
    return {k: getattr(q, k) for k in QuickLinkOut.model_fields}


@router.get("", response_model=list[QuickLinkOut])
def list_links(all: bool = False, viewer: User | None = Depends(reader), db: Session = Depends(get_db)):
    query = db.query(QuickLink)
    if not (all and has_perm(viewer, "quicklinks")):  # tile managers can ask for hidden tiles too
        query = query.filter(QuickLink.active.is_(True))
    return [_out(q) for q in query.order_by(QuickLink.sort, QuickLink.id)]


@router.post("", response_model=QuickLinkOut, status_code=201)
def create_link(body: QuickLinkIn, _: User = Depends(require_perm("quicklinks")), db: Session = Depends(get_db)):
    q = QuickLink(**body.model_dump())
    db.add(q)
    db.commit()
    return _out(q)


@router.put("/{link_id}", response_model=QuickLinkOut)
def update_link(link_id: int, body: QuickLinkIn, _: User = Depends(require_perm("quicklinks")), db: Session = Depends(get_db)):
    q = db.get(QuickLink, link_id)
    if not q:
        raise HTTPException(404, "Tile not found")
    for k, v in body.model_dump().items():
        setattr(q, k, v)
    db.commit()
    return _out(q)


@router.delete("/{link_id}", status_code=204)
def delete_link(link_id: int, _: User = Depends(require_perm("quicklinks")), db: Session = Depends(get_db)):
    q = db.get(QuickLink, link_id)
    if not q:
        raise HTTPException(404, "Tile not found")
    db.delete(q)
    db.commit()
