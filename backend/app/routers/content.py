from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models import Article, Attachment, Classified, User
from app.schemas import (ArticleCard, ArticleIn, ArticleOut, ClassifiedIn, ClassifiedOut, DocumentOut, HomeOut,
                         PersonBrief, PhotoOut)
from app.security import current_user, has_perm, reader, require_perm
from app.uploads import save_file, save_image

router = APIRouter(prefix="/api", tags=["content"])
NEW_PEOPLE_DAYS = 90


def _visible(query, user: User | None):
    """Editors see all drafts, authors their own; everyone else (incl. anonymous visitors) only published articles."""
    if has_perm(user, "content_all"):
        return query
    if has_perm(user, "content_own"):
        return query.filter(or_(Article.live(), Article.author_id == user.id))
    return query.filter(Article.live())


def _may_edit(user: User, article: Article) -> bool:
    return has_perm(user, "content_all") or (has_perm(user, "content_own") and article.author_id == user.id)


@router.get("/home", response_model=HomeOut)
def home(viewer: User | None = Depends(reader), db: Session = Depends(get_db)):
    from app.routers.calendar import with_rsvps
    published = db.query(Article).filter(Article.live())
    newest = published.order_by(Article.published_at.desc())
    since = date.today() - timedelta(days=NEW_PEOPLE_DAYS)
    counts = dict(published.with_entities(Article.category, func.count()).group_by(Article.category).all())
    return {
        "slides": newest.filter(Article.featured.is_(True)).limit(6).all(),
        "news": newest.filter(Article.category.in_(["news", "products"])).limit(4).all(),
        "events": with_rsvps(db, published.filter(Article.category == "events", Article.event_date >= datetime.now()
                                   - timedelta(hours=12)).order_by(Article.event_date).limit(3).all(), viewer),
        "recent": newest.limit(6).all(),
        "new_people": db.query(User).filter(User.is_active.is_(True), User.show_in_directory.is_(True),
                                            User.start_date >= since)
                        .order_by(User.start_date.desc()).limit(8).all(),
        "classifieds": db.query(Classified).options(joinedload(Classified.author))
                         .order_by(Classified.created_at.desc()).limit(4).all(),
        "photos": latest_photos(db, 9),
        "counts": counts,
    }


def latest_photos(db: Session, limit: int) -> list[dict]:
    """Newest gallery photos of published articles – a few per article so one event doesn't fill the wall."""
    rows = (db.query(Attachment, Article).join(Article, Article.id == Attachment.article_id)
            .filter(Attachment.kind == "image", Article.live())
            .order_by(func.coalesce(Article.event_date, Article.published_at).desc(), Attachment.sort).all())
    per_article: dict[int, int] = {}
    out = []
    for att, art in rows:
        if per_article.get(art.id, 0) >= 4:
            continue
        per_article[art.id] = per_article.get(art.id, 0) + 1
        out.append({"id": att.id, "url": att.url, "name": att.name, "article_id": art.id,
                    "article_title_de": art.title_de, "article_title_en": art.title_en, "event_date": art.event_date})
        if len(out) >= limit:
            break
    return out


@router.get("/photos", response_model=list[PhotoOut])
def list_photos(limit: int = Query(24, ge=1, le=100), _: User | None = Depends(reader), db: Session = Depends(get_db)):
    return latest_photos(db, limit)


@router.get("/articles", response_model=list[ArticleCard])
def list_articles(
    category: list[str] = Query(default=[]),
    q: str = "",
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: User | None = Depends(reader),
    db: Session = Depends(get_db),
):
    query = _visible(db.query(Article), user)
    if category:
        query = query.filter(Article.category.in_(category))
    if q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(or_(Article.title_de.ilike(like), Article.title_en.ilike(like),
                                 Article.summary_de.ilike(like), Article.summary_en.ilike(like),
                                 Article.body_de.ilike(like), Article.body_en.ilike(like)))
    return query.order_by(Article.published_at.desc()).offset(offset).limit(limit).all()


def _get_article(db: Session, article_id: int, user: User | None) -> Article:
    article = _visible(db.query(Article), user).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(404, "Article not found")
    return article


def article_out(db: Session, article: Article, viewer: User | None) -> dict:
    from app.routers.revisions import version_count  # local import avoids a cycle
    data = ArticleOut.model_validate(article, from_attributes=True).model_dump()
    data["version"] = version_count(db, article.id)
    return data


@router.get("/articles/{article_id}", response_model=ArticleOut)
def get_article(article_id: int, user: User | None = Depends(reader), db: Session = Depends(get_db)):
    return article_out(db, _get_article(db, article_id, user), user)


