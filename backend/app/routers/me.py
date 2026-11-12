"""Personal start-page briefing: today's events I said yes to, my open mandatory trainings, news on my ideas."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models import Article, ArticleAck, Idea, Poll, PollVote, Training, User
from app.security import current_user

router = APIRouter(prefix="/api/me", tags=["me"])
IDEA_NEWS_DAYS = 30  # first visit: answers from the last 30 days count as new


@router.get("/briefing")
def briefing(user: User = Depends(current_user), db: Session = Depends(get_db)):
    from app.routers.trainings import _done, assignment_map
    now = datetime.now()
    start, end = now.replace(hour=0, minute=0, second=0, microsecond=0), now.replace(hour=23, minute=59, second=59)
    from app.routers.content import live_for
    events = (db.query(Article)
              .filter(Article.category == "events", live_for(user), Article.event_date >= start, Article.event_date <= end)
              .order_by(Article.event_date).all())
    trainings = []
    active = db.query(Training).filter(Training.active.is_(True)).options(selectinload(Training.targets)).all()
    assigned = assignment_map(db, active)
    for t in active:
        if user.id in assigned.get(t.id, set()) and not _done(db, t, user.id):
            trainings.append({"id": t.id, "title_de": t.title_de, "title_en": t.title_en, "due_date": t.due_date,
                              "overdue": bool(t.due_date and t.due_date < now.date())})
    trainings.sort(key=lambda x: (not x["overdue"], x["due_date"] or datetime.max.date()))
    since = user.ideas_seen_at or (datetime.utcnow() - timedelta(days=IDEA_NEWS_DAYS))
    ideas = (db.query(Idea).filter(Idea.author_id == user.id, Idea.status_changed_at.isnot(None),
                                   Idea.status_changed_at > since)
             .order_by(Idea.status_changed_at.desc()).all())
    voted = {pid for (pid,) in db.query(PollVote.poll_id).filter(PollVote.user_id == user.id)}
    from app.routers.polls import may_see
    polls = [p for p in db.query(Poll).order_by(Poll.created_at.desc()) if p.is_open() and p.id not in voted and may_see(p, user)]
    # articles that ask for "read and understood" and are still open for this person
    acked = {a for (a,) in db.query(ArticleAck.article_id).filter(ArticleAck.user_id == user.id)}
    acks = [a for a in db.query(Article).filter(Article.ack_required.is_(True), live_for(user)).order_by(Article.published_at.desc())
            if a.id not in acked]
    return {
        "acks_open": [{"id": a.id, "title_de": a.title_de, "title_en": a.title_en} for a in acks],
        "polls_open": [{"id": p.id, "question_de": p.question_de, "question_en": p.question_en} for p in polls],
        "events_today": [{"id": a.id, "title_de": a.title_de, "title_en": a.title_en, "event_date": a.event_date,
                          "event_location": a.event_location} for a in events],
        "trainings_open": trainings,
        "idea_news": [{"id": i.id, "title": i.title, "status": i.status, "has_response": bool(i.response.strip())}
                      for i in ideas],
    }


@router.post("/ideas-seen", status_code=204)
def ideas_seen(user: User = Depends(current_user), db: Session = Depends(get_db)):
    user.ideas_seen_at = datetime.utcnow()
    db.commit()
