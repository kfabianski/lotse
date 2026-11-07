from app.models import User
from app.security import extra_permissions, permissions_of


def seat_ref(user: User):
    seat = user.seat
    if not seat:
        return None
    return {"id": seat.id, "label": seat.label, "location_id": seat.location_id,
            "location_code": seat.location.code, "x": seat.x, "y": seat.y}


def _branch_name(user: User) -> str:
    from sqlalchemy.orm import object_session

    from app.models import Branch
    db = object_session(user)
    b = db.get(Branch, user.branch_id) if (db is not None and user.branch_id) else None
    return b.name if b else ""


def user_out(user: User, full: bool = False) -> dict:
    """``full``: include role-related details (for the person themselves and for admins)."""
    return {
        # Login names, roles and account type only for the person and for people/admins (no target list for attackers).
        "id": user.id, "username": user.username if full else "", "email": user.email, "role": user.role if full else "user",
        "auth_source": user.auth_source if full else "", "first_name": user.first_name, "last_name": user.last_name,
        "full_name": user.full_name, "department": user.department, "position": user.position,
        "phone_ext": user.phone_ext, "avatar_url": user.avatar_url, "start_date": user.start_date,
        "language": user.language, "is_active": user.is_active,
        "show_in_directory": user.show_in_directory, "seat": seat_ref(user), "manager_id": user.manager_id, "branch_id": user.branch_id,
        "branch": _branch_name(user),
        "permissions": extra_permissions(user) if full else [],
        "effective_permissions": sorted(permissions_of(user)) if full else [],
        "notify_articles": bool(user.notify_articles) if full else None,
        "notify_ideas": bool(user.notify_ideas) if full else None,
        "color_scheme": user.color_scheme if full else None,
    }