def _set_attachments(article: Article, items) -> None:
    article.attachments = [Attachment(kind=a.kind, url=a.url, name=a.name, size=a.size, sort=i)
                           for i, a in enumerate(items)]


@router.post("/articles", response_model=ArticleOut, status_code=201)
def create_article(body: ArticleIn, editor: User = Depends(require_perm("content_own", "content_all")),
                   db: Session = Depends(get_db)):
    from app.routers.revisions import record_revision
    data = body.model_dump(exclude={"attachments", "change_note"})
    data["published_at"] = data["published_at"] or datetime.now()
    if not has_perm(editor, "content_all"):
        data["featured"] = False  # the home slider is chosen by the editors
    article = Article(**data, author_id=editor.id)
    _set_attachments(article, body.attachments)
    db.add(article)
    db.flush()
    record_revision(db, article, editor, body.change_note or "Erstellt", force=True)
    db.commit()
    db.refresh(article)
    return article_out(db, article, editor)


@router.put("/articles/{article_id}", response_model=ArticleOut)
def update_article(article_id: int, body: ArticleIn, editor: User = Depends(require_perm("content_own", "content_all")),
                   db: Session = Depends(get_db)):
    from app.routers.revisions import record_revision
    article = _get_article(db, article_id, editor)
    if not _may_edit(editor, article):
        raise HTTPException(403, "Authors can only edit their own articles")
    for key, value in body.model_dump(exclude={"attachments", "change_note"}).items():
        if key == "published_at" and value is None:
            continue  # keep the existing date
        if key == "featured" and not has_perm(editor, "content_all"):
            continue  # slider stays as the editors set it
        setattr(article, key, value)
    _set_attachments(article, body.attachments)
    db.flush()
    record_revision(db, article, editor, body.change_note)
    db.commit()
    db.refresh(article)
    return article_out(db, article, editor)


@router.delete("/articles/{article_id}", status_code=204)
def delete_article(article_id: int, editor: User = Depends(require_perm("content_own", "content_all")),
                   db: Session = Depends(get_db)):
    article = _get_article(db, article_id, editor)
    if not _may_edit(editor, article):
        raise HTTPException(403, "Authors can only delete their own articles")
    db.delete(article)
    db.commit()


@router.post("/files")
async def upload_file(file: UploadFile = File(...), _: User = Depends(require_perm("content_own", "content_all"))):
    """Article attachment: photo (gallery) or PDF document."""
    return await save_file(file)


@router.get("/documents", response_model=list[DocumentOut])
def list_documents(q: str = "", _: User | None = Depends(reader), db: Session = Depends(get_db)):
    """All PDFs attached to published articles – the company document library."""
    query = (db.query(Attachment, Article).join(Article, Article.id == Attachment.article_id)
             .filter(Attachment.kind == "pdf", Article.live()))
    if q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(or_(Attachment.name.ilike(like), Article.title_de.ilike(like), Article.title_en.ilike(like)))
    return [{"id": a.id, "name": a.name, "url": a.url, "size": a.size, "article_id": art.id,
             "article_title_de": art.title_de, "article_title_en": art.title_en, "category": art.category,
             "created_at": art.created_at, "published_at": art.published_at}
            for a, art in query.order_by(Article.category, Attachment.name).all()]


@router.post("/images")
async def upload_image(file: UploadFile = File(...), _: User = Depends(current_user)):
    """Any signed-in user may attach an image (board notices); editors use it for articles."""
    return {"url": await save_image(file, "img")}


# --- Pinnwand -----------------------------------------------------------------


@router.get("/classifieds", response_model=list[ClassifiedOut])
def list_classifieds(kind: str = "", _: User | None = Depends(reader), db: Session = Depends(get_db)):
    query = db.query(Classified).options(joinedload(Classified.author))
    if kind:
        query = query.filter(Classified.kind == kind)
    return query.order_by(Classified.created_at.desc()).limit(200).all()


@router.post("/classifieds", response_model=ClassifiedOut, status_code=201)
def create_classified(body: ClassifiedIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = Classified(**body.model_dump(), author_id=user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/classifieds/{item_id}", status_code=204)
def delete_classified(item_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = db.get(Classified, item_id)
    if not item:
        raise HTTPException(404, "Notice not found")
    if item.author_id != user.id and not has_perm(user, "moderate"):
        raise HTTPException(403, "Only the author or an editor can remove this notice")
    db.delete(item)
    db.commit()


__all__ = ["router", "PersonBrief"]
