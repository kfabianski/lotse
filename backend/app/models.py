from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

ROLES = ("admin", "editor", "user")
CATEGORIES = ("news", "events", "people", "products", "rules", "safety", "cyber", "knowhow")
LOCATION_KINDS = ("floor", "warehouse")
CLASSIFIED_KINDS = ("offer", "search", "give", "carpool", "other")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(200))
    password_hash: Mapped[str | None] = mapped_column(String(200))  # None for LDAP accounts
    auth_source: Mapped[str] = mapped_column(String(10), default="local")  # local | ldap
    role: Mapped[str] = mapped_column(String(10), default="user")
    first_name: Mapped[str] = mapped_column(String(80), default="")
    last_name: Mapped[str] = mapped_column(String(80), default="")
    department: Mapped[str] = mapped_column(String(80), default="")
    position: Mapped[str] = mapped_column(String(120), default="")
    phone_ext: Mapped[str] = mapped_column(String(20), default="")
    avatar_url: Mapped[str | None] = mapped_column(String(300))
    start_date: Mapped[date | None] = mapped_column(Date)
    language: Mapped[str] = mapped_column(String(2), default="de")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    show_in_directory: Mapped[bool] = mapped_column(Boolean, default=True)
    seat_id: Mapped[int | None] = mapped_column(ForeignKey("seats.id", ondelete="SET NULL"), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    seat: Mapped["Seat | None"] = relationship(back_populates="occupant")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip() or self.username


class Location(Base):
    """A floor of the office building or a warehouse hall, with an optional plan image."""

    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(12))  # short label on the level switcher, e.g. "1. OG"
    name_de: Mapped[str] = mapped_column(String(80))
    name_en: Mapped[str] = mapped_column(String(80))
    kind: Mapped[str] = mapped_column(String(10), default="floor")
    sort: Mapped[int] = mapped_column(Integer, default=0)
    plan_url: Mapped[str | None] = mapped_column(String(300))
    plan_ratio: Mapped[float] = mapped_column(Float, default=0.5)  # height / width of the plan

    seats: Mapped[list["Seat"]] = relationship(back_populates="location", cascade="all, delete-orphan",
                                               order_by="Seat.label")
    rooms: Mapped[list["Room"]] = relationship(cascade="all, delete-orphan", order_by="Room.sort")


class Room(Base):
    """A room or zone drawn on a plan (office, meeting room, kitchen, rack ...).
    x/y/w/h are percentages of the plan's width/height, like seat positions."""

    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(16), default="office")
    name_de: Mapped[str] = mapped_column(String(80), default="")
    name_en: Mapped[str] = mapped_column(String(80), default="")
    department: Mapped[str | None] = mapped_column(String(80))  # colours the room in the department colour
    x: Mapped[float] = mapped_column(Float)
    y: Mapped[float] = mapped_column(Float)
    w: Mapped[float] = mapped_column(Float)
    h: Mapped[float] = mapped_column(Float)
    sort: Mapped[int] = mapped_column(Integer, default=0)
    # meeting rooms
    capacity: Mapped[int | None] = mapped_column(Integer)
    equipment_de: Mapped[str] = mapped_column(String(200), default="")
    equipment_en: Mapped[str] = mapped_column(String(200), default="")
    email: Mapped[str] = mapped_column(String(120), default="")


