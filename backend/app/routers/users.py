from typing import Any
from bson import ObjectId
from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_database
from app.core.dependencies import get_current_user
from app.schemas.user import UpdateProfileRequest
from app.services.blog_service import enrich_blogs_with_interactions
from app.services.user_service import (
    get_author_profile_by_username,
    get_user_dashboard_stats,
    update_user_profile,
)
from app.utils.helpers import api_response

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get(
    "/dashboard",
    status_code=status.HTTP_200_OK,
    summary="Fetch personalized author dashboard metrics and recent posts",
)
async def user_dashboard_endpoint(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    stats = await get_user_dashboard_stats(db, current_user)
    return api_response(
        success=True,
        message="Dashboard metrics fetched successfully.",
        data=stats,
    )


@router.get(
    "/bookmarks",
    status_code=status.HTTP_200_OK,
    summary="Fetch all bookmarked blog posts for the current user",
)
async def user_bookmarks_endpoint(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    user_id = str(current_user["_id"])
    bookmark_docs = await db.bookmarks.find({"user_id": user_id}).sort("created_at", -1).to_list(length=100)
    blog_object_ids = [
        ObjectId(doc["blog_id"])
        for doc in bookmark_docs
        if ObjectId.is_valid(doc.get("blog_id", ""))
    ]

    if not blog_object_ids:
        return api_response(
            success=True,
            message="Bookmarked blogs fetched successfully.",
            data=[],
        )

    blogs = await db.blogs.find({"_id": {"$in": blog_object_ids}}).to_list(length=100)
    enriched = await enrich_blogs_with_interactions(db, blogs, current_user)
    return api_response(
        success=True,
        message="Bookmarked blogs fetched successfully.",
        data=enriched,
    )


@router.put(
    "/profile",
    status_code=status.HTTP_200_OK,
    summary="Update authenticated user's profile settings",
)
async def update_profile_endpoint(
    payload: UpdateProfileRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    updated = await update_user_profile(db, current_user, payload)
    return api_response(
        success=True,
        message="Profile updated successfully.",
        data=updated,
    )


@router.get(
    "/profile/{username}",
    status_code=status.HTTP_200_OK,
    summary="Fetch public developer profile and published articles by username",
)
async def author_profile_endpoint(
    username: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    profile = await get_author_profile_by_username(db, username)
    return api_response(
        success=True,
        message="Author profile fetched successfully.",
        data=profile,
    )
