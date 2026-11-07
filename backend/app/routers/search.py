"""One search over everything a visitor may see: people, articles, events, documents, board notices,
ideas, rooms, quick links and – for signed-in people – their trainings.

Matching happens in Python instead of SQL ``ILIKE``: SQLite only folds ASCII case, so "schröder", "yilmaz"
(for "Yılmaz") or "strasse" would not be found. Every word of the query must occur somewhere in the item
(full names like "Mehmet Yılmaz" therefore work too). The intranet holds a few thousand rows at most."""
import html
import re
import unicodedata

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload, selectinload

from app.db import get_db
from app.models import Article, Attachment, Classified, Idea, Location, Poll, QuickLink, Room, Training, User
from app.routers.content import _visible, live_for
from app.schemas import ArticleCard
from app.security import has_perm, reader
from app.serialize import user_out

router = APIRouter(prefix="/api/search", tags=["search"])
_FOLD = str.maketrans({"ß": "ss", "ı": "i", "ł": "l", "ø": "o", "æ": "ae", "œ": "oe", "đ": "d"})
_TAGS = re.compile(r"<[^>]+>")
_MD = re.compile(r"[#*_`>\[\]()|~]+")


def fold(text: str) -> str:
    """Lower case without accents: "Schröder" → "schroder", "Yılmaz" → "yilmaz", "Straße" → "strasse"."""
    text = unicodedata.normalize("NFKD", (text or "").casefold().translate(_FOLD))
    return "".join(c for c in text if not unicodedata.combining(c))


def plain(text: str) -> str:
    """Body text without HTML / Markdown markup, for matching and snippets."""
    return " ".join(_MD.sub(" ", html.unescape(_TAGS.sub(" ", text or ""))).split())


def _matches(words: list[str], *fields: str) -> bool:
    hay = fold(" ".join(f for f in fields if f))
    # "Schroeder" written with oe should also find "Schröder"
    alt = hay.replace("ae", "a").replace("oe", "o").replace("ue", "u")
    return all(w in hay or w.replace("ae", "a").replace("oe", "o").replace("ue", "u") in alt for w in words)


def _snippet(words: list[str], text: str, size: int = 170) -> str:
    text = plain(text)
    if len(text) <= size:
        return text
    low = fold(text)  # same length as text for nearly all European scripts
    pos = min((p for p in (low.find(w) for w in words) if p >= 0), default=0)
    start = max(0, min(pos - 50, len(text) - size)) if len(low) == len(text) else 0
    cut = text[start:start + size].strip()
    return ("… " if start else "") + cut + (" …" if start + size < len(text) else "")


