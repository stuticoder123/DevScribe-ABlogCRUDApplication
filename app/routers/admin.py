from datetime import datetime, timezone
from typing import Any
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_database
from app.core.dependencies import get_admin_user
from app.models.user import serialize_user
from app.schemas.user import AdminRoleUpdateRequest, AdminStatusUpdateRequest
from app.services.blog_service import delete_existing_blog, list_blogs_paginated
from app.utils.helpers import api_response

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get(
    "/stats",
    status_code=status.HTTP_200_OK,
    summary="Get platform-wide overview metrics for Admin Dashboard",
)
async def admin_stats_endpoint(
    admin_user: dict[str, Any] = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"is_active": True})
    total_blogs = await db.blogs.count_documents({})
    published_blogs = await db.blogs.count_documents({"status": "published"})
    draft_blogs = await db.blogs.count_documents({"status": "draft"})

    return api_response(
        success=True,
        message="Admin statistics fetched successfully.",
        data={
            "total_users": total_users,
            "active_users": active_users,
            "total_blogs": total_blogs,
            "published_blogs": published_blogs,
            "draft_blogs": draft_blogs,
        },
    )


@router.get(
    "/users",
    status_code=status.HTTP_200_OK,
    summary="List all registered users (Admin only)",
)
async def admin_list_users_endpoint(
    search: str | None = Query(default=None),
    role: str | None = Query(default=None),
    admin_user: dict[str, Any] = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    query: dict[str, Any] = {}
    if role and role in ("user", "admin"):
        query["role"] = role
    if search and search.strip():
        escaped = search.strip()
        query["$or"] = [
            {"name": {"$regex": escaped, "$options": "i"}},
            {"username": {"$regex": escaped, "$options": "i"}},
            {"email": {"$regex": escaped, "$options": "i"}},
        ]

    users = await db.users.find(query).sort("created_at", -1).to_list(length=200)
    return api_response(
        success=True,
        message="Users fetched successfully.",
        data=[serialize_user(u) for u in users],
    )


@router.patch(
    "/users/{user_id}/role",
    status_code=status.HTTP_200_OK,
    summary="Change a user's role (Admin only)",
)
async def admin_change_role_endpoint(
    user_id: str,
    payload: AdminRoleUpdateRequest,
    admin_user: dict[str, Any] = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    target = await db.users.find_one({"_id": ObjectId(user_id)})
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": payload.role, "updated_at": datetime.now(timezone.utc)}},
    )
    updated = await db.users.find_one({"_id": ObjectId(user_id)})
    return api_response(
        success=True,
        message=f"User role updated to {payload.role}.",
        data=serialize_user(updated),
    )


@router.patch(
    "/users/{user_id}/status",
    status_code=status.HTTP_200_OK,
    summary="Activate or deactivate a user account (Admin only)",
)
async def admin_change_status_endpoint(
    user_id: str,
    payload: AdminStatusUpdateRequest,
    admin_user: dict[str, Any] = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if str(admin_user["_id"]) == user_id and not payload.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own active session account.",
        )

    target = await db.users.find_one({"_id": ObjectId(user_id)})
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": payload.is_active, "updated_at": datetime.now(timezone.utc)}},
    )
    updated = await db.users.find_one({"_id": ObjectId(user_id)})
    state_label = "activated" if payload.is_active else "deactivated"
    return api_response(
        success=True,
        message=f"User account {state_label} successfully.",
        data=serialize_user(updated),
    )


@router.get(
    "/blogs",
    status_code=status.HTTP_200_OK,
    summary="List all blogs including drafts across all authors (Admin only)",
)
async def admin_list_blogs_endpoint(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=100),
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    status_filter: str = Query(default="all", alias="status"),
    admin_user: dict[str, Any] = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    paginated = await list_blogs_paginated(
        db=db,
        page=page,
        limit=limit,
        search=search,
        category=category,
        status_filter=status_filter,
        sort="latest",
        current_user=admin_user,
    )
    return api_response(
        success=True,
        message="All platform blogs fetched successfully.",
        data=paginated,
    )


@router.delete(
    "/blogs/{blog_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete any blog post (Admin only)",
)
async def admin_delete_blog_endpoint(
    blog_id: str,
    admin_user: dict[str, Any] = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    await delete_existing_blog(db, blog_id, admin_user)
    return api_response(
        success=True,
        message="Blog deleted by administrator.",
    )
