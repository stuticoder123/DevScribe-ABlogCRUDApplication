from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING
from app.core.config import settings


class DatabaseManager:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


db_manager = DatabaseManager()


async def connect_to_mongo() -> None:
    """Connect to MongoDB and initialize required indexes."""
    db_manager.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db_manager.db = db_manager.client[settings.DATABASE_NAME]
    await init_indexes(db_manager.db)


async def close_mongo_connection() -> None:
    """Close MongoDB connection cleanly on shutdown."""
    if db_manager.client is not None:
        db_manager.client.close()


async def init_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create indexes for users, blogs, likes, and bookmarks collections."""
    # Users indexes
    await db.users.create_index([("email", ASCENDING)], unique=True, name="idx_users_email")
    await db.users.create_index([("username", ASCENDING)], unique=True, name="idx_users_username")
    await db.users.create_index([("created_at", DESCENDING)], name="idx_users_created_at")

    # Blogs indexes
    await db.blogs.create_index([("slug", ASCENDING)], unique=True, name="idx_blogs_slug")
    await db.blogs.create_index([("author_id", ASCENDING)], name="idx_blogs_author_id")
    await db.blogs.create_index([("category", ASCENDING)], name="idx_blogs_category")
    await db.blogs.create_index([("tags", ASCENDING)], name="idx_blogs_tags")
    await db.blogs.create_index([("created_at", DESCENDING)], name="idx_blogs_created_at")
    await db.blogs.create_index([("status", ASCENDING)], name="idx_blogs_status")

    # Likes and Bookmarks compound unique indexes
    await db.likes.create_index(
        [("user_id", ASCENDING), ("blog_id", ASCENDING)],
        unique=True,
        name="idx_likes_user_blog",
    )
    await db.bookmarks.create_index(
        [("user_id", ASCENDING), ("blog_id", ASCENDING)],
        unique=True,
        name="idx_bookmarks_user_blog",
    )


def get_database() -> AsyncIOMotorDatabase:
    """Dependency injection getter for the active MongoDB database instance."""
    if db_manager.db is None:
        raise RuntimeError("Database connection has not been initialized.")
    return db_manager.db
