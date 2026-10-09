# DevScribe : Developer Publishing & Knowledge Workspace

A full-stack developer blogging and technical publishing workspace built with **Python 3.11+**, **FastAPI**, **MongoDB (Motor async driver)**, **Pydantic v2**, **JWT + HTTP-Only Cookie Authentication**, and a **React + TypeScript + Vite + Tailwind CSS** frontend.

---

## 1. Project Overview & Features

DevScribe provides a unified engineering publication platform and author productivity workspace:

- **Role-Based & Resource-Based Access Control**:
  - **Public Readers**: Explore published technical articles, search by keyword, filter by category/tag/author, sort by Latest / Most Viewed / Most Liked, and inspect developer author portfolios.
  - **Authenticated Authors**: Access a personal analytics dashboard, write articles with live split-pane Markdown preview, save drafts, publish posts, edit/delete their own posts, like and bookmark articles, and customize their developer portfolio.
  - **Administrators**: Access platform-wide overview telemetry, manage user accounts (promote/demote `user` ↔ `admin`, activate/deactivate accounts), and moderate all blogs across the platform.
- **Automatic Unique SEO Slugs**: Converts titles such as `"Building REST APIs with FastAPI"` into `"building-rest-apis-with-fastapi"` with collision suffixes (`-2`, `-3`) when needed.
- **Optimistic UI & Instant Feedback**: Likes, bookmarks, status transitions, and destructive actions include toast notifications and confirmation modals.
- **Persistent Light & Dark Theme**: Neutral light mode default with a high-contrast dark slate workspace toggle.

---

## 2. Tech Stack

### Backend (`/backend`)
- **Python 3.11+**
- **FastAPI** + **Uvicorn**
- **MongoDB** + **Motor** (`AsyncIOMotorClient`)
- **Pydantic v2** & **Pydantic Settings**
- **PyJWT** & **bcrypt** password hashing
- **Pytest**, **pytest-asyncio**, **HTTPX**, **mongomock-motor**

### Frontend (`/src`)
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS**
- **React Router v7**
- **Axios** (centralized API service layer with automatic token refresh interceptor)
- **Lucide React** icons & **Recharts** analytics

---

## 3. Architecture & Folder Structure

```text
blog_crud/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                # FastAPI lifespan, CORS, exception handlers, routers
│   │   ├── core/
│   │   │   ├── config.py          # Pydantic Settings (.env loader)
│   │   │   ├── database.py        # Motor async MongoDB connection & index initialization
│   │   │   ├── security.py        # Bcrypt hashing & JWT access/refresh token signing
│   │   │   └── dependencies.py    # get_database, get_current_user, get_admin_user
│   │   ├── models/
│   │   │   ├── user.py            # User document builder & password-safe serializer
│   │   │   └── blog.py            # Blog document builder & read-time serializer
│   │   ├── schemas/
│   │   │   ├── auth.py            # RegisterRequest, LoginRequest, RefreshTokenRequest
│   │   │   ├── user.py            # UpdateProfileRequest, AdminRoleUpdateRequest
│   │   │   └── blog.py            # BlogCreateRequest, BlogUpdateRequest
│   │   ├── routers/
│   │   │   ├── auth.py            # /api/auth/* endpoints
│   │   │   ├── users.py           # /api/users/* endpoints
│   │   │   ├── blogs.py           # /api/blogs/* endpoints
│   │   │   └── admin.py           # /api/admin/* endpoints
│   │   ├── services/
│   │   │   ├── auth_service.py    # Registration, credential verification, token refresh
│   │   │   ├── user_service.py    # Author profile, dashboard stats, profile propagation
│   │   │   └── blog_service.py    # Paginated search/filter, ownership checks, likes/bookmarks
│   │   └── utils/
│   │       └── helpers.py         # Unique SEO slug generator & standardized API envelope
│   ├── tests/
│   │   ├── conftest.py            # Isolated async test DB fixture
│   │   ├── test_auth.py           # Registration, duplicate checks, login, invalid JWT tests
│   │   ├── test_blogs.py          # CRUD, ownership 403 checks, admin override, search/filter
│   │   └── test_users.py          # Admin RBAC & deactivated user 403 tests
│   ├── seed.py                    # Seeds 1 Admin, 2 Authors, and 9 technical blog posts
│   ├── .env.example
│   ├── requirements.txt
│   └── Dockerfile
├── src/
│   ├── components/                # Reusable UI kit, BlogCard, MarkdownRenderer, Navbar, Sidebar
│   ├── context/                   # AuthContext, ThemeContext, ToastContext
│   ├── hooks/                     # useDebounce, useDocumentMeta
│   ├── layouts/                   # PublicLayout, WorkspaceLayout
│   ├── pages/                     # Landing, Explore, BlogDetails, AuthorProfile, Dashboard, Editor, Admin
│   ├── services/                  # api.ts, authService.ts, blogService.ts, userService.ts, adminService.ts
│   ├── types/                     # Strict TypeScript interfaces
│   └── utils/                     # Date/number formatters & presets
├── server.ts                      # Integrated preview server with full REST API & Swagger /docs
├── docker-compose.yml
├── Dockerfile
└── package.json
```

