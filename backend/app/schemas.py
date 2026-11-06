from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Role = Literal["admin", "editor", "user"]
Category = Literal["news", "events", "people", "products", "rules", "safety", "cyber", "knowhow"]
ClassifiedKind = Literal["offer", "search", "give", "carpool", "other"]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class SeatRef(ORM):
    id: int
    label: str
    location_id: int
    location_code: str
    x: float
    y: float


class UserOut(ORM):
    id: int
    username: str
    email: str | None
    role: Role
    auth_source: str
    first_name: str
    last_name: str
    full_name: str
    department: str
    position: str
    phone_ext: str
    avatar_url: str | None
    start_date: date | None
    language: str
    is_active: bool
    show_in_directory: bool
    seat: SeatRef | None = None


class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=80, pattern=r"^[A-Za-z0-9._-]+$")
    password: str = Field(min_length=8)
    email: EmailStr | None = None
    role: Role = "user"
    first_name: str = ""
    last_name: str = ""
    department: str = ""
    position: str = ""
    phone_ext: str = ""
    start_date: date | None = None


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    role: Role | None = None
    first_name: str | None = None
    last_name: str | None = None
    department: str | None = None
    position: str | None = None
    phone_ext: str | None = None
    start_date: date | None = None
    is_active: bool | None = None
    show_in_directory: bool | None = None
    password: str | None = Field(default=None, min_length=8)
    seat_id: int | None = Field(default=None, description="0 clears the seat")


class MeUpdate(BaseModel):
    language: Literal["de", "en"] | None = None
    phone_ext: str | None = None
    current_password: str | None = None
    new_password: str | None = Field(default=None, min_length=8)


class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PersonBrief(ORM):
    id: int
    full_name: str
    department: str
    position: str
    avatar_url: str | None
    email: str | None
    phone_ext: str


class AttachmentIn(BaseModel):
    url: str = Field(pattern=r"^/uploads/[A-Za-z0-9._-]+$")
    name: str = Field(default="", max_length=200)
    kind: Literal["image", "pdf"]
    size: int = 0


class AttachmentOut(AttachmentIn, ORM):
    id: int


class ArticleIn(BaseModel):
    category: Category
    title_de: str = Field(min_length=1, max_length=200)
    title_en: str = ""
    summary_de: str = ""
    summary_en: str = ""
    body_de: str = ""
    body_en: str = ""
    image_url: str | None = None
    event_date: datetime | None = None
    event_location: str = ""
    featured: bool = False
    published: bool = True
    published_at: datetime | None = None  # None = now (new) / unchanged (edit)
    attachments: list[AttachmentIn] = []


class ArticleOut(ArticleIn, ORM):
    id: int
    published_at: datetime
    scheduled: bool = False
    created_at: datetime
    updated_at: datetime
    author: PersonBrief | None = None
    attachments: list[AttachmentOut] = []


class DocumentOut(BaseModel):
    id: int
    name: str
    url: str
    size: int
    article_id: int
    article_title_de: str
    article_title_en: str
    category: Category
    created_at: datetime
    published_at: datetime | None = None


class ArticleCard(ORM):
    id: int
    category: Category
    title_de: str
    title_en: str
    summary_de: str
    summary_en: str
    image_url: str | None
    event_date: datetime | None
    event_location: str
    featured: bool
    published: bool
    published_at: datetime
    scheduled: bool = False
    created_at: datetime
    photo_count: int = 0


class ClassifiedIn(BaseModel):
    kind: ClassifiedKind = "offer"
    title: str = Field(min_length=3, max_length=160)
    body: str = Field(default="", max_length=4000)
    price: str = Field(default="", max_length=40)
    image_url: str | None = None


class ClassifiedOut(ClassifiedIn, ORM):
    id: int
    created_at: datetime
    author: PersonBrief


class SeatOut(ORM):
    id: int
    label: str
    x: float
    y: float
    occupant: PersonBrief | None = None


RoomType = Literal["office", "meeting", "lead", "project", "reception", "kitchen", "wc", "storage", "corridor",
                   "stairs", "rack", "dock", "lane", "stock-office", "other"]


class RoomIn(BaseModel):
    type: RoomType = "office"
    name_de: str = Field(default="", max_length=80)
    name_en: str = Field(default="", max_length=80)
    department: str | None = Field(default=None, max_length=80)
    x: float = Field(ge=-1, le=101)
    y: float = Field(ge=-1, le=101)
    w: float = Field(gt=0.2, le=102)
    h: float = Field(gt=0.2, le=102)
    sort: int = 0
    capacity: int | None = Field(default=None, ge=1, le=500)
    equipment_de: str = Field(default="", max_length=200)
    equipment_en: str = Field(default="", max_length=200)
    email: str = Field(default="", max_length=120)


class RoomOut(RoomIn, ORM):
    id: int
    location_id: int


class LocationIn(BaseModel):
    code: str = Field(min_length=1, max_length=12)
    name_de: str
    name_en: str
    kind: Literal["floor", "warehouse"] = "floor"
    sort: int = 0
    plan_ratio: float = Field(default=0.5, gt=0.05, lt=5)


class LocationOut(LocationIn, ORM):
    id: int
    plan_url: str | None
    seats: list[SeatOut] = []
    rooms: list[RoomOut] = []


class SeatIn(BaseModel):
    label: str = Field(min_length=1, max_length=30)
    x: float = Field(ge=0, le=100)
    y: float = Field(ge=0, le=100)


class PhotoOut(BaseModel):
    id: int
    url: str
    name: str
    article_id: int
    article_title_de: str
    article_title_en: str
    event_date: datetime | None = None


class HomeOut(BaseModel):
    slides: list[ArticleCard]
    news: list[ArticleCard]
    events: list["EventOut"]
    recent: list[ArticleCard]
    new_people: list[PersonBrief]
    classifieds: list[ClassifiedOut]
    photos: list[PhotoOut] = []
    counts: dict[str, int]


IdeaTopic = Literal["process", "workplace", "it", "safety", "sustainability", "other"]
IdeaStatus = Literal["new", "review", "planned", "done", "declined"]


class IdeaIn(BaseModel):
    title: str = Field(min_length=5, max_length=160)
    body: str = Field(default="", max_length=6000)
    topic: IdeaTopic = "other"
    anonymous: bool = False


class IdeaStatusIn(BaseModel):
    status: IdeaStatus
    response: str = Field(default="", max_length=4000)


class IdeaOut(BaseModel):
    id: int
    title: str
    body: str
    topic: IdeaTopic
    status: IdeaStatus
    response: str
    anonymous: bool
    author: PersonBrief | None  # None when submitted anonymously (editors still see it)
    created_at: datetime
    status_changed_at: datetime | None
    rating_count: int
    rating_avg: float | None  # None while nobody has rated
    my_rating: int | None  # the viewer's own stars
    mine: bool


class IdeaRateIn(BaseModel):
    stars: int = Field(ge=0, le=5)  # 0 removes the viewer's rating



class EventOut(ArticleCard):
    attendees: int = 0
    going: bool = False
    attendee_preview: list[PersonBrief] = []


HomeOut.model_rebuild()
