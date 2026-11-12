"""Editorial statistics: how often articles are opened and what people search for without finding anything.

Only counts are stored - per article and day, and per search term - never who read or searched what."""
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Article, ArticleView, SearchLog, User
from app.security import require_perm

router = APIRouter(prefix="/api/stats", tags=["stats"])
MAX_TERMS = 5000  # the search log never grows beyond this many distinct terms
MIN_TERM = 3


def count_view(db: Session, article_id: int) -> None:
    """One more opening of the article today."""
    today = date.today()
    row = db.get(ArticleView, (article_id, today))
    if row is None:
        db.add(ArticleView(article_id=article_id, day=today, count=1))
    else:
        row.count += 1
    db.commit()


def log_search(db: Session, query: str, hits: int) -> None:
    """Remember a search term and whether it found something."""
    term = " ".join((query or "").split()).casefold()[:100]
    if len(term) < MIN_TERM:
        return
    row = db.get(SearchLog, term)
    if row is None:
        if (db.query(func.count(SearchLog.query)).scalar() or 0) >= MAX_TERMS:
            return
        row = SearchLog(query=term, searches=0, misses=0)
        db.add(row)
    row.searches += 1
    row.last_hits = hits
    row.last_at = datetime.now()
    if hits == 0:
        row.misses += 1
    db.commit()


@router.get("/overview")
def overview(days: int = Query(30, ge=1, le=730), _: User = Depends(require_perm("content_all")), db: Session = Depends(get_db)):
    since = date.today() - timedelta(days=days - 1)
    period = {a: int(n) for a, n in db.query(ArticleView.article_id, func.sum(ArticleView.count))
              .filter(ArticleView.day >= since).group_by(ArticleView.article_id)}
    total = {a: int(n) for a, n in db.query(ArticleView.article_id, func.sum(ArticleView.count)).group_by(ArticleView.article_id)}
    articles = db.query(Article).filter(Article.id.in_(list(total))).all() if total else []
    rows = [{"id": a.id, "title_de": a.title_de, "title_en": a.title_en, "category": a.category, "published_at": a.published_at,
             "views_period": period.get(a.id, 0), "views_total": total.get(a.id, 0)} for a in articles]
    rows.sort(key=lambda r: (-r["views_period"], -r["views_total"], r["title_de"]))
    by_day = [{"day": d, "count": int(n)} for d, n in db.query(ArticleView.day, func.sum(ArticleView.count))
              .filter(ArticleView.day >= since).group_by(ArticleView.day).order_by(ArticleView.day)]
    misses = (db.query(SearchLog).filter(SearchLog.last_hits == 0, SearchLog.misses > 0)
              .order_by(SearchLog.misses.desc(), SearchLog.last_at.desc()).limit(50).all())
    top = db.query(SearchLog).order_by(SearchLog.searches.desc(), SearchLog.last_at.desc()).limit(30).all()
    term = lambda s: {"query": s.query, "searches": s.searches, "misses": s.misses, "last_hits": s.last_hits, "last_at": s.last_at}  # noqa: E731
    return {
        "days": days, "since": since,
        "views_period": sum(period.values()), "views_total": sum(total.values()),
        "searches_total": int(db.query(func.sum(SearchLog.searches)).scalar() or 0),
        "articles": rows[:50], "by_day": by_day, "misses": [term(s) for s in misses], "top_searches": [term(s) for s in top],
    }
