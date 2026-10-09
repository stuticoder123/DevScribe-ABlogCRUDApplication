import re
from typing import Any
from motor.motor_asyncio import AsyncIOMotorDatabase


def slugify(value: str) -> str:
    """Convert a blog title into a clean SEO-friendly URL slug."""
    cleaned = re.sub(r"[^a-zA-Z0-9\s-]", "", value.lower()).strip()
    slug = re.sub(r"[\s_-]+", "-", cleaned).strip("-")
    return slug or "untitled-post"


async def generate_unique_slug(
    db: AsyncIOMotorDatabase,
    title_or_slug: str,
    exclude_blog_id: Any = None,
) -> str:
    """Generate a unique slug in the blogs collection."""
    base_slug = slugify(title_or_slug)
    candidate = base_slug
    counter = 1

    while True:
        query: dict[str, Any] = {"slug": candidate}
        if exclude_blog_id is not None:
            query["_id"] = {"$ne": exclude_blog_id}
        existing = await db.blogs.find_one(query)
        if not existing:
            return candidate
        counter += 1
        candidate = f"{base_slug}-{counter}"


def api_response(
    success: bool,
    message: str,
    data: Any = None,
) -> dict[str, Any]:
    """Return a consistent API response envelope."""
    payload: dict[str, Any] = {
        "success": success,
        "message": message,
    }
    if data is not None:
        payload["data"] = data
    return payload
