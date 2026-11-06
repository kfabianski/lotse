"""Version history of articles (incl. their documents): who changed what and when (ISO 9001).

The history is public information inside the company: it is readable like the article itself
(also without sign-in when public reading is on). Restoring an old version needs the editor role.
"""

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Article, ArticleRevision, Attachment, User
from app.security import has_perm, reader, require_perm

router = APIRouter(prefix="/api", tags=["revisions"])

SNAPSHOT_FIELDS = ("category", "title_de", "title_en", "summary_de", "summary_en", "body_de", "body_en")


# --- helpers used by the article endpoints -------------------------------------------------


def snapshot(article: Article) -> dict:
    data = {k: getattr(article, k) or "" for k in SNAPSHOT_FIELDS}
    data["attachments"] = [{"name": a.name, "url": a.url, "kind": a.kind, "size": a.size} for a in article.attachments]
    return data


def _row_snapshot(rev: ArticleRevision) -> dict:
    data = {k: getattr(rev, k) or "" for k in SNAPSHOT_FIELDS}
    data["attachments"] = json.loads(rev.attachments or "[]")
    return data


def record_revision(db: Session, article: Article, editor: User | None, note: str = "", force: bool = False) -> ArticleRevision | None:
    """Store the article's current state as a new version (skipped when nothing changed and no note given)."""
    last = (db.query(ArticleRevision).filter(ArticleRevision.article_id == article.id)
            .order_by(ArticleRevision.number.desc()).first())
    current = snapshot(article)
    if last and not force and not note.strip() and _row_snapshot(last) == current:
        return None
    rev = ArticleRevision(
        article_id=article.id, number=(last.number + 1) if last else 1, created_at=datetime.now(),
        editor_id=editor.id if editor else None, editor_name=editor.full_name if editor else "",
        note=note.strip()[:300], attachments=json.dumps(current.pop("attachments"), ensure_ascii=False), **current)
    db.add(rev)
    return rev


def ensure_initial_revisions(db: Session) -> int:
    """Articles created before version history existed get their current state as version 1."""
    have = {a for (a,) in db.query(ArticleRevision.article_id).distinct()}
    n = 0
    for article in db.query(Article).all():
        if article.id in have:
            continue
        rev = record_revision(db, article, article.author, "Erste erfasste Version", force=True)
        rev.created_at = article.updated_at or article.created_at or datetime.now()
        n += 1
    db.commit()
    return n


def version_count(db: Session, article_id: int) -> int:
    return db.query(func.count(ArticleRevision.id)).filter(ArticleRevision.article_id == article_id).scalar() or 0


def _readable(db: Session, article_id: int, user: User | None) -> Article:
    from app.routers.content import _get_article  # local import avoids a cycle
    return _get_article(db, article_id, user)


# --- version history (public like the article) -------------------------------------------


@router.get("/articles/{article_id}/revisions")
def list_revisions(article_id: int, viewer: User | None = Depends(reader), db: Session = Depends(get_db)):
    _readable(db, article_id, viewer)
    revs = (db.query(ArticleRevision).filter(ArticleRevision.article_id == article_id)
            .order_by(ArticleRevision.number.desc()).all())
    return [{"number": r.number, "created_at": r.created_at, "editor_name": r.editor_name or "", "note": r.note or "",
             "documents": sum(1 for a in json.loads(r.attachments or "[]") if a.get("kind") == "pdf")} for r in revs]


@router.get("/articles/{article_id}/revisions/{number}")
def get_revision(article_id: int, number: int, viewer: User | None = Depends(reader), db: Session = Depends(get_db)):
    _readable(db, article_id, viewer)
    rev = (db.query(ArticleRevision)
           .filter(ArticleRevision.article_id == article_id, ArticleRevision.number == number).first())
    if not rev:
        raise HTTPException(404, "Version not found")
    return {"number": rev.number, "created_at": rev.created_at, "editor_name": rev.editor_name or "",
            "note": rev.note or "", **_row_snapshot(rev)}


@router.post("/articles/{article_id}/revisions/{number}/restore")
def restore_revision(article_id: int, number: int, editor: User = Depends(require_perm("content_own", "content_all")),
                     db: Session = Depends(get_db)):
    article = _readable(db, article_id, editor)
    if not (has_perm(editor, "content_all") or article.author_id == editor.id):
        raise HTTPException(403, "Authors can only restore their own articles")
    rev = (db.query(ArticleRevision)
           .filter(ArticleRevision.article_id == article_id, ArticleRevision.number == number).first())
    if not rev:
        raise HTTPException(404, "Version not found")
    data = _row_snapshot(rev)
    for key in SNAPSHOT_FIELDS:
        setattr(article, key, data[key])
    article.attachments = [Attachment(kind=a["kind"], url=a["url"], name=a.get("name", ""), size=a.get("size", 0), sort=i)
                           for i, a in enumerate(data["attachments"])]
    db.flush()
    record_revision(db, article, editor, f"Wiederhergestellt aus Version {number}", force=True)
    db.commit()
    return {"ok": True}
