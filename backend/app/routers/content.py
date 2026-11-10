from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import and_, case, false, func, or_, true
from pydantic import BaseModel
from typing import Literal
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models import AppSetting, Article, Attachment, Branch, Classified, User
from app.schemas import (ArticleCard, ArticleIn, ArticleOut, ClassifiedIn, ClassifiedOut, DocumentOut, HomeOut,
                         PersonBrief, PhotoOut)
from app.security import current_user, has_perm, reader, require_perm
from app.uploads import save_file, save_image

router = APIRouter(prefix="/api", tags=["content"])
NEW_PEOPLE_DAYS = 90


def branch_ok(user: User | None):
    """SQL condition for the branch limit. Articles without branches are for everybody. Signed-in people see
    those of their own branch; people without a branch (e.g. head office) and the editors see all;
    visitors who are not signed in see only the ones for everybody."""
    if has_perm(user, "content_all") or (user is not None and not user.branch_id):
        return true()
    everybody = ~Article.branches.any()
    if user is None:
        return everybody
    return or_(everybody, Article.branches.any(Branch.id == user.branch_id), Article.author_id == user.id)


def live_for(user: User | None):
    """Published, date reached, and meant for this person's branch."""
    return and_(Article.live(), branch_ok(user))


def pinned_now():
    """Filter: pinned and still within the pin date."""
    return and_(Article.pinned.is_(True), or_(Article.pinned_until.is_(None), Article.pinned_until >= date.today()))


def pinned_first():
    """Order expression: pinned articles (still within their pin date) first."""
    active = pinned_now()
    return case((active, 0), else_=1)


def _visible(query, user: User | None):
    """Editors see all drafts, authors their own; everyone else (incl. anonymous visitors) only published articles
    of their branch."""
    if has_perm(user, "content_all"):
        return query
    if has_perm(user, "content_own"):
        return query.filter(or_(live_for(user), Article.author_id == user.id))
    return query.filter(live_for(user))


def visible_to(user: User | None, article: Article) -> bool:
    """Python twin of ``_visible`` for one article (used for notifications)."""
    if has_perm(user, "content_all"):
        return True
    own = user is not None and article.author_id == user.id
    live = article.published and article.published_at <= datetime.now()
    if not (live or (own and has_perm(user, "content_own"))):
        return False
    if not article.branches or own or (user is not None and not user.branch_id):
        return True
    return user is not None and user.branch_id in {b.id for b in article.branches}


def _branches(db: Session, ids: list[int]) -> list[Branch]:
    found = db.query(Branch).filter(Branch.id.in_(set(ids))).all() if ids else []
    if len(found) != len(set(ids)):
        raise HTTPException(422, "Unknown branch")
    return found


def _may_edit(user: User, article: Article) -> bool:
    return has_perm(user, "content_all") or (has_perm(user, "content_own") and article.author_id == user.id)


HOME_BLOCKS = ("slider", "quicklinks", "upcoming", "news", "people", "photos", "recent", "poll", "board", "social")
DEFAULT_LAYOUT = [
    {"id": "slider", "show": True, "width": "full"}, {"id": "quicklinks", "show": True, "width": "full"},
    {"id": "upcoming", "show": True, "width": "full"}, {"id": "news", "show": True, "width": "full"},
    {"id": "people", "show": True, "width": "full"}, {"id": "photos", "show": True, "width": "full"},
    {"id": "poll", "show": True, "width": "half"}, {"id": "board", "show": True, "width": "half"},
    {"id": "social", "show": True, "width": "full"}, {"id": "recent", "show": False, "width": "full"},
]


class LayoutBlock(BaseModel):
    id: Literal[HOME_BLOCKS]  # type: ignore[valid-type]
    show: bool = True
    width: Literal["full", "half"] = "full"


def home_layout(db: Session) -> list[dict]:
    """Saved layout; blocks added in later versions are appended (hidden) so the order stays as chosen."""
    import json
    row = db.get(AppSetting, "home_layout")
    try:
        saved = json.loads(row.value) if row else DEFAULT_LAYOUT
    except ValueError:
        saved = DEFAULT_LAYOUT
    ids = [b["id"] for b in saved if b.get("id") in HOME_BLOCKS]
    out = [b for b in saved if b.get("id") in HOME_BLOCKS]
    # new blocks appear as in the default layout (empty blocks are skipped on the page anyway)
    defaults = {b["id"]: b for b in DEFAULT_LAYOUT}
    out += [dict(defaults.get(b, {"id": b, "show": False, "width": "full"})) for b in HOME_BLOCKS if b not in ids]
    return out


@router.get("/home-layout")
def get_home_layout(_: User | None = Depends(reader), db: Session = Depends(get_db)):
    return {"layout": home_layout(db), "default": DEFAULT_LAYOUT}


