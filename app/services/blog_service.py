from datetime import datetime, timezone
import math
from typing import Any
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.blog import BlogStatus, build_blog_document, serialize_blog
from app.schemas.blog import BlogCreateRequest, BlogUpdateRequest
from app.utils.helpers import generate_unique_slug


async def enrich_blogs_with_interactions(
    db: AsyncIOMotorDatabase,
    blogs: list[dict[str, Any]],
    current_user: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    """Enrich serialized blogs with liked and bookmarked flags for the current user."""
    if not blogs:
        return []
    if not current_user:
        return [serialize_blog(b, is_liked=False, is_bookmarked=False) for b in blogs]

    user_id = str(current_user["_id"])
    blog_ids = [str(b["_id"]) for b in blogs]

    likes_cursor = db.likes.find({"user_id": user_id, "blog_id": {"$in": blog_ids}})
    bookmarks_cursor = db.bookmarks.find({"user_id": user_id, "blog_id": {"$in": blog_ids}})

    liked_set = {doc["blog_id"] async for doc in likes_cursor}
    bookmarked_set = {doc["blog_id"] async for doc in bookmarks_cursor}

    return [
        serialize_blog(
            b,
            is_liked=str(b["_id"]) in liked_set,
            is_bookmarked=str(b["_id"]) in bookmarked_set,
        )
        for b in blogs
    ]


async def create_new_blog(
    db: AsyncIOMotorDatabase,
    current_user: dict[str, Any],
    payload: BlogCreateRequest,
) -> dict[str, Any]:
    """Create a new blog post with an automatically generated unique SEO slug."""
    slug_source = payload.slug.strip() if payload.slug else payload.title
    unique_slug = await generate_unique_slug(db, slug_source)

    blog_doc = build_blog_document(
        title=payload.title,
        slug=unique_slug,
        excerpt=payload.excerpt,
        content=payload.content,
        cover_image=payload.cover_image,
        author_id=str(current_user["_id"]),
        author_name=current_user.get("name", ""),
        author_username=current_user.get("username", ""),
        author_avatar=current_user.get("avatar", ""),
        category=payload.category,
        tags=payload.tags,
        status=payload.status,
    )

    result = await db.blogs.insert_one(blog_doc)
    blog_doc["_id"] = result.inserted_id
    return serialize_blog(blog_doc)


async def list_blogs_paginated(
    db: AsyncIOMotorDatabase,
    page: int = 1,
    limit: int = 10,
    search: str | None = None,
    category: str | None = None,
    tag: str | None = None,
    author: str | None = None,
    status_filter: str | None = "published",
    sort: str = "latest",
    current_user: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Query blogs with pagination, search, category/tag/author filtering, and sorting."""
    query: dict[str, Any] = {}

    if status_filter and status_filter != "all":
        query["status"] = status_filter

    if category and category.lower() != "all":
        query["category"] = {"$regex": f"^{category.strip()}$", "$options": "i"}

    if tag:
        query["tags"] = tag.strip().lower()

    if author:
        query["$or"] = [
            {"author_id": author.strip()},
            {"author_username": author.strip().lower()},
        ]

    if search and search.strip():
        escaped = search.strip()
        search_condition = [
            {"title": {"$regex": escaped, "$options": "i"}},
            {"excerpt": {"$regex": escaped, "$options": "i"}},
            {"content": {"$regex": escaped, "$options": "i"}},
            {"tags": {"$regex": escaped, "$options": "i"}},
            {"category": {"$regex": escaped, "$options": "i"}},
            {"author_name": {"$regex": escaped, "$options": "i"}},
        ]
        if "$or" in query:
            query = {"$and": [{"$or": query.pop("$or")}, {"$or": search_condition}, query]}
        else:
            query["$or"] = search_condition

    sort_field = [("created_at", -1)]
    if sort == "views" or sort == "most_viewed":
        sort_field = [("views", -1), ("created_at", -1)]
    elif sort == "likes" or sort == "most_liked":
        sort_field = [("likes_count", -1), ("created_at", -1)]
    elif sort == "oldest":
        sort_field = [("created_at", 1)]

    total = await db.blogs.count_documents(query)
    pages = max(1, math.ceil(total / limit))
    skip = (page - 1) * limit

    cursor = db.blogs.find(query).sort(sort_field).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    items = await enrich_blogs_with_interactions(db, docs, current_user)

    return {
        "items": items,
        "page": page,
        "limit": limit,
        "total": total,
        "pages": pages,
    }


async def get_blog_by_id_or_slug(
    db: AsyncIOMotorDatabase,
    identifier: str,
    by_slug: bool = False,
    increment_views: bool = True,
    current_user: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Retrieve a single blog post by ID or slug and enforce draft visibility rules."""
    if by_slug:
        blog = await db.blogs.find_one({"slug": identifier})
    else:
        if not ObjectId.is_valid(identifier):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Blog not found.",
            )
        blog = await db.blogs.find_one({"_id": ObjectId(identifier)})

    if not blog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog not found.",
        )

    # Draft visibility enforcement: only the author or an admin may view a draft
    if blog.get("status") == BlogStatus.DRAFT.value:
        is_owner = current_user and str(current_user["_id"]) == str(blog.get("author_id"))
        is_admin = current_user and current_user.get("role") == "admin"
        if not (is_owner or is_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this draft.",
            )

    if increment_views and blog.get("status") == BlogStatus.PUBLISHED.value:
        await db.blogs.update_one({"_id": blog["_id"]}, {"$inc": {"views": 1}})
        blog["views"] = int(blog.get("views", 0)) + 1

    enriched = await enrich_blogs_with_interactions(db, [blog], current_user)
    return enriched[0]


