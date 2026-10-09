from typing import Any
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import UserRole, build_user_document, serialize_user
from app.schemas.auth import LoginRequest, RegisterRequest


async def register_user(
    db: AsyncIOMotorDatabase,
    payload: RegisterRequest,
) -> dict[str, Any]:
    """Register a new user after checking for duplicate email and username."""
    email_lower = payload.email.strip().lower()
    username_lower = payload.username.strip().lower()

    existing_email = await db.users.find_one({"email": email_lower})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    existing_username = await db.users.find_one({"username": username_lower})
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This username is already taken.",
        )

    password_hashed = hash_password(payload.password)
    user_doc = build_user_document(
        name=payload.name,
        username=username_lower,
        email=email_lower,
        password_hash=password_hashed,
        role=UserRole.USER.value,
    )

    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    user_id = str(result.inserted_id)
    access_token = create_access_token(subject=user_id, role=user_doc["role"])
    refresh_token = create_refresh_token(subject=user_id, role=user_doc["role"])

    return {
        "user": serialize_user(user_doc),
        "access_token": access_token,
        "refresh_token": refresh_token,
    }


async def authenticate_user(
    db: AsyncIOMotorDatabase,
    payload: LoginRequest,
) -> dict[str, Any]:
    """Verify credentials by email or username and return tokens + user profile."""
    identifier = payload.identifier.strip().lower()
    user = await db.users.find_one(
        {"$or": [{"email": identifier}, {"username": identifier}]}
    )

    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password.",
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Contact an administrator.",
        )

    user_id = str(user["_id"])
    role = user.get("role", UserRole.USER.value)
    access_token = create_access_token(subject=user_id, role=role)
    refresh_token = create_refresh_token(subject=user_id, role=role)

    return {
        "user": serialize_user(user),
        "access_token": access_token,
        "refresh_token": refresh_token,
    }


async def refresh_user_tokens(
    db: AsyncIOMotorDatabase,
    refresh_token: str,
) -> dict[str, Any]:
    """Validate refresh token and issue new access and refresh tokens."""
    decoded = decode_token(refresh_token, expected_type="refresh")
    user_id = decoded.get("sub")
    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token subject.",
        )

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user or not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive.",
        )

    role = user.get("role", UserRole.USER.value)
    new_access = create_access_token(subject=user_id, role=role)
    new_refresh = create_refresh_token(subject=user_id, role=role)

    return {
        "user": serialize_user(user),
        "access_token": new_access,
        "refresh_token": new_refresh,
    }
