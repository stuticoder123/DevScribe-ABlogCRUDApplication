from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import close_mongo_connection, connect_to_mongo
from app.routers import admin, auth, blogs, users


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await connect_to_mongo()
    yield
    await close_mongo_connection()


openapi_tags = [
    {
        "name": "Authentication",
        "description": "User registration, login, session cookies, JWT refresh, and current user inspection.",
    },
    {
        "name": "Users",
        "description": "Developer profiles, profile customization, bookmarks, and workspace dashboard metrics.",
    },
    {
        "name": "Blogs",
        "description": "Full CRUD for articles and drafts, SEO slugs, search, filtering, pagination, likes, and bookmarks.",
    },
    {
        "name": "Admin",
        "description": "Role-based administration for platform metrics, user management, and content moderation.",
    },
]

app = FastAPI(
    title="DevScribe API",
    description="Production-grade Developer Publishing & Blogging Platform built with FastAPI and MongoDB.",
    version="1.0.0",
    openapi_tags=openapi_tags,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail if isinstance(exc.detail, str) else "Request failed.",
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = exc.errors()
    first_msg = "Validation error."
    if errors:
        field = ".".join(str(loc) for loc in errors[0].get("loc", []) if loc != "body")
        msg = errors[0].get("msg", "Invalid input")
        first_msg = f"{field}: {msg}" if field else msg
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": first_msg,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "An unexpected internal server error occurred.",
        },
    )


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(blogs.router)
app.include_router(admin.router)


@app.get("/api/health", tags=["Health"])
async def health_check() -> dict[str, object]:
    return {
        "success": True,
        "message": "DevScribe FastAPI service is healthy.",
        "data": {"status": "ok"},
    }
