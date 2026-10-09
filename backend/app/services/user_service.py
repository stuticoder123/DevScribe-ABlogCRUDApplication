from datetime import datetime, timezone
from typing import Any
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.blog import serialize_blog
from app.models.user import serialize_user
from app.schemas.user import UpdateProfileRequest


async def get_author_profile_by_username(
    db: AsyncIOMotorDatabase,
    username: str,
) -> dict[str, Any]:
    """Fetch public author profile along with published blogs and aggregate metrics."""
    user = await db.users.find_one({"username": username.strip().lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Author profile not found.",
        )

    user_id_str = str(user["_id"])
    cursor = db.blogs.find(
        {"author_id": user_id_str, "status": "published"}
    ).sort("created_at", -1)
    blogs = await cursor.to_list(length=50)

    total_views = sum(int(b.get("views", 0)) for b in blogs)
    total_likes = sum(int(b.get("likes_count", 0)) for b in blogs)
    categories = sorted(list({b.get("category", "General") for b in blogs}))

    profile = serialize_user(user)
    # Strip email on public profile responses for privacy if desired, or keep public profile metadata
    profile["stats"] = {
        "blog_count": len(blogs),
        "total_views": total_views,
        "total_likes": total_likes,
        "categories": categories,
    }
    profile["blogs"] = [serialize_blog(b) for b in blogs]
    return profile


async def update_user_profile(
    db: AsyncIOMotorDatabase,
    current_user: dict[str, Any],
    payload: UpdateProfileRequest,
) -> dict[str, Any]:
    """Update authenticated user's profile and propagate author details to their blogs."""
    updates: dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}

    if payload.name is not None:
        updates["name"] = payload.name.strip()
    if payload.bio is not None:
        updates["bio"] = payload.bio.strip()
    if payload.avatar is not None:
        updates["avatar"] = payload.avatar.strip()
    if payload.social_links is not None:
        updates["social_links"] = payload.social_links.model_dump()

    user_id = current_user["_id"]
    await db.users.update_one({"_id": user_id}, {"$set": updates})

    # Propagate author name/avatar changes to authored blogs
    blog_author_updates: dict[str, Any] = {}
    if "name" in updates:
        blog_author_updates["author_name"] = updates["name"]
    if "avatar" in updates:
        blog_author_updates["author_avatar"] = updates["avatar"]
    if blog_author_updates:
        await db.blogs.update_many(
            {"author_id": str(user_id)},
            {"$set": blog_author_updates},
        )

    updated_user = await db.users.find_one({"_id": user_id})
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return serialize_user(updated_user)


async def get_user_dashboard_stats(
    db: AsyncIOMotorDatabase,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    """Calculate workspace analytics and recent posts for the authenticated user."""
    user_id = str(current_user["_id"])
    all_user_blogs = await db.blogs.find({"author_id": user_id}).sort("updated_at", -1).to_list(length=200)
    bookmarks_count = await db.bookmarks.count_documents({"user_id": user_id})

    published_blogs = [b for b in all_user_blogs if b.get("status") == "published"]
    draft_blogs = [b for b in all_user_blogs if b.get("status") == "draft"]
    total_views = sum(int(b.get("views", 0)) for b in all_user_blogs)
    total_likes = sum(int(b.get("likes_count", 0)) for b in all_user_blogs)

    return {
        "total_blogs": len(all_user_blogs),
        "published_blogs": len(published_blogs),
        "draft_blogs": len(draft_blogs),
        "total_views": total_views,
        "total_likes": total_likes,
        "bookmarks_count": bookmarks_count,
        "recent_posts": [serialize_blog(b) for b in all_user_blogs[:5]],
    }
