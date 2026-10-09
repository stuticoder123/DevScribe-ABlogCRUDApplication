from typing import Any
from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_database
from app.core.dependencies import get_current_user, get_optional_user
from app.schemas.blog import BlogCreateRequest, BlogUpdateRequest
from app.services.blog_service import (
    create_new_blog,
    delete_existing_blog,
    get_blog_by_id_or_slug,
    list_blogs_paginated,
    toggle_blog_bookmark,
    toggle_blog_like,
    update_existing_blog,
)
from app.utils.helpers import api_response

router = APIRouter(prefix="/api/blogs", tags=["Blogs"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new blog post or draft",
)
async def create_blog_endpoint(
    payload: BlogCreateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    blog = await create_new_blog(db, current_user, payload)
    msg = (
        "Blog published successfully."
        if payload.status == "published"
        else "Draft saved successfully."
    )
    return api_response(success=True, message=msg, data=blog)


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    summary="List published blogs with pagination, search, filtering, and sorting",
)
async def get_blogs_endpoint(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    author: str | None = Query(default=None),
    sort: str = Query(default="latest"),
    current_user: dict[str, Any] | None = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    paginated = await list_blogs_paginated(
        db=db,
        page=page,
        limit=limit,
        search=search,
        category=category,
        tag=tag,
        author=author,
        status_filter="published",
        sort=sort,
        current_user=current_user,
    )
    return api_response(
        success=True,
        message="Blogs fetched successfully.",
        data=paginated,
    )


@router.get(
    "/my",
    status_code=status.HTTP_200_OK,
    summary="List authenticated user's own blogs (published and drafts)",
)
async def get_my_blogs_endpoint(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    status_filter: str = Query(default="all", alias="status"),
    sort: str = Query(default="latest"),
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    paginated = await list_blogs_paginated(
        db=db,
        page=page,
        limit=limit,
        search=search,
        category=category,
        author=str(current_user["_id"]),
        status_filter=status_filter,
        sort=sort,
        current_user=current_user,
    )
    return api_response(
        success=True,
        message="Author blogs fetched successfully.",
        data=paginated,
    )


@router.get(
    "/category/{category}",
    status_code=status.HTTP_200_OK,
    summary="List published blogs filtered by category",
)
async def get_blogs_by_category_endpoint(
    category: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    current_user: dict[str, Any] | None = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    paginated = await list_blogs_paginated(
        db=db,
        page=page,
        limit=limit,
        category=category,
        status_filter="published",
        current_user=current_user,
    )
    return api_response(
        success=True,
        message=f"Blogs in category '{category}' fetched successfully.",
        data=paginated,
    )


@router.get(
    "/tag/{tag}",
    status_code=status.HTTP_200_OK,
    summary="List published blogs filtered by tag",
)
async def get_blogs_by_tag_endpoint(
    tag: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    current_user: dict[str, Any] | None = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    paginated = await list_blogs_paginated(
        db=db,
        page=page,
        limit=limit,
        tag=tag,
        status_filter="published",
        current_user=current_user,
    )
    return api_response(
        success=True,
        message=f"Blogs tagged with '{tag}' fetched successfully.",
        data=paginated,
    )


@router.get(
    "/slug/{slug}",
    status_code=status.HTTP_200_OK,
    summary="Get a single blog post by SEO slug",
)
async def get_blog_by_slug_endpoint(
    slug: str,
    current_user: dict[str, Any] | None = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    blog = await get_blog_by_id_or_slug(
        db=db,
        identifier=slug,
        by_slug=True,
        increment_views=True,
        current_user=current_user,
    )
    return api_response(
        success=True,
        message="Blog fetched successfully.",
        data=blog,
    )


@router.get(
    "/{blog_id}",
    status_code=status.HTTP_200_OK,
    summary="Get a single blog post by ID",
)
async def get_blog_by_id_endpoint(
    blog_id: str,
    current_user: dict[str, Any] | None = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    blog = await get_blog_by_id_or_slug(
        db=db,
        identifier=blog_id,
        by_slug=False,
        increment_views=True,
        current_user=current_user,
    )
    return api_response(
        success=True,
        message="Blog fetched successfully.",
        data=blog,
    )


@router.put(
    "/{blog_id}",
    status_code=status.HTTP_200_OK,
    summary="Update a blog post (Author or Admin only)",
)
async def update_blog_endpoint(
    blog_id: str,
    payload: BlogUpdateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    blog = await update_existing_blog(db, blog_id, current_user, payload)
    return api_response(
        success=True,
        message="Blog updated successfully.",
        data=blog,
    )


@router.delete(
    "/{blog_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a blog post (Author or Admin only)",
)
async def delete_blog_endpoint(
    blog_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    await delete_existing_blog(db, blog_id, current_user)
    return api_response(
        success=True,
        message="Blog deleted successfully.",
    )


@router.post(
    "/{blog_id}/like",
    status_code=status.HTTP_200_OK,
    summary="Like a blog post",
)
async def like_blog_endpoint(
    blog_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    blog = await toggle_blog_like(db, blog_id, current_user, like=True)
    return api_response(
        success=True,
        message="Blog liked.",
        data=blog,
    )


@router.delete(
    "/{blog_id}/like",
    status_code=status.HTTP_200_OK,
    summary="Remove like from a blog post",
)
async def unlike_blog_endpoint(
    blog_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    blog = await toggle_blog_like(db, blog_id, current_user, like=False)
    return api_response(
        success=True,
        message="Like removed.",
        data=blog,
    )


@router.post(
    "/{blog_id}/bookmark",
    status_code=status.HTTP_200_OK,
    summary="Bookmark a blog post",
)
async def bookmark_blog_endpoint(
    blog_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    blog = await toggle_blog_bookmark(db, blog_id, current_user, bookmark=True)
    return api_response(
        success=True,
        message="Blog added to bookmarks.",
        data=blog,
    )


@router.delete(
    "/{blog_id}/bookmark",
    status_code=status.HTTP_200_OK,
    summary="Remove bookmark from a blog post",
)
async def unbookmark_blog_endpoint(
    blog_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    blog = await toggle_blog_bookmark(db, blog_id, current_user, bookmark=False)
    return api_response(
        success=True,
        message="Bookmark removed.",
        data=blog,
    )
