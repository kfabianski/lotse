from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models import Idea, IdeaVote, User
from app.schemas import IdeaIn, IdeaOut, IdeaRateIn, IdeaStatusIn
from app.security import current_user, has_perm, reader, require_perm

router = APIRouter(prefix="/api/ideas", tags=["ideas"])


# Ranking for "best rated": a Bayesian average pulls ideas with few ratings towards a neutral 3 stars,
# so one single 5-star rating does not beat 4.6 stars from fifteen colleagues.
PRIOR_COUNT, PRIOR_MEAN = 3, 3.0


def idea_out(idea: Idea, viewer: User | None, count: int, total: int, my_stars: int | None) -> dict:
    # Anonymous ideas have no author stored at all, so they are never "mine" and never show a name.
    mine = bool(viewer and idea.author_id is not None and viewer.id == idea.author_id)
    show_author = not idea.anonymous and idea.author is not None
    return {
        "id": idea.id, "title": idea.title, "body": idea.body, "topic": idea.topic, "status": idea.status,
        "response": idea.response, "anonymous": idea.anonymous,
        "author": idea.author if show_author else None,
        "created_at": idea.created_at, "status_changed_at": idea.status_changed_at,
        "rating_count": count, "rating_avg": round(total / count, 1) if count else None,
        "my_rating": my_stars, "mine": mine,
    }


def list_ideas(db: Session, viewer: User | None, status: str = "", sort: str = "top", limit: int = 200) -> list[dict]:
    stats = (db.query(IdeaVote.idea_id, func.count().label("n"), func.sum(IdeaVote.stars).label("total"))
             .group_by(IdeaVote.idea_id).subquery())
    n = func.coalesce(stats.c.n, 0)
    total = func.coalesce(stats.c.total, 0)
    query = (db.query(Idea, n, total)
             .outerjoin(stats, stats.c.idea_id == Idea.id)
             .options(joinedload(Idea.author)))
    if status:
        query = query.filter(Idea.status == status)
    if sort == "top":
        score = (total + PRIOR_COUNT * PRIOR_MEAN) / (n + PRIOR_COUNT)
        query = query.order_by(score.desc(), n.desc(), Idea.created_at.desc())
    else:
        query = query.order_by(Idea.created_at.desc())
    rows = query.limit(limit).all()
    mine = {}
    if viewer:
        mine = dict(db.query(IdeaVote.idea_id, IdeaVote.stars).filter(IdeaVote.user_id == viewer.id).all())
    return [idea_out(i, viewer, c, t, mine.get(i.id)) for i, c, t in rows]


def _one(db: Session, idea_id: int, viewer: User | None) -> dict:
    idea = db.get(Idea, idea_id)
    if not idea:
        raise HTTPException(404, "Idea not found")
    count, total = db.query(func.count(), func.coalesce(func.sum(IdeaVote.stars), 0)).filter(IdeaVote.idea_id == idea_id).one()
    own = viewer and db.get(IdeaVote, (idea_id, viewer.id))
    return idea_out(idea, viewer, count, total, own.stars if own else None)


@router.get("", response_model=list[IdeaOut])
def get_ideas(status: str = "", sort: str = Query("top", pattern="^(top|new)$"),
              viewer: User | None = Depends(reader), db: Session = Depends(get_db)):
    return list_ideas(db, viewer, status, sort)


@router.post("", response_model=IdeaOut, status_code=201)
def create_idea(body: IdeaIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    # Anonymous: the author is deliberately not stored (sign-in is only required to prevent spam).
    idea = Idea(**body.model_dump(), author_id=None if body.anonymous else user.id)
    db.add(idea)
    db.commit()
    return _one(db, idea.id, user)


@router.post("/{idea_id}/rate", response_model=IdeaOut)
def rate_idea(idea_id: int, body: IdeaRateIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Give 1-5 stars (again = change), or 0 to take the rating back. Not allowed for your own idea."""
    idea = db.get(Idea, idea_id)
    if not idea:
        raise HTTPException(404, "Idea not found")
    if idea.author_id == user.id:
        raise HTTPException(400, "You cannot rate your own idea")
    rating = db.get(IdeaVote, (idea_id, user.id))
    if body.stars == 0:
        if rating:
            db.delete(rating)
    elif rating:
        rating.stars = body.stars
    else:
        db.add(IdeaVote(idea_id=idea_id, user_id=user.id, stars=body.stars))
    db.commit()
    return _one(db, idea_id, user)


@router.patch("/{idea_id}/status", response_model=IdeaOut)
def set_status(idea_id: int, body: IdeaStatusIn, editor: User = Depends(require_perm("moderate")),
               db: Session = Depends(get_db)):
    idea = db.get(Idea, idea_id)
    if not idea:
        raise HTTPException(404, "Idea not found")
    if idea.status != body.status:
        idea.status_changed_at = datetime.utcnow()
    idea.status = body.status
    idea.response = body.response
    db.commit()
    return _one(db, idea_id, editor)


@router.delete("/{idea_id}", status_code=204)
def delete_idea(idea_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    idea = db.get(Idea, idea_id)
    if not idea:
        raise HTTPException(404, "Idea not found")
    is_author = idea.author_id is not None and idea.author_id == user.id
    if not is_author and not has_perm(user, "moderate"):
        raise HTTPException(403, "Only the author or an editor can remove this idea")
    db.delete(idea)
    db.commit()
