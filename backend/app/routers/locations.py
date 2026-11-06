from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models import Location, Room, Seat, User
from app.schemas import LocationIn, LocationOut, RoomIn, RoomOut, SeatIn, SeatOut
from app.security import reader, require_perm
from app.uploads import save_image

router = APIRouter(prefix="/api/locations", tags=["locations"])


def _location(db: Session, location_id: int) -> Location:
    loc = db.get(Location, location_id)
    if not loc:
        raise HTTPException(404, "Location not found")
    return loc


@router.get("", response_model=list[LocationOut])
def list_locations(_: User | None = Depends(reader), db: Session = Depends(get_db)):
    return (db.query(Location)
            .options(selectinload(Location.seats).selectinload(Seat.occupant), selectinload(Location.rooms))
            .order_by(Location.sort, Location.id).all())


@router.post("", response_model=LocationOut, status_code=201)
def create_location(body: LocationIn, _: User = Depends(require_perm("locations")), db: Session = Depends(get_db)):
    loc = Location(**body.model_dump())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@router.put("/{location_id}", response_model=LocationOut)
def update_location(location_id: int, body: LocationIn, _: User = Depends(require_perm("locations")),
                    db: Session = Depends(get_db)):
    loc = _location(db, location_id)
    for key, value in body.model_dump().items():
        setattr(loc, key, value)
    db.commit()
    db.refresh(loc)
    return loc


@router.delete("/{location_id}", status_code=204)
def delete_location(location_id: int, _: User = Depends(require_perm("locations")), db: Session = Depends(get_db)):
    db.delete(_location(db, location_id))
    db.commit()


@router.post("/{location_id}/plan", response_model=LocationOut)
async def upload_plan(location_id: int, file: UploadFile = File(...), ratio: float = Form(...),
                      _: User = Depends(require_perm("locations")), db: Session = Depends(get_db)):
    """Upload a floor plan image (PNG/JPG/SVG); ``ratio`` = height / width, measured by the browser."""
    loc = _location(db, location_id)
    loc.plan_url = await save_image(file, "plan", allow_svg=True)
    loc.plan_ratio = max(0.1, min(ratio, 4))
    db.commit()
    db.refresh(loc)
    return loc


@router.post("/{location_id}/seats", response_model=SeatOut, status_code=201)
def add_seat(location_id: int, body: SeatIn, _: User = Depends(require_perm("locations")), db: Session = Depends(get_db)):
    _location(db, location_id)
    seat = Seat(location_id=location_id, **body.model_dump())
    db.add(seat)
    db.commit()
    db.refresh(seat)
    return seat


@router.put("/seats/{seat_id}", response_model=SeatOut)
def update_seat(seat_id: int, body: SeatIn, _: User = Depends(require_perm("locations")), db: Session = Depends(get_db)):
    seat = db.get(Seat, seat_id)
    if not seat:
        raise HTTPException(404, "Seat not found")
    for key, value in body.model_dump().items():
        setattr(seat, key, value)
    db.commit()
    db.refresh(seat)
    return seat


@router.delete("/seats/{seat_id}", status_code=204)
def delete_seat(seat_id: int, _: User = Depends(require_perm("locations")), db: Session = Depends(get_db)):
    seat = db.get(Seat, seat_id)
    if not seat:
        raise HTTPException(404, "Seat not found")
    db.delete(seat)
    db.commit()


# --- Rooms (drawn by admins in the room editor) -------------------------------


def _clean_room(body: RoomIn) -> dict:
    data = body.model_dump()
    data["department"] = (data["department"] or "").strip() or None
    if data["type"] != "meeting":  # booking details only make sense for meeting rooms
        data.update(capacity=None, equipment_de="", equipment_en="", email="")
    return data


@router.post("/{location_id}/rooms", response_model=RoomOut, status_code=201)
def add_room(location_id: int, body: RoomIn, _: User = Depends(require_perm("locations")), db: Session = Depends(get_db)):
    _location(db, location_id)
    room = Room(location_id=location_id, **_clean_room(body))
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


@router.put("/rooms/{room_id}", response_model=RoomOut)
def update_room(room_id: int, body: RoomIn, _: User = Depends(require_perm("locations")), db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(404, "Room not found")
    for key, value in _clean_room(body).items():
        setattr(room, key, value)
    db.commit()
    db.refresh(room)
    return room


@router.delete("/rooms/{room_id}", status_code=204)
def delete_room(room_id: int, _: User = Depends(require_perm("locations")), db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(404, "Room not found")
    db.delete(room)
    db.commit()