async def update_existing_blog(
    db: AsyncIOMotorDatabase,
    blog_id: str,
    current_user: dict[str, Any],
    payload: BlogUpdateRequest,
) -> dict[str, Any]:
    """Update a blog post after verifying resource ownership or admin privileges."""
    if not ObjectId.is_valid(blog_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog not found.",
        )

    blog = await db.blogs.find_one({"_id": ObjectId(blog_id)})
    if not blog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog not found.",
        )

    is_owner = str(blog.get("author_id")) == str(current_user["_id"])
    is_admin = current_user.get("role") == "admin"
    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to update another user's blog post.",
        )

    now = datetime.now(timezone.utc)
    updates: dict[str, Any] = {"updated_at": now}

    if payload.title is not None:
        updates["title"] = payload.title.strip()
        if payload.slug is None:
            updates["slug"] = await generate_unique_slug(
                db, payload.title, exclude_blog_id=blog["_id"]
            )

    if payload.slug is not None and payload.slug.strip():
        updates["slug"] = await generate_unique_slug(
            db, payload.slug.strip(), exclude_blog_id=blog["_id"]
        )

    if payload.excerpt is not None:
        updates["excerpt"] = payload.excerpt.strip()
    if payload.content is not None:
        updates["content"] = payload.content
    if payload.cover_image is not None:
        updates["cover_image"] = payload.cover_image
    if payload.category is not None:
        updates["category"] = payload.category.strip()
    if payload.tags is not None:
        updates["tags"] = [t.strip().lower() for t in payload.tags if t.strip()]
    if payload.status is not None:
        updates["status"] = payload.status
        if payload.status == BlogStatus.PUBLISHED.value and not blog.get("published_at"):
            updates["published_at"] = now

    await db.blogs.update_one({"_id": blog["_id"]}, {"$set": updates})
    updated = await db.blogs.find_one({"_id": blog["_id"]})
    enriched = await enrich_blogs_with_interactions(db, [updated], current_user)
    return enriched[0]


async def delete_existing_blog(
    db: AsyncIOMotorDatabase,
    blog_id: str,
    current_user: dict[str, Any],
) -> None:
    """Delete a blog post after verifying author ownership or admin role."""
    if not ObjectId.is_valid(blog_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog not found.",
        )

    blog = await db.blogs.find_one({"_id": ObjectId(blog_id)})
    if not blog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog not found.",
        )

    is_owner = str(blog.get("author_id")) == str(current_user["_id"])
    is_admin = current_user.get("role") == "admin"
    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete another user's blog post.",
        )

    await db.blogs.delete_one({"_id": blog["_id"]})
    await db.likes.delete_many({"blog_id": str(blog["_id"])})
    await db.bookmarks.delete_many({"blog_id": str(blog["_id"])})


async def toggle_blog_like(
    db: AsyncIOMotorDatabase,
    blog_id: str,
    current_user: dict[str, Any],
    like: bool = True,
) -> dict[str, Any]:
    """Like or unlike a blog post and synchronize likes_count."""
    if not ObjectId.is_valid(blog_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog not found.")

    blog = await db.blogs.find_one({"_id": ObjectId(blog_id)})
    if not blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog not found.")

    user_id = str(current_user["_id"])
    existing = await db.likes.find_one({"user_id": user_id, "blog_id": blog_id})

    if like and not existing:
        await db.likes.insert_one(
            {
                "user_id": user_id,
                "blog_id": blog_id,
                "created_at": datetime.now(timezone.utc),
            }
        )
    elif not like and existing:
        await db.likes.delete_one({"_id": existing["_id"]})

    likes_count = await db.likes.count_documents({"blog_id": blog_id})
    await db.blogs.update_one({"_id": ObjectId(blog_id)}, {"$set": {"likes_count": likes_count}})
    updated = await db.blogs.find_one({"_id": ObjectId(blog_id)})
    enriched = await enrich_blogs_with_interactions(db, [updated], current_user)
    return enriched[0]


async def toggle_blog_bookmark(
    db: AsyncIOMotorDatabase,
    blog_id: str,
    current_user: dict[str, Any],
    bookmark: bool = True,
) -> dict[str, Any]:
    """Bookmark or remove bookmark on a blog post and synchronize bookmarks_count."""
    if not ObjectId.is_valid(blog_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog not found.")

    blog = await db.blogs.find_one({"_id": ObjectId(blog_id)})
    if not blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog not found.")

    user_id = str(current_user["_id"])
    existing = await db.bookmarks.find_one({"user_id": user_id, "blog_id": blog_id})

    if bookmark and not existing:
        await db.bookmarks.insert_one(
            {
                "user_id": user_id,
                "blog_id": blog_id,
                "created_at": datetime.now(timezone.utc),
            }
        )
    elif not bookmark and existing:
        await db.bookmarks.delete_one({"_id": existing["_id"]})

    bookmarks_count = await db.bookmarks.count_documents({"blog_id": blog_id})
    await db.blogs.update_one(
        {"_id": ObjectId(blog_id)},
        {"$set": {"bookmarks_count": bookmarks_count}},
    )
    updated = await db.blogs.find_one({"_id": ObjectId(blog_id)})
    enriched = await enrich_blogs_with_interactions(db, [updated], current_user)
    return enriched[0]