---

## 4. MongoDB Collections & Indexes

- **`users`**: `_id`, `name`, `username` (unique index), `email` (unique index), `password_hash`, `avatar`, `bio`, `role` (`user` | `admin`), `is_active`, `social_links`, `created_at` (desc index), `updated_at`.
- **`blogs`**: `_id`, `title`, `slug` (unique index), `excerpt`, `content`, `cover_image`, `author_id` (index), `author_name`, `author_username`, `author_avatar`, `category` (index), `tags` (multikey index), `status` (`draft` | `published`), `views`, `likes_count`, `bookmarks_count`, `created_at` (desc index), `updated_at`, `published_at`.
- **`likes`**: `_id`, `user_id`, `blog_id` (compound unique index on `user_id + blog_id`), `created_at`.
- **`bookmarks`**: `_id`, `user_id`, `blog_id` (compound unique index on `user_id + blog_id`), `created_at`.

---

## 5. Environment Variables Configuration

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:
```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=blog_crud
JWT_SECRET=change-this-secret-in-production-min-32-chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
FRONTEND_URL=http://localhost:5173
```

### Frontend (`.env`)
Copy `.env.example` to `.env`:
```env
VITE_API_URL=http://localhost:8000/api
```

---

## 6. Exact Local Setup & Run Commands

### Backend Setup (FastAPI + MongoDB)
```bash
cd backend
python -m venv venv

# Activate virtual environment (Windows):
venv\Scripts\activate

# Activate virtual environment (macOS / Linux):
source venv/bin/activate

# Install dependencies:
pip install -r requirements.txt

# Seed development data (1 Admin, 2 Authors, 9 sample blog posts):
python seed.py

# Start FastAPI server with hot-reload:
uvicorn app.main:app --reload
```

### Frontend Setup (React + TypeScript + Vite)
```bash
# Install frontend packages:
npm install

# Start development server:
npm run dev

# Build production bundle:
npm run build
```

### Running Automated Backend Tests
```bash
cd backend
pytest
```

### Running with Docker Compose
```bash
docker compose up --build
```

---

## 7. Development Seed Credentials

When running `python seed.py` (or in the pre-seeded preview environment), the following development accounts are available (development password: `DevScribe#2026`, or use the one-click buttons on `/login`):

| Role | Name | Username | Email |
| :--- | :--- | :--- | :--- |
| **Admin** | Elena Rostova | `elena_admin` | `elena@devscribe.dev` |
| **Author** | Alex Rivera | `alex_rivera` | `alex@devscribe.dev` |
| **Author** | Marcus Vance | `marcus_vance` | `marcus@devscribe.dev` |

---

## 8. API Endpoint Summary

Interactive OpenAPI documentation is served at **`/docs`** (Swagger UI) and **`/redoc`** (ReDoc).

### Authentication
- `POST /api/auth/register` — Register a new user account
- `POST /api/auth/login` — Authenticate with email/username & password
- `POST /api/auth/logout` — Clear HTTP-only authentication cookies
- `GET /api/auth/me` — Retrieve current authenticated user profile
- `POST /api/auth/refresh` — Rotate access & refresh JWT tokens

### Blogs
- `GET /api/blogs` — Paginated list with `page`, `limit`, `search`, `category`, `tag`, `author`, `sort`
- `POST /api/blogs` — Create a new blog post or draft
- `GET /api/blogs/my` — List current user's published & draft blogs
- `GET /api/blogs/slug/{slug}` — Fetch single blog by SEO slug
- `GET /api/blogs/{blog_id}` — Fetch single blog by ID
- `PUT /api/blogs/{blog_id}` — Update blog (Author ownership or Admin verified)
- `DELETE /api/blogs/{blog_id}` — Delete blog (Author ownership or Admin verified)
- `GET /api/blogs/category/{category}` — Filter published blogs by category
- `GET /api/blogs/tag/{tag}` — Filter published blogs by tag
- `POST /api/blogs/{blog_id}/like` & `DELETE /api/blogs/{blog_id}/like` — Toggle article like
- `POST /api/blogs/{blog_id}/bookmark` & `DELETE /api/blogs/{blog_id}/bookmark` — Toggle article bookmark

### Users & Workspace
- `GET /api/users/dashboard` — Fetch personalized author metrics and recent posts
- `GET /api/users/bookmarks` — List bookmarked articles
- `PUT /api/users/profile` — Update display name, bio, avatar, and social links
- `GET /api/users/profile/{username}` — Public developer portfolio and published posts

### Admin
- `GET /api/admin/stats` — Platform overview statistics
- `GET /api/admin/users` — Search and filter registered users
- `PATCH /api/admin/users/{user_id}/role` — Change user role (`user` | `admin`)
- `PATCH /api/admin/users/{user_id}/status` — Activate or deactivate user account
- `GET /api/admin/blogs` — List all platform blogs including drafts
- `DELETE /api/admin/blogs/{blog_id}` — Delete any blog post
