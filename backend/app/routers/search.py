"""One search over everything a visitor may see: people, articles, events, documents, board notices,
ideas, rooms, quick links, polls and – for signed-in people – their trainings.

Candidates come from the full-text index (``app.search_index``, SQLite FTS5 with trigrams): only those rows are
loaded, matched once more in Python (also for words too short for the index) and filtered by the permission
rules. A SQLite without FTS5 falls back to matching every row in Python - SQLite's ``ILIKE`` only folds ASCII
case, so "schröder", "yilmaz" (for "Yılmaz") or "strasse" would not be found. Every word of the query must occur
somewhere in the item ("Mehmet Yılmaz" works too); a part of a word is enough ("strasse" finds "Gewerbestraße")."""
import logging

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import false
from sqlalchemy.orm import Session, joinedload, selectinload

from app import search_index
from app.db import get_db
from app.models import Article, Attachment, Classified, Idea, Location, Poll, QuickLink, Room, Training, User
from app.routers.content import _visible, live_for
from app.schemas import ArticleCard
from app.security import has_perm, reader
from app.serialize import user_out
from app.textutil import fold, matches, plain, snippet

log = logging.getLogger("lotse.search")
router = APIRouter(prefix="/api/search", tags=["search"])
GROUPS = ("people", "articles", "documents", "classifieds", "ideas", "rooms", "links", "trainings", "polls")


def _narrow(query, column, ids):
    """Index mode: only the candidate rows. Python mode (ids is None): every row, matched afterwards."""
    if ids is None:
        return query
    return query.filter(column.in_(ids)) if ids else query.filter(false())


