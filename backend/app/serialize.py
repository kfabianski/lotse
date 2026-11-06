from app.models import User


def seat_ref(user: User):
    seat = user.seat
    if not seat:
        return None
    return {"id": seat.id, "label": seat.label, "location_id": seat.location_id,
            "location_code": seat.location.code, "x": seat.x, "y": seat.y}


def user_out(user: User) -> dict:
    return {
        "id": user.id, "username": user.username, "email": user.email, "role": user.role,
        "auth_source": user.auth_source, "first_name": user.first_name, "last_name": user.last_name,
        "full_name": user.full_name, "department": user.department, "position": user.position,
        "phone_ext": user.phone_ext, "avatar_url": user.avatar_url, "start_date": user.start_date,
        "language": user.language, "is_active": user.is_active,
        "show_in_directory": user.show_in_directory, "seat": seat_ref(user),
    }
