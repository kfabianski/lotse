"""Event calendar: events are articles in the "events" category with an event date."""

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import Article, EventRsvp, User
from app.schemas import EventOut
from app.security import current_user, reader

router = APIRouter(prefix="/api/events", tags=["calendar"])


def _events(db: Session, start: datetime, end: datetime):
    return (db.query(Article)
            .filter(Article.live(), Article.category == "events",
                    Article.event_date >= start, Article.event_date < end)
            .order_by(Article.event_date).all())


def with_rsvps(db: Session, events: list[Article], viewer: User | None) -> list[dict]:
    ids = [e.id for e in events]
    if not ids:
        return []
    counts = dict(db.query(EventRsvp.article_id, func.count()).filter(EventRsvp.article_id.in_(ids))
                  .group_by(EventRsvp.article_id).all())
    mine = set()
    if viewer:
        mine = {a for (a,) in db.query(EventRsvp.article_id).filter(EventRsvp.article_id.in_(ids),
                                                                   EventRsvp.user_id == viewer.id)}
    preview: dict[int, list[User]] = {}
    for rsvp, user in (db.query(EventRsvp, User).join(User, User.id == EventRsvp.user_id)
                       .filter(EventRsvp.article_id.in_(ids), User.is_active.is_(True))
                       .order_by(EventRsvp.created_at)):
        preview.setdefault(rsvp.article_id, [])
        if len(preview[rsvp.article_id]) < 6:
            preview[rsvp.article_id].append(user)
    out = []
    for e in events:
        data = EventOut.model_validate(e, from_attributes=True).model_dump()
        data.update(attendees=counts.get(e.id, 0), going=e.id in mine,
                    attendee_preview=[{"id": u.id, "full_name": u.full_name, "department": u.department,
                                       "position": u.position, "avatar_url": u.avatar_url, "email": u.email,
                                       "phone_ext": u.phone_ext} for u in preview.get(e.id, [])])
        out.append(data)
    return out


@router.get("", response_model=list[EventOut])
def list_events(
    start: date = Query(..., alias="from"),
    end: date = Query(..., alias="to"),
    order: str = Query("asc", pattern="^(asc|desc)$"),
    viewer: User | None = Depends(reader),
    db: Session = Depends(get_db),
):
    end = min(end, start + timedelta(days=800))  # bounded range
    events = _events(db, datetime.combine(start, datetime.min.time()), datetime.combine(end, datetime.min.time()))
    if order == "desc":
        events.reverse()
    return with_rsvps(db, events, viewer)


def _ics_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


@router.get(".ics", include_in_schema=False)
def ical_feed(lang: str = "de", _: User | None = Depends(reader), db: Session = Depends(get_db)):
    """Subscribable iCalendar feed (Outlook / Google / Apple) for the next 12 months and last 30 days."""
    now = datetime.now()
    stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lotse Intranet//DE", "CALSCALE:GREGORIAN",
             f"X-WR-CALNAME:{_ics_text(settings.company_name)}"]
    for a in _events(db, now - timedelta(days=30), now + timedelta(days=365)):
        title = (a.title_en if lang == "en" and a.title_en else a.title_de)
        summary = (a.summary_en if lang == "en" and a.summary_en else a.summary_de)
        lines += ["BEGIN:VEVENT", f"UID:lotse-event-{a.id}@intranet", f"DTSTAMP:{stamp}",
                  f"DTSTART:{a.event_date:%Y%m%dT%H%M%S}",
                  f"DTEND:{a.event_date + timedelta(hours=2):%Y%m%dT%H%M%S}",
                  f"SUMMARY:{_ics_text(title)}", f"DESCRIPTION:{_ics_text(summary)}",
                  f"LOCATION:{_ics_text(a.event_location)}", "END:VEVENT"]
    lines.append("END:VCALENDAR")
    return Response("\r\n".join(lines) + "\r\n", media_type="text/calendar; charset=utf-8",
                    headers={"Content-Disposition": 'inline; filename="termine.ics"'})


@router.get("/holidays")
def public_holidays(start: date = Query(..., alias="from"), end: date = Query(..., alias="to"),
                    _: User | None = Depends(reader)):
    """Public holidays (DE/AT/CH, as configured) between from and to; available for last year up to +10 years."""
    from app.public_holidays import between
    end = min(end, start + timedelta(days=800))
    return between(settings.holiday_regions, start, end)


@router.get("/holiday-regions")
def holiday_regions(_: User | None = Depends(reader)):
    """States/cantons that can be chosen in the admin settings."""
    from app.public_holidays import regions
    return regions()


@router.get("/{article_id}", response_model=EventOut)
def get_event(article_id: int, viewer: User | None = Depends(reader), db: Session = Depends(get_db)):
    event = db.get(Article, article_id)
    if not event or event.category != "events" or not event.published or event.scheduled:
        raise HTTPException(404, "Event not found")
    return with_rsvps(db, [event], viewer)[0]


@router.post("/{article_id}/rsvp", response_model=EventOut)
def toggle_rsvp(article_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Sign up for an event, or cancel the sign-up. Past events can't be joined."""
    event = db.get(Article, article_id)
    if not event or event.category != "events" or not event.published or event.scheduled or not event.event_date:
        raise HTTPException(404, "Event not found")
    rsvp = db.get(EventRsvp, (article_id, user.id))
    if rsvp:
        db.delete(rsvp)
    else:
        if event.event_date < datetime.now() - timedelta(hours=6):
            raise HTTPException(400, "This event is over")
        db.add(EventRsvp(article_id=article_id, user_id=user.id))
    db.commit()
    return with_rsvps(db, [event], user)[0]


