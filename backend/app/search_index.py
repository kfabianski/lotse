"""Full-text index for the search (SQLite FTS5).

Instead of loading every article, person and notice on each keystroke and matching in Python, the search asks
one FTS5 table ``search_fts`` for candidates and only then loads those rows and applies the permission rules.
The index holds the folded text (accents removed, ß → ss) and a second column with ae/oe/ue collapsed, so
"Schroeder", "schröder" and "schroder" all find the same person. The trigram tokenizer matches parts of words,
which German compounds need: "strasse" finds "Gewerbestraße", "halle" finds "Lagerhalle". Words shorter than three
characters cannot be asked of the index; the search then checks them in Python on the candidate rows.

The index is rebuilt lazily: any ORM change to a searchable model marks it dirty, the next search rebuilds it
(a few thousand rows take well under a second). SQLite builds without FTS5 or without the trigram tokenizer
(older than 3.34) fall back to the Python matcher over all rows."""
import json
import logging
import threading

from sqlalchemy import event, text
from sqlalchemy.orm import Session, joinedload

from app.db import SessionLocal, engine
from app.models import Article, Attachment, Classified, Idea, Location, Poll, QuickLink, Room, Seat, Training, User
from app.textutil import collapse, fold, plain

log = logging.getLogger("lotse.search")
available = False
_dirty = True
_lock = threading.Lock()
WATCHED = (Article, Attachment, Classified, Idea, Location, Poll, QuickLink, Room, Seat, Training, User)
KINDS = ("person", "article", "document", "classified", "idea", "room", "link", "poll", "training")
MIN_WORD = 3  # the trigram tokenizer cannot answer shorter words
DDL = "CREATE VIRTUAL TABLE search_fts USING fts5(kind UNINDEXED, ref UNINDEXED, text, alt, tokenize = 'trigram')"


def setup() -> bool:
    """Create the FTS table once (recreated when an older version used another tokenizer); False when this SQLite
    has no FTS5 or no trigram tokenizer."""
    global available
    try:
        with engine.begin() as conn:
            existing = conn.execute(text("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'search_fts'")).scalar()
            if existing and "trigram" not in existing:
                conn.execute(text("DROP TABLE search_fts"))
                existing = None
            if not existing:
                conn.execute(text(DDL))
        available = True
    except Exception as exc:  # noqa: BLE001 - old SQLite without FTS5 / trigram
        log.warning("FTS5 trigram index is not available (%s) - the search matches in Python", exc)
        available = False
    return available


def mark_dirty() -> None:
    global _dirty
    _dirty = True


@event.listens_for(SessionLocal, "after_flush")
def _after_flush(session, _ctx) -> None:
    if not _dirty and any(isinstance(o, WATCHED) for o in (*session.new, *session.dirty, *session.deleted)):
        mark_dirty()


@event.listens_for(SessionLocal, "after_bulk_update")
@event.listens_for(SessionLocal, "after_bulk_delete")
def _after_bulk(_ctx) -> None:
    mark_dirty()


def _rows(db: Session) -> list[tuple[str, int, str]]:
    out: list[tuple[str, int, str]] = []
    j = lambda *parts: " ".join(p for p in parts if p)  # noqa: E731
    for u in db.query(User).options(joinedload(User.seat)).filter(User.is_active.is_(True), User.show_in_directory.is_(True)):
        out.append(("person", u.id, j(u.first_name, u.last_name, u.department, u.position, u.email, u.phone_ext, u.seat.label if u.seat else "")))
    for a in db.query(Article):  # drafts included - the permission rules decide at query time
        out.append(("article", a.id, j(a.title_de, a.title_en, a.summary_de, a.summary_en, plain(a.body_de), plain(a.body_en), a.event_location)))
    for att, art in db.query(Attachment, Article).join(Article, Article.id == Attachment.article_id).filter(Attachment.kind == "pdf"):
        out.append(("document", att.id, j(att.name, art.title_de, art.title_en)))
    for c in db.query(Classified).options(joinedload(Classified.author)):
        out.append(("classified", c.id, j(c.title, plain(c.body), c.price, c.author.full_name if c.author else "")))
    for i in db.query(Idea).options(joinedload(Idea.author)):
        author = i.author.full_name if i.author and not i.anonymous else ""
        out.append(("idea", i.id, j(i.title, plain(i.body), plain(i.response), author)))
    for r in db.query(Room):
        if r.name_de or r.name_en:
            out.append(("room", r.id, j(r.name_de, r.name_en, r.department or "", r.equipment_de, r.equipment_en, r.email, r.type)))
    for x in db.query(QuickLink).filter(QuickLink.active.is_(True)):
        out.append(("link", x.id, j(x.title_de, x.title_en, x.subtitle_de, x.subtitle_en, x.url)))
    for p in db.query(Poll):
        try:
            options = " ".join(j(o.get("de", ""), o.get("en", "")) for o in json.loads(p.options or "[]"))
        except (ValueError, AttributeError):
            options = ""
        out.append(("poll", p.id, j(p.question_de, p.question_en, p.description_de, p.description_en, options)))
    for t in db.query(Training):
        out.append(("training", t.id, j(t.title_de, t.title_en, plain(t.description_de), plain(t.description_en))))
    return out


def rebuild(db: Session) -> int:
    rows = _rows(db)
    conn = db.connection()
    conn.execute(text("DELETE FROM search_fts"))
    if rows:
        folded = [fold(t) for _, _, t in rows]
        conn.execute(text("INSERT INTO search_fts (kind, ref, text, alt) VALUES (:k, :r, :t, :a)"),
                     [{"k": k, "r": r, "t": f, "a": collapse(f)} for (k, r, _), f in zip(rows, folded)])
    db.commit()
    return len(rows)


def ensure_fresh(db: Session) -> None:
    global _dirty
    if not _dirty:
        return
    with _lock:
        if _dirty:
            n = rebuild(db)
            _dirty = False
            log.info("search index rebuilt: %d entries", n)


def _query(words: list[str]) -> str:
    """FTS5 query: every word (as a substring) in the folded text or, with ae/oe/ue collapsed, in the alt column."""
    parts = []
    for w in words:
        w = w.replace('"', "").strip()
        if len(w) >= MIN_WORD:
            parts.append(f'(text : "{w}" OR alt : "{collapse(w)}")')
    return " AND ".join(parts)


def can_answer(words: list[str]) -> bool:
    """At least one word is long enough for the index; shorter words are checked in Python afterwards."""
    return available and any(len(w) >= MIN_WORD for w in words)


def candidates(db: Session, words: list[str], per_kind: int) -> dict[str, list[int]]:
    """Ids per kind whose text contains every (long enough) word, best matches first."""
    ensure_fresh(db)
    q = _query(words)
    out: dict[str, list[int]] = {k: [] for k in KINDS}
    if not q:
        return out
    rows = db.execute(text("SELECT kind, ref FROM search_fts WHERE search_fts MATCH :q ORDER BY rank LIMIT 3000"), {"q": q})
    for kind, ref in rows:
        bucket = out.setdefault(kind, [])
        if len(bucket) < per_kind:
            bucket.append(int(ref))
    return out
