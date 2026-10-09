from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.config import settings
from app.core.database import get_database
from app.core.dependencies import get_current_user
from app.models.user import serialize_user
from app.schemas.auth import LoginRequest, RefreshTokenRequest, RegisterRequest
from app.services.auth_service import (
    authenticate_user,
    refresh_user_tokens,
    register_user,
)
from app.utils.helpers import api_response

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Attach HTTP-only access and refresh token cookies to the response."""
    secure_cookie = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=secure_cookie,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=secure_cookie,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/",
    )


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register_endpoint(
    payload: RegisterRequest,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    result = await register_user(db, payload)
    set_auth_cookies(response, result["access_token"], result["refresh_token"])
    return api_response(
        success=True,
        message="Account registered successfully.",
        data=result,
    )


@router.post(
    "/login",
    status_code=status.HTTP_200_OK,
    summary="Authenticate user with email or username",
)
async def login_endpoint(
    payload: LoginRequest,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    result = await authenticate_user(db, payload)
    set_auth_cookies(response, result["access_token"], result["refresh_token"])
    return api_response(
        success=True,
        message="Logged in successfully.",
        data=result,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Clear authentication session cookies",
)
async def logout_endpoint(response: Response) -> dict[str, Any]:
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return api_response(
        success=True,
        message="Logged out successfully.",
    )


@router.get(
    "/me",
    status_code=status.HTTP_200_OK,
    summary="Fetch currently authenticated user profile",
)
async def get_me_endpoint(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return api_response(
        success=True,
        message="Authenticated user profile retrieved.",
        data=serialize_user(current_user),
    )


@router.post(
    "/refresh",
    status_code=status.HTTP_200_OK,
    summary="Refresh access and refresh JWT tokens",
)
async def refresh_endpoint(
    request: Request,
    response: Response,
    payload: RefreshTokenRequest | None = None,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    token = (payload.refresh_token if payload and payload.refresh_token else None) or request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing.",
        )

    result = await refresh_user_tokens(db, token)
    set_auth_cookies(response, result["access_token"], result["refresh_token"])
    return api_response(
        success=True,
        message="Session token refreshed successfully.",
        data=result,
    )