@router.get("")
def search(q: str = Query("", max_length=200), limit: int = Query(30, ge=1, le=100),
           viewer: User | None = Depends(reader), db: Session = Depends(get_db)):
    words = [w for w in fold(q).split() if w]
    empty = {k: [] for k in ("people", "articles", "documents", "classifieds", "ideas", "rooms", "links", "trainings", "polls")}
    if not words:
        return empty
    out = empty

    staff = db.query(User).filter(User.is_active.is_(True), User.show_in_directory.is_(True))
    full = has_perm(viewer, "people")
    out["people"] = [user_out(u, full=full) for u in staff.order_by(User.last_name, User.first_name).all()
                     if _matches(words, u.first_name, u.last_name, u.department, u.position, u.email, u.phone_ext,
                                 u.seat.label if u.seat else "")][:limit]

    for a in _visible(db.query(Article), viewer).order_by(Article.published_at.desc()).all():
        if _matches(words, a.title_de, a.title_en, a.summary_de, a.summary_en, plain(a.body_de), plain(a.body_en),
                    a.event_location):
            body = a.body_de if _matches(words, plain(a.body_de)) else a.body_en
            card = ArticleCard.model_validate(a, from_attributes=True).model_dump()
            in_head = _matches(words, a.title_de, a.title_en, a.summary_de, a.summary_en)
            card["snippet"] = "" if in_head else _snippet(words, body)
            out["articles"].append(card)
    out["articles"] = out["articles"][:limit]

    docs = (db.query(Attachment, Article).join(Article, Article.id == Attachment.article_id)
            .filter(Attachment.kind == "pdf", live_for(viewer)).order_by(Attachment.name))
    out["documents"] = [{"id": d.id, "name": d.name, "url": d.url, "size": d.size, "article_id": art.id,
                         "article_title_de": art.title_de, "article_title_en": art.title_en, "category": art.category}
                        for d, art in docs.all() if _matches(words, d.name, art.title_de, art.title_en)][:limit]

    for c in db.query(Classified).options(joinedload(Classified.author)).order_by(Classified.created_at.desc()):
        if _matches(words, c.title, plain(c.body), c.price, c.author.full_name if c.author else ""):
            out["classifieds"].append({"id": c.id, "kind": c.kind, "title": c.title, "price": c.price,
                                       "image_url": c.image_url, "snippet": _snippet(words, c.body),
                                       "author": c.author.full_name if c.author else ""})
    out["classifieds"] = out["classifieds"][:limit]

    for i in db.query(Idea).options(joinedload(Idea.author)).order_by(Idea.created_at.desc()):
        author = i.author.full_name if i.author and not i.anonymous else ""  # anonymous ideas stay anonymous
        if _matches(words, i.title, plain(i.body), plain(i.response), author):
            out["ideas"].append({"id": i.id, "title": i.title, "status": i.status, "topic": i.topic,
                                 "snippet": _snippet(words, i.body), "author": author})
    out["ideas"] = out["ideas"][:limit]

    for r, loc in db.query(Room, Location).join(Location, Location.id == Room.location_id).order_by(Location.sort, Room.sort):
        if (r.name_de or r.name_en) and _matches(words, r.name_de, r.name_en, r.department or "", r.equipment_de,
                                                 r.equipment_en, r.email, r.type):
            out["rooms"].append({"id": r.id, "type": r.type, "name_de": r.name_de, "name_en": r.name_en,
                                 "capacity": r.capacity, "email": r.email, "department": r.department,
                                 "location_id": loc.id, "location_de": loc.name_de, "location_en": loc.name_en})
    out["rooms"] = out["rooms"][:limit]

    out["links"] = [{"id": x.id, "title_de": x.title_de, "title_en": x.title_en, "subtitle_de": x.subtitle_de,
                     "subtitle_en": x.subtitle_en, "url": x.url, "icon": x.icon, "color": x.color}
                    for x in db.query(QuickLink).filter(QuickLink.active.is_(True)).order_by(QuickLink.sort)
                    if _matches(words, x.title_de, x.title_en, x.subtitle_de, x.subtitle_en, x.url)][:limit]

    from app.routers.polls import may_see
    for p in db.query(Poll).order_by(Poll.created_at.desc()):
        if may_see(p, viewer) and _matches(words, p.question_de, p.question_en, p.description_de, p.description_en, p.options):
            out["polls"].append({"id": p.id, "question_de": p.question_de, "question_en": p.question_en, "open": p.is_open()})
    out["polls"] = out["polls"][:limit]

    if viewer:  # trainings are never public: only the ones this person may open
        from app.routers.trainings import assigned_ids
        admin = has_perm(viewer, "trainings")
        for t in db.query(Training).options(selectinload(Training.targets)).order_by(Training.title_de):
            if not admin and not (t.active and (t.open_to_all or viewer.id in assigned_ids(db, t))):
                continue
            if _matches(words, t.title_de, t.title_en, plain(t.description_de), plain(t.description_en)):
                out["trainings"].append({"id": t.id, "title_de": t.title_de, "title_en": t.title_en,
                                         "active": t.active, "snippet": _snippet(words, t.description_de)})
        out["trainings"] = out["trainings"][:limit]
    return out