@router.get("")
def search(q: str = Query("", max_length=200), limit: int = Query(30, ge=1, le=100),
           viewer: User | None = Depends(reader), db: Session = Depends(get_db)):
    words = [w for w in fold(q).split() if w]
    out = {k: [] for k in GROUPS}
    if not words:
        return out
    cands = None
    if search_index.can_answer(words):
        try:
            cands = search_index.candidates(db, words, per_kind=limit * 3)
        except Exception:  # noqa: BLE001 - a broken index must never break the search
            log.exception("search index failed - matching in Python")
            cands = None
    ids_of = (lambda kind: None) if cands is None else (lambda kind: cands.get(kind, []))
    hit = lambda *fields: matches(words, *fields)  # noqa: E731 - on the candidates only (or on every row without the index)

    staff = _narrow(db.query(User).filter(User.is_active.is_(True), User.show_in_directory.is_(True)), User.id, ids_of("person"))
    full = has_perm(viewer, "people")
    out["people"] = [user_out(u, full=full) for u in staff.order_by(User.last_name, User.first_name).all()
                     if hit(u.first_name, u.last_name, u.department, u.position, u.email, u.phone_ext,
                            u.seat.label if u.seat else "")][:limit]

    for a in _narrow(_visible(db.query(Article), viewer), Article.id, ids_of("article")).order_by(Article.published_at.desc()).all():
        if hit(a.title_de, a.title_en, a.summary_de, a.summary_en, plain(a.body_de), plain(a.body_en), a.event_location):
            body = a.body_de if matches(words, plain(a.body_de)) else a.body_en
            card = ArticleCard.model_validate(a, from_attributes=True).model_dump()
            in_head = matches(words, a.title_de, a.title_en, a.summary_de, a.summary_en)
            card["snippet"] = "" if in_head else snippet(words, body)
            out["articles"].append(card)
    out["articles"] = out["articles"][:limit]

    docs = _narrow(db.query(Attachment, Article).join(Article, Article.id == Attachment.article_id)
                   .filter(Attachment.kind == "pdf", live_for(viewer)), Attachment.id, ids_of("document")).order_by(Attachment.name)
    out["documents"] = [{"id": d.id, "name": d.name, "url": d.url, "size": d.size, "article_id": art.id,
                         "article_title_de": art.title_de, "article_title_en": art.title_en, "category": art.category}
                        for d, art in docs.all() if hit(d.name, art.title_de, art.title_en)][:limit]

    notices = _narrow(db.query(Classified).options(joinedload(Classified.author)).filter(Classified.live()), Classified.id,
                      ids_of("classified")).order_by(Classified.created_at.desc())
    for c in notices:
        if hit(c.title, plain(c.body), c.price, c.author.full_name if c.author else ""):
            out["classifieds"].append({"id": c.id, "kind": c.kind, "title": c.title, "price": c.price,
                                       "image_url": c.image_url, "snippet": snippet(words, c.body),
                                       "author": c.author.full_name if c.author else ""})
    out["classifieds"] = out["classifieds"][:limit]

    for i in _narrow(db.query(Idea).options(joinedload(Idea.author)), Idea.id, ids_of("idea")).order_by(Idea.created_at.desc()):
        author = i.author.full_name if i.author and not i.anonymous else ""  # anonymous ideas stay anonymous
        if hit(i.title, plain(i.body), plain(i.response), author):
            out["ideas"].append({"id": i.id, "title": i.title, "status": i.status, "topic": i.topic,
                                 "snippet": snippet(words, i.body), "author": author})
    out["ideas"] = out["ideas"][:limit]

    rooms = _narrow(db.query(Room, Location).join(Location, Location.id == Room.location_id), Room.id, ids_of("room")).order_by(Location.sort, Room.sort)
    for r, loc in rooms:
        if (r.name_de or r.name_en) and hit(r.name_de, r.name_en, r.department or "", r.equipment_de, r.equipment_en, r.email, r.type):
            out["rooms"].append({"id": r.id, "type": r.type, "name_de": r.name_de, "name_en": r.name_en,
                                 "capacity": r.capacity, "email": r.email, "department": r.department,
                                 "location_id": loc.id, "location_de": loc.name_de, "location_en": loc.name_en})
    out["rooms"] = out["rooms"][:limit]

    links = _narrow(db.query(QuickLink).filter(QuickLink.active.is_(True)), QuickLink.id, ids_of("link")).order_by(QuickLink.sort)
    out["links"] = [{"id": x.id, "title_de": x.title_de, "title_en": x.title_en, "subtitle_de": x.subtitle_de,
                     "subtitle_en": x.subtitle_en, "url": x.url, "icon": x.icon, "color": x.color}
                    for x in links if hit(x.title_de, x.title_en, x.subtitle_de, x.subtitle_en, x.url)][:limit]

    from app.routers.polls import may_see
    for p in _narrow(db.query(Poll), Poll.id, ids_of("poll")).order_by(Poll.created_at.desc()):
        if may_see(p, viewer) and hit(p.question_de, p.question_en, p.description_de, p.description_en, p.options):
            out["polls"].append({"id": p.id, "question_de": p.question_de, "question_en": p.question_en, "open": p.is_open()})
    out["polls"] = out["polls"][:limit]

    if viewer:  # trainings are never public: only the ones this person may open
        from app.routers.trainings import assignment_map
        admin = has_perm(viewer, "trainings")
        rows = _narrow(db.query(Training).options(selectinload(Training.targets)), Training.id, ids_of("training")).order_by(Training.title_de).all()
        assigned = assignment_map(db, rows) if rows and not admin else {}
        for t in rows:
            if not admin and not (t.active and (t.open_to_all or viewer.id in assigned.get(t.id, set()))):
                continue
            if hit(t.title_de, t.title_en, plain(t.description_de), plain(t.description_en)):
                out["trainings"].append({"id": t.id, "title_de": t.title_de, "title_en": t.title_en,
                                         "active": t.active, "snippet": snippet(words, t.description_de)})
        out["trainings"] = out["trainings"][:limit]
    return out


class SearchLogIn(BaseModel):
    q: str = Field(max_length=200)
    hits: int = Field(ge=0, le=100000)


@router.post("/log", status_code=204)
def log_term(body: SearchLogIn, _: User | None = Depends(reader), db: Session = Depends(get_db)):
    """The browser reports a finished search (the results page, or a live search that found nothing) for the
    editors' statistics. Only the term and the counts are stored."""
    from app.routers.stats import log_search
    log_search(db, body.q, body.hits)
