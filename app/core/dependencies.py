from typing import Any
from bson import ObjectId
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_database
from app.core.security import decode_token

security_scheme = HTTPBearer(auto_error=False)


def extract_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None,
) -> str | None:
    """Extract access token from Authorization Bearer header or HTTP-only cookie."""
    if credentials and credentials.credentials:
        return credentials.credentials
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
    return None


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    """Verify JWT access token and return active user document."""
    token = extract_token(request, credentials)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
        )

    payload = decode_token(token, expected_type="access")
    user_id = payload.get("sub")
    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identity in token.",
        )

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated.",
        )

    return user


async def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any] | None:
    """Return authenticated user if valid token is present, otherwise None."""
    token = extract_token(request, credentials)
    if not token:
        return None
    try:
        payload = decode_token(token, expected_type="access")
        user_id = payload.get("sub")
        if not user_id or not ObjectId.is_valid(user_id):
            return None
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user and user.get("is_active", True):
            return user
        return None
    except HTTPException:
        return None


async def get_admin_user(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Enforce admin role authorization."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required to perform this action.",
        )
    return current_user
