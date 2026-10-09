from datetime import datetime, timezone
from enum import Enum
from typing import Any


class BlogStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


def build_blog_document(
    title: str,
    slug: str,
    excerpt: str,
    content: str,
    cover_image: str,
    author_id: str,
    author_name: str,
    author_username: str,
    author_avatar: str,
    category: str,
    tags: list[str],
    status: str = BlogStatus.DRAFT.value,
) -> dict[str, Any]:
    """Construct a canonical MongoDB blog document."""
    now = datetime.now(timezone.utc)
    published_at = now if status == BlogStatus.PUBLISHED.value else None
    return {
        "title": title.strip(),
        "slug": slug,
        "excerpt": excerpt.strip(),
        "content": content,
        "cover_image": cover_image,
        "author_id": author_id,
        "author_name": author_name,
        "author_username": author_username,
        "author_avatar": author_avatar,
        "category": category.strip(),
        "tags": [t.strip().lower() for t in tags if t.strip()],
        "status": status,
        "views": 0,
        "likes_count": 0,
        "bookmarks_count": 0,
        "created_at": now,
        "updated_at": now,
        "published_at": published_at,
    }


def serialize_blog(
    blog: dict[str, Any],
    is_liked: bool = False,
    is_bookmarked: bool = False,
) -> dict[str, Any]:
    """Serialize a MongoDB blog document with reading time and interaction state."""
    created_at = blog.get("created_at")
    updated_at = blog.get("updated_at")
    published_at = blog.get("published_at")
    content_text = blog.get("content", "")
    word_count = max(1, len(content_text.split()))
    read_time_minutes = max(1, round(word_count / 200))

    return {
        "id": str(blog["_id"]),
        "title": blog.get("title", ""),
        "slug": blog.get("slug", ""),
        "excerpt": blog.get("excerpt", ""),
        "content": content_text,
        "cover_image": blog.get("cover_image", ""),
        "author_id": str(blog.get("author_id", "")),
        "author_name": blog.get("author_name", ""),
        "author_username": blog.get("author_username", ""),
        "author_avatar": blog.get("author_avatar", ""),
        "category": blog.get("category", "General"),
        "tags": blog.get("tags", []),
        "status": blog.get("status", BlogStatus.DRAFT.value),
        "views": int(blog.get("views", 0)),
        "likes_count": int(blog.get("likes_count", 0)),
        "bookmarks_count": int(blog.get("bookmarks_count", 0)),
        "read_time": read_time_minutes,
        "is_liked": is_liked,
        "is_bookmarked": is_bookmarked,
        "created_at": created_at.isoformat() if isinstance(created_at, datetime) else str(created_at),
        "updated_at": updated_at.isoformat() if isinstance(updated_at, datetime) else str(updated_at),
        "published_at": (
            published_at.isoformat()
            if isinstance(published_at, datetime)
            else (str(published_at) if published_at else None)
        ),
    }
