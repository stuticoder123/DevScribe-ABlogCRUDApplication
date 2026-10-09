from datetime import datetime, timezone
from enum import Enum
from typing import Any


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


def build_user_document(
    name: str,
    username: str,
    email: str,
    password_hash: str,
    avatar: str = "",
    bio: str = "",
    role: str = UserRole.USER.value,
    is_active: bool = True,
    social_links: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Construct a canonical MongoDB user document."""
    now = datetime.now(timezone.utc)
    return {
        "name": name.strip(),
        "username": username.strip().lower(),
        "email": email.strip().lower(),
        "password_hash": password_hash,
        "avatar": avatar,
        "bio": bio,
        "role": role,
        "is_active": is_active,
        "social_links": social_links or {"github": "", "website": "", "x": ""},
        "created_at": now,
        "updated_at": now,
    }


def serialize_user(user: dict[str, Any]) -> dict[str, Any]:
    """Serialize a MongoDB user document while stripping password_hash."""
    created_at = user.get("created_at")
    updated_at = user.get("updated_at")
    return {
        "id": str(user["_id"]),
        "name": user.get("name", ""),
        "username": user.get("username", ""),
        "email": user.get("email", ""),
        "avatar": user.get("avatar", ""),
        "bio": user.get("bio", ""),
        "role": user.get("role", UserRole.USER.value),
        "is_active": user.get("is_active", True),
        "social_links": user.get("social_links", {"github": "", "website": "", "x": ""}),
        "created_at": created_at.isoformat() if isinstance(created_at, datetime) else str(created_at),
        "updated_at": updated_at.isoformat() if isinstance(updated_at, datetime) else str(updated_at),
    }