@router.put("/home-layout")
def save_home_layout(body: list[LayoutBlock], _: User = Depends(require_perm("content_all")), db: Session = Depends(get_db)):
    import json
    ids = [b.id for b in body]
    if len(set(ids)) != len(ids):
        raise HTTPException(422, "Each block only once")
    value = json.dumps([b.model_dump() for b in body])
    row = db.get(AppSetting, "home_layout")
    if row:
        row.value = value
    else:
        db.add(AppSetting(key="home_layout", value=value))
    db.commit()
    return {"layout": home_layout(db), "default": DEFAULT_LAYOUT}


@router.get("/home", response_model=HomeOut)
def home(viewer: User | None = Depends(reader), db: Session = Depends(get_db)):
    from app.routers.calendar import with_rsvps
    published = db.query(Article).filter(live_for(viewer))
    newest = published.order_by(Article.published_at.desc())
    since = date.today() - timedelta(days=NEW_PEOPLE_DAYS)
    counts = dict(published.with_entities(Article.category, func.count()).group_by(Article.category).all())
    return {
        "slides": newest.filter(Article.featured.is_(True)).limit(6).all(),
        # pinned posts (any category, e.g. the annual plan) stand first in "Was gibt's Neues"
        "news": published.filter(or_(Article.category.in_(["news", "products"]), pinned_now()))
                         .order_by(pinned_first(), Article.published_at.desc()).limit(6).all(),
        "layout": home_layout(db),
        "events": with_rsvps(db, published.filter(Article.category == "events", Article.event_date >= datetime.now()
                                   - timedelta(hours=12)).order_by(Article.event_date).limit(3).all(), viewer),
        "recent": newest.limit(6).all(),
        "new_people": db.query(User).filter(User.is_active.is_(True), User.show_in_directory.is_(True),
                                            User.start_date >= since)
                        .order_by(User.start_date.desc()).limit(12).all(),
        "classifieds": db.query(Classified).options(joinedload(Classified.author)).filter(Classified.live())
                         .order_by(Classified.created_at.desc()).limit(4).all(),
        "photos": latest_photos(db, 9, viewer),
        "counts": counts,
    }


def latest_photos(db: Session, limit: int, viewer: User | None = None) -> list[dict]:
    """Newest gallery photos of published articles – a few per article so one event doesn't fill the wall."""
    rows = (db.query(Attachment, Article).join(Article, Article.id == Attachment.article_id)
            .filter(Attachment.kind == "image", live_for(viewer))
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
def list_photos(limit: int = Query(24, ge=1, le=100), viewer: User | None = Depends(reader), db: Session = Depends(get_db)):
    return latest_photos(db, limit, viewer)


@router.get("/articles", response_model=list[ArticleCard])
def list_articles(
    category: list[str] = Query(default=[]),
    q: str = "",
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    with_pinned: bool = False,
    user: User | None = Depends(reader),
    db: Session = Depends(get_db),
):
    query = _visible(db.query(Article), user)
    if category:
        cond = Article.category.in_(category)
        query = query.filter(or_(cond, pinned_now()) if with_pinned else cond)
    if q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(or_(Article.title_de.ilike(like), Article.title_en.ilike(like),
                                 Article.summary_de.ilike(like), Article.summary_en.ilike(like),
                                 Article.body_de.ilike(like), Article.body_en.ilike(like)))
    return query.order_by(pinned_first(), Article.published_at.desc()).offset(offset).limit(limit).all()


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
    data = body.model_dump(exclude={"attachments", "change_note", "branch_ids"})
    data["published_at"] = data["published_at"] or datetime.now()
    if not has_perm(editor, "content_all"):
        data["featured"] = False  # the home slider is chosen by the editors
        data["pinned"], data["pinned_until"] = False, None
    article = Article(**data, author_id=editor.id)
    article.branches = _branches(db, body.branch_ids)
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
    for key, value in body.model_dump(exclude={"attachments", "change_note", "branch_ids"}).items():
        if key == "published_at" and value is None:
            continue  # keep the existing date
        if key in ("featured", "pinned", "pinned_until") and not has_perm(editor, "content_all"):
            continue  # slider and pins stay as the editors set them
        setattr(article, key, value)
    article.branches = _branches(db, body.branch_ids)
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
def list_documents(q: str = "", viewer: User | None = Depends(reader), db: Session = Depends(get_db)):
    """All PDFs attached to published articles – the company document library."""
    query = (db.query(Attachment, Article).join(Article, Article.id == Attachment.article_id)
             .filter(Attachment.kind == "pdf", live_for(viewer)))
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


# --- Kleinanzeigen -----------------------------------------------------------------


@router.get("/classifieds", response_model=list[ClassifiedOut])
def list_classifieds(kind: str = "", _: User | None = Depends(reader), db: Session = Depends(get_db)):
    query = db.query(Classified).options(joinedload(Classified.author)).filter(Classified.live())
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