class Seat(Base):
    """A desk or workstation; x/y are percentages of the plan's width/height."""

    __tablename__ = "seats"

    id: Mapped[int] = mapped_column(primary_key=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(30))
    x: Mapped[float] = mapped_column(Float)
    y: Mapped[float] = mapped_column(Float)

    location: Mapped[Location] = relationship(back_populates="seats")
    occupant: Mapped[User | None] = relationship(back_populates="seat", uselist=False)


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(primary_key=True)
    category: Mapped[str] = mapped_column(String(12), index=True)
    title_de: Mapped[str] = mapped_column(String(200))
    title_en: Mapped[str] = mapped_column(String(200), default="")
    summary_de: Mapped[str] = mapped_column(Text, default="")
    summary_en: Mapped[str] = mapped_column(Text, default="")
    body_de: Mapped[str] = mapped_column(Text, default="")  # Markdown
    body_en: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str | None] = mapped_column(String(300))
    event_date: Mapped[datetime | None] = mapped_column(DateTime)
    event_location: Mapped[str] = mapped_column(String(120), default="")
    featured: Mapped[bool] = mapped_column(Boolean, default=False)  # shown in the home slider
    published: Mapped[bool] = mapped_column(Boolean, default=True)  # False = draft
    # Publication date (server local time). In the future = scheduled: invisible to readers until then.
    published_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    author: Mapped[User | None] = relationship()
    attachments: Mapped[list["Attachment"]] = relationship(cascade="all, delete-orphan", order_by="Attachment.sort")

    @property
    def scheduled(self) -> bool:
        return bool(self.published and self.published_at and self.published_at > datetime.now())

    @classmethod
    def live(cls):
        """SQL condition: visible to readers right now (published and publication date reached)."""
        return (cls.published.is_(True)) & (cls.published_at <= datetime.now())

    @property
    def photo_count(self) -> int:
        return sum(1 for a in self.attachments if a.kind == "image")


class Classified(Base):
    """A notice on the employee board (Pinnwand)."""

    __tablename__ = "classifieds"

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(10), default="offer")
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text, default="")
    price: Mapped[str] = mapped_column(String(40), default="")
    image_url: Mapped[str | None] = mapped_column(String(300))
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    author: Mapped[User] = relationship()


IDEA_TOPICS = ("process", "workplace", "it", "safety", "sustainability", "other")
IDEA_STATUSES = ("new", "review", "planned", "done", "declined")


class Idea(Base):
    """An employee's improvement idea (Ideenbox). Colleagues rate it with 1-5 stars; editors set the status."""

    __tablename__ = "ideas"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text, default="")
    topic: Mapped[str] = mapped_column(String(16), default="other")
    status: Mapped[str] = mapped_column(String(10), default="new", index=True)
    response: Mapped[str] = mapped_column(Text, default="")  # answer from the editors / management
    anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    status_changed_at: Mapped[datetime | None] = mapped_column(DateTime)

    author: Mapped[User] = relationship()
    votes: Mapped[list["IdeaVote"]] = relationship(cascade="all, delete-orphan")


class IdeaVote(Base):
    """One person's star rating (1-5) for an idea. Table name kept from the earlier up-vote version."""

    __tablename__ = "idea_votes"

    idea_id: Mapped[int] = mapped_column(ForeignKey("ideas.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    stars: Mapped[int] = mapped_column(Integer, default=5)


class AppSetting(Base):
    """Admin-editable setting (JSON value) that overrides the .env default."""

    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text)


class EventRsvp(Base):
    """'I'm in' for a company event (an article in the events category)."""

    __tablename__ = "event_rsvps"

    article_id: Mapped[int] = mapped_column(ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


DEFAULT_DEPARTMENTS = [  # name, colour – order is the display order
    ("Einkauf", "#d97706"), ("Verwaltung", "#64748b"), ("Finanzen", "#0891b2"), ("IT", "#3557f5"),
    ("Versand", "#e0484d"), ("Fulfillment", "#13995b"), ("Vertrieb", "#8b5cf6"),
]


class Department(Base):
    """Official department list; users reference it by name (LDAP delivers names too)."""

    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    color: Mapped[str] = mapped_column(String(9), default="#64748b")
    sort: Mapped[int] = mapped_column(Integer, default=0)
    source: Mapped[str] = mapped_column(String(8), default="manual")  # manual | ldap


class Attachment(Base):
    """Photo or PDF attached to an article (event gallery, policy document, ...)."""

    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(primary_key=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("articles.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(8))  # image | pdf
    url: Mapped[str] = mapped_column(String(300))
    name: Mapped[str] = mapped_column(String(200), default="")
    size: Mapped[int] = mapped_column(Integer, default=0)
    sort: Mapped[int] = mapped_column(Integer, default=0)
