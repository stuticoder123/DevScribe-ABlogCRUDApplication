import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'devscribe-jwt-secret-key-min-32-chars-2026';
const DATA_FILE = path.resolve(process.cwd(), '.devscribe_db.json');

// --- Types matching MongoDB collections ---
interface SocialLinks {
  github: string;
  website: string;
  x: string;
}

interface UserDoc {
  _id: string;
  name: string;
  username: string;
  email: string;
  password_hash: string;
  avatar: string;
  bio: string;
  role: 'user' | 'admin';
  is_active: boolean;
  social_links: SocialLinks;
  created_at: string;
  updated_at: string;
}

interface BlogDoc {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  author_id: string;
  author_name: string;
  author_username: string;
  author_avatar: string;
  category: string;
  tags: string[];
  status: 'draft' | 'published';
  views: number;
  likes_count: number;
  bookmarks_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

interface InteractionDoc {
  _id: string;
  user_id: string;
  blog_id: string;
  created_at: string;
}

interface DatabaseSchema {
  users: UserDoc[];
  blogs: BlogDoc[];
  likes: InteractionDoc[];
  bookmarks: InteractionDoc[];
}

// --- Password Hashing & JWT Security Helpers ---
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, key] = parts;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex'));
}

function signJwt(payload: Record<string, unknown>, expiresInSeconds: number): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };
  const encHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encHeader}.${encPayload}`)
    .digest('base64url');
  return `${encHeader}.${encPayload}.${signature}`;
}

function verifyJwt(token: string, expectedType: 'access' | 'refresh' = 'access'): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encHeader, encPayload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encHeader}.${encPayload}`)
      .digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(encPayload, 'base64url').toString('utf-8'));
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === 'number' && payload.exp < now) return null;
    if (payload.type !== expectedType) return null;
    return payload;
  } catch {
    return null;
  }
}

function createId(): string {
  return crypto.randomBytes(12).toString('hex');
}

function slugify(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'untitled-post';
}

function generateUniqueSlug(db: DatabaseSchema, titleOrSlug: string, excludeBlogId?: string): string {
  const base = slugify(titleOrSlug);
  let candidate = base;
  let counter = 1;
  while (db.blogs.some((b) => b.slug === candidate && b._id !== excludeBlogId)) {
    counter += 1;
    candidate = `${base}-${counter}`;
  }
  return candidate;
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = decodeURIComponent(pair.slice(idx + 1).trim());
      result[k] = v;
    }
  });
  return result;
}

// --- Initial Seed Data ---
function buildSeedDatabase(): DatabaseSchema {
  const defaultPasswordHash = hashPassword('DevScribe#2026');
  const now = Date.now();
  const daysAgo = (d: number) => new Date(now - d * 86400 * 1000).toISOString();

  const elenaId = '65f000000000000000000001';
  const alexId = '65f000000000000000000002';
  const marcusId = '65f000000000000000000003';

  const users: UserDoc[] = [
    {
      _id: elenaId,
      name: 'Elena Rostova',
      username: 'elena_admin',
      email: 'elena@devscribe.dev',
      password_hash: defaultPasswordHash,
      avatar: '/src/assets/images/avatar_elena_rostova_1791541078393.jpg',
      bio: 'Principal Distributed Systems Architect. Maintainer of open-source async Python tooling, high-density storage engines, and system telemetry platforms.',
      role: 'admin',
      is_active: true,
      social_links: {
        github: 'https://github.com/elena-rostova',
        website: 'https://elena.systems',
        x: 'https://x.com/elena_systems',
      },
      created_at: daysAgo(45),
      updated_at: daysAgo(2),
    },
    {
      _id: alexId,
      name: 'Alex Rivera',
      username: 'alex_rivera',
      email: 'alex@devscribe.dev',
      password_hash: defaultPasswordHash,
      avatar: '/src/assets/images/avatar_alex_rivera_1791541068236.jpg',
      bio: 'Lead Backend Engineer specializing in FastAPI, asynchronous Python runtimes, and MongoDB query optimization.',
      role: 'user',
      is_active: true,
      social_links: {
        github: 'https://github.com/alexrivera-dev',
        website: 'https://alexrivera.io',
        x: 'https://x.com/alexrivera_py',
      },
      created_at: daysAgo(38),
      updated_at: daysAgo(1),
    },
    {
      _id: marcusId,
      name: 'Marcus Vance',
      username: 'marcus_vance',
      email: 'marcus@devscribe.dev',
      password_hash: defaultPasswordHash,
      avatar: '/src/assets/images/avatar_alex_rivera_1791541068236.jpg',
      bio: 'Staff Frontend & Design Systems Engineer. Building zero-latency developer workspaces with React, TypeScript, and Vite.',
      role: 'user',
      is_active: true,
      social_links: {
        github: 'https://github.com/marcusvance',
        website: 'https://marcusvance.dev',
        x: 'https://x.com/mvance_ui',
      },
      created_at: daysAgo(30),
      updated_at: daysAgo(3),
    },
  ];

  const blogs: BlogDoc[] = [
    {
      _id: '65f100000000000000000001',
      title: 'Architecting High-Throughput REST APIs with FastAPI and Motor',
      slug: 'architecting-high-throughput-rest-apis-with-fastapi-and-motor',
      excerpt: 'A practical engineering guide to non-blocking I/O, connection pool sizing, and structured dependency injection for production Python services.',
      cover_image: '/src/assets/images/cover_fastapi_architecture_1791541033807.jpg',
      author_id: alexId,
      author_name: 'Alex Rivera',
      author_username: 'alex_rivera',
      author_avatar: '/src/assets/images/avatar_alex_rivera_1791541068236.jpg',
      category: 'Backend',
      tags: ['fastapi', 'python', 'mongodb', 'asyncio'],
      status: 'published',
      views: 1842,
      likes_count: 142,
      bookmarks_count: 64,
      created_at: daysAgo(14),
      updated_at: daysAgo(14),
      published_at: daysAgo(14),
      content: `## Understanding Asynchronous I/O in FastAPI

Modern microservice architectures demand predictable tail latencies under concurrent load. When pairing **FastAPI** with **Motor** (the official async Python driver for MongoDB), every database query yields control back to the UVLoop event loop while waiting on network socket reads.

### Connection Pool Sizing

A common production pitfall is creating a new \`AsyncIOMotorClient\` per request. Instead, initialize a single client during the FastAPI \`lifespan\` context manager and inject the database handle via \`Depends(get_database)\`.

\`\`\`python
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.mongo_client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        maxPoolSize=100,
        minPoolSize=10,
        serverSelectionTimeoutMS=5000,
    )
    yield
    app.state.mongo_client.close()
\`\`\`

### Enforcing Strict Pydantic v2 Schemas

Pydantic v2 compiles validation core logic in Rust (\`pydantic-core\`), reducing serialization overhead by up to 4x compared to v1:

- Always separate request schemas (\`BlogCreateRequest\`) from database persistence models.
- Never serialize \`password_hash\` or internal tokens in outbound DTOs.
- Use \`model_validator\` to enforce cross-field invariants before touching the database.

> Production reliability comes from explicit boundaries: validate early at the edge, authorize inside dependencies, and keep route handlers thin.

### Structuring Dependency Injection

FastAPI's dependency injection system makes role-based access control composable and testable:

1. \`get_database\`: Resolves the active \`AsyncIOMotorDatabase\` handle.
2. \`get_current_user\`: Extracts the JWT from the \`Authorization\` header or \`HttpOnly\` cookie and verifies account status.
3. \`get_admin_user\`: Chains onto \`get_current_user\` and enforces \`role == "admin"\`.`,
    },
    {
      _id: '65f100000000000000000002',
      title: 'Compound Indexing Strategies in MongoDB for Sub-10ms Queries',
      slug: 'compound-indexing-strategies-in-mongodb-for-sub-10ms-queries',
      excerpt: 'How the Equality-Sort-Range (ESR) rule eliminates collection scans and keeps memory working sets lean at scale.',
      cover_image: '/src/assets/images/cover_mongodb_indexing_1791541045277.jpg',
      author_id: elenaId,
      author_name: 'Elena Rostova',
      author_username: 'elena_admin',
      author_avatar: '/src/assets/images/avatar_elena_rostova_1791541078393.jpg',
      category: 'Database',
      tags: ['mongodb', 'indexing', 'performance', 'database'],
      status: 'published',
      views: 2410,
      likes_count: 198,
      bookmarks_count: 91,
      created_at: daysAgo(12),
      updated_at: daysAgo(12),
      published_at: daysAgo(12),
      content: `## The Equality, Sort, Range (ESR) Rule

When designing compound B-Tree indexes in MongoDB, key order dictates whether the query planner can satisfy both filtering and sorting without an in-memory blocking sort stage (\`SORT\`).

### Structuring Index Keys

1. **Equality**: Fields matched with exact values (e.g., \`status: "published"\`, \`category: "Backend"\`).
2. **Sort**: Fields that determine result ordering (e.g., \`created_at: -1\`).
3. **Range**: Cardinality bounds such as \`$gte\`, \`$lte\`, or \`$in\`.

\`\`\`javascript
db.blogs.createIndex(
  { status: 1, category: 1, created_at: -1 },
  { name: "idx_blogs_esr_feed" }
);
\`\`\`

### Verifying Execution Plans

Always inspect \`.explain("executionStats")\` before shipping a new query path:

- Verify \`totalDocsExamined\` closely matches \`nReturned\`.
- Ensure \`stage\` is \`IXSCAN\` rather than \`COLLSCAN\`.
- Monitor WiredTiger cache eviction metrics when adding multikey array indexes on \`tags\`.

> An index that supports both your filter predicate and sort order reduces P99 query latency from ratusan milliseconds to under 4ms.`,
    },
    {
      _id: '65f100000000000000000003',
      title: 'Designing Concurrent React Workspaces Without Layout Shift',
      slug: 'designing-concurrent-react-workspaces-without-layout-shift',
      excerpt: 'Practical techniques for tabular numeric alignment, optimistic mutations, and zero-latency filtering in developer dashboards.',
      cover_image: '/src/assets/images/cover_react_performance_1791541055240.jpg',
      author_id: marcusId,
      author_name: 'Marcus Vance',
      author_username: 'marcus_vance',
      author_avatar: '/src/assets/images/avatar_alex_rivera_1791541068236.jpg',
      category: 'Frontend',
      tags: ['react', 'typescript', 'tailwind', 'ux'],
      status: 'published',
      views: 1590,
      likes_count: 126,
      bookmarks_count: 53,
      created_at: daysAgo(10),
      updated_at: daysAgo(10),
      published_at: daysAgo(10),
      content: `## Why Developer Interfaces Feel Fast

Perceived performance in technical workspaces is governed by visual stability and immediate feedback loops.

### Tabular Numerals in Data Grids

Whenever counters, views, or timestamps update dynamically, proportional glyphs cause horizontal jitter. Enforcing \`font-variant-numeric: tabular-nums\` ensures every digit occupies an identical advance width.

\`\`\`css
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
\`\`\`

### Optimistic UI Updates for Likes and Bookmarks

Waiting 150ms for a round-trip network response before toggling a bookmark icon makes an interface feel sluggish. Apply the state transition immediately in memory, fire the async request in the background, and roll back cleanly if the server returns an error.

### Skeleton Geometry Fidelity

Loading skeletons should match the exact height and border structure of populated rows so the viewport does not jump when asynchronous data resolves.`,
    },
    {
      _id: '65f100000000000000000004',
      title: 'Stateless JWT Rotation and HTTP-Only Cookie Security',
      slug: 'stateless-jwt-rotation-and-http-only-cookie-security',
      excerpt: 'Implementing short-lived access tokens alongside refresh token rotation to mitigate XSS and CSRF vectors in SPA architectures.',
      cover_image: '/src/assets/images/cover_fastapi_architecture_1791541033807.jpg',
      author_id: elenaId,
      author_name: 'Elena Rostova',
      author_username: 'elena_admin',
      author_avatar: '/src/assets/images/avatar_elena_rostova_1791541078393.jpg',
      category: 'Security',
      tags: ['jwt', 'security', 'authentication', 'fastapi'],
      status: 'published',
      views: 1320,
      likes_count: 94,
      bookmarks_count: 48,
      created_at: daysAgo(8),
      updated_at: daysAgo(8),
      published_at: daysAgo(8),
      content: `## Balancing Usability and Token Security

Single-Page Applications need seamless session persistence without exposing long-lived credentials to third-party scripts.

### Dual-Token Lifecycle

- **Access Token (30 minutes)**: Carries \`sub\` (User ID) and \`role\`, validated on every protected endpoint via \`Depends(get_current_user)\`.
- **Refresh Token (7 days)**: Stored in an \`HttpOnly\`, \`SameSite=Lax\` cookie used exclusively by \`/api/auth/refresh\` to mint fresh token pairs.

\`\`\`python
response.set_cookie(
    key="access_token",
    value=access_token,
    httponly=True,
    secure=True,
    samesite="lax",
    max_age=1800,
)
\`\`\`

### Role-Based & Ownership Authorization

Never trust client-side route guards alone. Every mutating endpoint (\`PUT /api/blogs/{id}\`, \`DELETE /api/blogs/{id}\`) must verify that \`str(blog["author_id"]) == str(current_user["_id"])\` or \`current_user["role"] == "admin"\`.`,
    },
    {
      _id: '65f100000000000000000005',
      title: 'Automated API Integration Testing with Pytest and HTTPX',
      slug: 'automated-api-integration-testing-with-pytest-and-httpx',
      excerpt: 'Writing deterministic async test suites for FastAPI endpoints using isolated database fixtures and AsyncClient.',
      cover_image: '/src/assets/images/cover_fastapi_architecture_1791541033807.jpg',
      author_id: alexId,
      author_name: 'Alex Rivera',
      author_username: 'alex_rivera',
      author_avatar: '/src/assets/images/avatar_alex_rivera_1791541068236.jpg',
      category: 'Testing',
      tags: ['pytest', 'httpx', 'fastapi', 'testing'],
      status: 'published',
      views: 980,
      likes_count: 77,
      bookmarks_count: 39,
      created_at: daysAgo(6),
      updated_at: daysAgo(6),
      published_at: daysAgo(6),
      content: `## Deterministic Async Testing

Testing asynchronous FastAPI routes requires \`httpx.AsyncClient\` paired with \`ASGITransport\` so tests run directly against the ASGI application without binding a network port.

\`\`\`python
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_register_and_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/auth/register", json={...})
        assert res.status_code == 201
\`\`\`

### Testing Authorization Boundaries

Always include explicit assertions for:
- **401 Unauthorized**: Missing or malformed JWT tokens.
- **403 Forbidden**: Authenticated user attempting to edit another author's blog post or access \`/api/admin/*\`.
- **409 Conflict**: Duplicate email or username during registration.`,
    },
    {
      _id: '65f100000000000000000006',
      title: 'Zero-Downtime Container Orchestration with Docker Compose',
      slug: 'zero-downtime-container-orchestration-with-docker-compose',
      excerpt: 'Configuring multi-stage builds for Python 3.11 and Vite React frontends with healthchecks and environment isolation.',
      cover_image: '/src/assets/images/cover_mongodb_indexing_1791541045277.jpg',
      author_id: alexId,
      author_name: 'Alex Rivera',
      author_username: 'alex_rivera',
      author_avatar: '/src/assets/images/avatar_alex_rivera_1791541068236.jpg',
      category: 'DevOps',
      tags: ['docker', 'devops', 'containers', 'deployment'],
      status: 'published',
      views: 860,
      likes_count: 63,
      bookmarks_count: 29,
      created_at: daysAgo(5),
      updated_at: daysAgo(5),
      published_at: daysAgo(5),
      content: `## Reproducible Full-Stack Environments

Shipping a FastAPI + MongoDB + React stack across local machines and CI pipelines requires clean container boundaries.

### Multi-Stage Builds

Keep container images minimal by separating build dependencies from runtime layers:

\`\`\`dockerfile
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
\`\`\``,
    },
    {
      _id: '65f100000000000000000007',
      title: 'Building Deterministic Slug Generators and SEO Metadata Pipelines',
      slug: 'building-deterministic-slug-generators-and-seo-metadata-pipelines',
      excerpt: 'How human-readable URLs, canonical slugs, and OpenGraph tags improve discoverability for technical engineering blogs.',
      cover_image: '/src/assets/images/cover_react_performance_1791541055240.jpg',
      author_id: marcusId,
      author_name: 'Marcus Vance',
      author_username: 'marcus_vance',
      author_avatar: '/src/assets/images/avatar_alex_rivera_1791541068236.jpg',
      category: 'Architecture',
      tags: ['seo', 'architecture', 'backend', 'web'],
      status: 'published',
      views: 740,
      likes_count: 51,
      bookmarks_count: 22,
      created_at: daysAgo(3),
      updated_at: daysAgo(3),
      published_at: daysAgo(3),
      content: `## Why Clean URLs Matter for Engineering Content

Readable slugs like \`/blog/building-rest-apis-with-fastapi\` communicate topic hierarchy before the page even loads.

### Handling Slug Collisions Gracefully

When two authors publish posts with identical titles, appending an atomic collision suffix (\`-2\`, \`-3\`) preserves uniqueness without exposing raw ObjectIds in the primary URL.`,
    },
    {
      _id: '65f100000000000000000008',
      title: 'Aggregation Pipelines vs Client-Side Metrics in MongoDB',
      slug: 'aggregation-pipelines-vs-client-side-metrics-in-mongodb',
      excerpt: 'When to pre-aggregate counters (likes_count, bookmarks_count) on documents versus computing $lookup rollups on the fly.',
      cover_image: '/src/assets/images/cover_mongodb_indexing_1791541045277.jpg',
      author_id: elenaId,
      author_name: 'Elena Rostova',
      author_username: 'elena_admin',
      author_avatar: '/src/assets/images/avatar_elena_rostova_1791541078393.jpg',
      category: 'Database',
      tags: ['mongodb', 'aggregation', 'architecture', 'backend'],
      status: 'published',
      views: 1120,
      likes_count: 88,
      bookmarks_count: 41,
      created_at: daysAgo(2),
      updated_at: daysAgo(2),
      published_at: daysAgo(2),
      content: `## Hybrid Denormalization in Document Databases

Storing likes and bookmarks in dedicated collections (\`likes\`, \`bookmarks\`) with a unique compound index on \`(user_id, blog_id)\` guarantees idempotency.

Synchronizing \`likes_count\` and \`bookmarks_count\` directly on the parent \`blogs\` document enables fast sorting by popularity (\`sort=likes\`) without expensive \`$lookup\` joins on every feed page load.`,
    },
    {
      _id: '65f100000000000000000009',
      title: 'Draft: Benchmarking Python 3.12 Subinterpreters for CPU-Bound Tasks',
      slug: 'draft-benchmarking-python-3-12-subinterpreters-for-cpu-bound-tasks',
      excerpt: 'Early benchmark notes comparing multiprocessing pools against PEP 684 per-interpreter GIL in hybrid web workers.',
      cover_image: '/src/assets/images/cover_fastapi_architecture_1791541033807.jpg',
      author_id: alexId,
      author_name: 'Alex Rivera',
      author_username: 'alex_rivera',
      author_avatar: '/src/assets/images/avatar_alex_rivera_1791541068236.jpg',
      category: 'Backend',
      tags: ['python', 'performance', 'concurrency'],
      status: 'draft',
      views: 0,
      likes_count: 0,
      bookmarks_count: 0,
      created_at: daysAgo(1),
      updated_at: daysAgo(1),
      published_at: null,
      content: `## Work in Progress: PEP 684 Benchmarks

Drafting latency histograms and memory overhead comparisons for CPU-bound markdown parsing inside async FastAPI workers.

- Baseline: \`ProcessPoolExecutor\` with 4 workers.
- Candidate: Subinterpreters with shared zero-copy memory buffers.`,
    },
  ];

  const bookmarks: InteractionDoc[] = [
    {
      _id: createId(),
      user_id: alexId,
      blog_id: '65f100000000000000000002',
      created_at: daysAgo(4),
    },
    {
      _id: createId(),
      user_id: alexId,
      blog_id: '65f100000000000000000003',
      created_at: daysAgo(3),
    },
    {
      _id: createId(),
      user_id: elenaId,
      blog_id: '65f100000000000000000001',
      created_at: daysAgo(5),
    },
  ];

  const likes: InteractionDoc[] = [
    {
      _id: createId(),
      user_id: alexId,
      blog_id: '65f100000000000000000002',
      created_at: daysAgo(4),
    },
    {
      _id: createId(),
      user_id: elenaId,
      blog_id: '65f100000000000000000001',
      created_at: daysAgo(5),
    },
  ];

  return { users, blogs, likes, bookmarks };
}

function loadDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw) as DatabaseSchema;
    }
  } catch (err) {
    console.error('Error loading DB file, re-initializing seed data:', err);
  }
  const seeded = buildSeedDatabase();
  saveDb(seeded);
  return seeded;
}

function saveDb(db: DatabaseSchema): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB file:', err);
  }
}

let db: DatabaseSchema = loadDb();

// --- Serializers ---
function serializeUser(u: UserDoc) {
  return {
    id: u._id,
    name: u.name,
    username: u.username,
    email: u.email,
    avatar: u.avatar,
    bio: u.bio,
    role: u.role,
    is_active: u.is_active,
    social_links: u.social_links || { github: '', website: '', x: '' },
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

function serializeBlog(b: BlogDoc, currentUser: UserDoc | null) {
  const words = Math.max(1, b.content.trim().split(/\s+/).length);
  const readTime = Math.max(1, Math.round(words / 200));
  const isLiked = currentUser
    ? db.likes.some((l) => l.user_id === currentUser._id && l.blog_id === b._id)
    : false;
  const isBookmarked = currentUser
    ? db.bookmarks.some((bm) => bm.user_id === currentUser._id && bm.blog_id === b._id)
    : false;

  return {
    id: b._id,
    title: b.title,
    slug: b.slug,
    excerpt: b.excerpt,
    content: b.content,
    cover_image: b.cover_image,
    author_id: b.author_id,
    author_name: b.author_name,
    author_username: b.author_username,
    author_avatar: b.author_avatar,
    category: b.category,
    tags: b.tags,
    status: b.status,
    views: b.views,
    likes_count: b.likes_count,
    bookmarks_count: b.bookmarks_count,
    read_time: readTime,
    is_liked: isLiked,
    is_bookmarked: isBookmarked,
    created_at: b.created_at,
    updated_at: b.updated_at,
    published_at: b.published_at,
  };
}

// --- Auth Middleware Helpers ---
function extractUserFromRequest(req: Request): { user: UserDoc | null; error?: { status: number; message: string } } {
  const authHeader = req.headers.authorization;
  const cookies = parseCookies(req.headers.cookie);
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (cookies.access_token) {
    token = cookies.access_token;
  }

  if (!token) {
    return { user: null, error: { status: 401, message: 'Authentication required. Please log in.' } };
  }

  const payload = verifyJwt(token, 'access');
  if (!payload || typeof payload.sub !== 'string') {
    return { user: null, error: { status: 401, message: 'Invalid or expired authentication token.' } };
  }

  const user = db.users.find((u) => u._id === payload.sub);
  if (!user) {
    return { user: null, error: { status: 401, message: 'User account not found.' } };
  }

  if (!user.is_active) {
    return { user: null, error: { status: 403, message: 'User account has been deactivated.' } };
  }

  return { user };
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 60 * 1000,
    path: '/',
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // ============================================================================
  // AUTHENTICATION ENDPOINTS (/api/auth/*)
  // ============================================================================
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { name, username, email, password, confirm_password } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(422).json({ success: false, message: 'Name must be at least 2 characters.' });
    }
    if (!username || typeof username !== 'string' || !/^[a-zA-Z0-9_-]{3,32}$/.test(username.trim())) {
      return res.status(422).json({
        success: false,
        message: 'Username must be 3–32 characters using letters, numbers, underscores, or hyphens.',
      });
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(422).json({ success: false, message: 'Please provide a valid email address.' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(422).json({ success: false, message: 'Password must be at least 8 characters.' });
    }
    if (password !== confirm_password) {
      return res.status(422).json({ success: false, message: 'Password and confirm password do not match.' });
    }

    const emailLower = email.trim().toLowerCase();
    const usernameLower = username.trim().toLowerCase();

    if (db.users.some((u) => u.email === emailLower)) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }
    if (db.users.some((u) => u.username === usernameLower)) {
      return res.status(409).json({
        success: false,
        message: 'This username is already taken.',
      });
    }

    const now = new Date().toISOString();
    const newUser: UserDoc = {
      _id: createId(),
      name: name.trim(),
      username: usernameLower,
      email: emailLower,
      password_hash: hashPassword(password),
      avatar: '/src/assets/images/avatar_alex_rivera_1791541068236.jpg',
      bio: 'Software Engineer & Technical Writer on DevScribe.',
      role: 'user',
      is_active: true,
      social_links: { github: '', website: '', x: '' },
      created_at: now,
      updated_at: now,
    };

    db.users.push(newUser);
    saveDb(db);

    const accessToken = signJwt({ sub: newUser._id, role: newUser.role, type: 'access' }, 30 * 60);
    const refreshToken = signJwt({ sub: newUser._id, role: newUser.role, type: 'refresh' }, 7 * 86400);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: {
        user: serializeUser(newUser),
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/username and password are required.',
      });
    }

    const idLower = String(identifier).trim().toLowerCase();
    const user = db.users.find((u) => u.email === idLower || u.username === idLower);

    if (!user || !verifyPassword(String(password), user.password_hash)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact an administrator.',
      });
    }

    const accessToken = signJwt({ sub: user._id, role: user.role, type: 'access' }, 30 * 60);
    const refreshToken = signJwt({ sub: user._id, role: user.role, type: 'refresh' }, 7 * 86400);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      data: {
        user: serializeUser(user),
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  });

  app.post('/api/auth/logout', (_req: Request, res: Response) => {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const { user, error } = extractUserFromRequest(req);
    if (!user) {
      return res.status(error?.status || 401).json({
        success: false,
        message: error?.message || 'Unauthorized',
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Authenticated user profile retrieved.',
      data: serializeUser(user),
    });
  });

  app.post('/api/auth/refresh', (req: Request, res: Response) => {
    const cookies = parseCookies(req.headers.cookie);
    const refreshToken = req.body?.refresh_token || cookies.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token missing.',
      });
    }

    const payload = verifyJwt(refreshToken, 'refresh');
    if (!payload || typeof payload.sub !== 'string') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.',
      });
    }

    const user = db.users.find((u) => u._id === payload.sub);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or inactive.',
      });
    }

    const newAccess = signJwt({ sub: user._id, role: user.role, type: 'access' }, 30 * 60);
    const newRefresh = signJwt({ sub: user._id, role: user.role, type: 'refresh' }, 7 * 86400);
    setAuthCookies(res, newAccess, newRefresh);

    return res.status(200).json({
      success: true,
      message: 'Session token refreshed successfully.',
      data: {
        user: serializeUser(user),
        access_token: newAccess,
        refresh_token: newRefresh,
      },
    });
  });

  // ============================================================================
  // USERS & WORKSPACE DASHBOARD ENDPOINTS (/api/users/*)
  // ============================================================================
  app.get('/api/users/dashboard', (req: Request, res: Response) => {
    const { user, error } = extractUserFromRequest(req);
    if (!user) {
      return res.status(error?.status || 401).json({ success: false, message: error?.message });
    }

    const myBlogs = db.blogs
      .filter((b) => b.author_id === user._id)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    const publishedBlogs = myBlogs.filter((b) => b.status === 'published');
    const draftBlogs = myBlogs.filter((b) => b.status === 'draft');
    const totalViews = myBlogs.reduce((acc, b) => acc + b.views, 0);
    const totalLikes = myBlogs.reduce((acc, b) => acc + b.likes_count, 0);
    const bookmarksCount = db.bookmarks.filter((bm) => bm.user_id === user._id).length;

    return res.status(200).json({
      success: true,
      message: 'Dashboard metrics fetched successfully.',
      data: {
        total_blogs: myBlogs.length,
        published_blogs: publishedBlogs.length,
        draft_blogs: draftBlogs.length,
        total_views: totalViews,
        total_likes: totalLikes,
        bookmarks_count: bookmarksCount,
        recent_posts: myBlogs.slice(0, 5).map((b) => serializeBlog(b, user)),
      },
    });
  });

  app.get('/api/users/bookmarks', (req: Request, res: Response) => {
    const { user, error } = extractUserFromRequest(req);
    if (!user) {
      return res.status(error?.status || 401).json({ success: false, message: error?.message });
    }

    const userBookmarks = db.bookmarks
      .filter((bm) => bm.user_id === user._id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const bookmarkedBlogs = userBookmarks
      .map((bm) => db.blogs.find((b) => b._id === bm.blog_id))
      .filter((b): b is BlogDoc => Boolean(b))
      .map((b) => serializeBlog(b, user));

    return res.status(200).json({
      success: true,
      message: 'Bookmarked blogs fetched successfully.',
      data: bookmarkedBlogs,
    });
  });

  app.put('/api/users/profile', (req: Request, res: Response) => {
    const { user, error } = extractUserFromRequest(req);
    if (!user) {
      return res.status(error?.status || 401).json({ success: false, message: error?.message });
    }

    const { name, bio, avatar, social_links } = req.body || {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res.status(422).json({ success: false, message: 'Name must be at least 2 characters.' });
      }
      user.name = name.trim();
    }
    if (bio !== undefined && typeof bio === 'string') {
      user.bio = bio.trim();
    }
    if (avatar !== undefined && typeof avatar === 'string') {
      user.avatar = avatar.trim();
    }
    if (social_links && typeof social_links === 'object') {
      user.social_links = {
        github: String(social_links.github || ''),
        website: String(social_links.website || ''),
        x: String(social_links.x || ''),
      };
    }
    user.updated_at = new Date().toISOString();

    // Propagate author name and avatar to user's blogs
    db.blogs.forEach((b) => {
      if (b.author_id === user._id) {
        b.author_name = user.name;
        b.author_avatar = user.avatar;
      }
    });

    saveDb(db);
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: serializeUser(user),
    });
  });

  app.get('/api/users/profile/:username', (req: Request, res: Response) => {
    const { user: currentUser } = extractUserFromRequest(req);
    const username = String(req.params.username || '').trim().toLowerCase();
    const author = db.users.find((u) => u.username === username);
    if (!author) {
      return res.status(404).json({
        success: false,
        message: 'Author profile not found.',
      });
    }

    const publishedBlogs = db.blogs
      .filter((b) => b.author_id === author._id && b.status === 'published')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const totalViews = publishedBlogs.reduce((sum, b) => sum + b.views, 0);
    const totalLikes = publishedBlogs.reduce((sum, b) => sum + b.likes_count, 0);
    const categories = Array.from(new Set(publishedBlogs.map((b) => b.category))).sort();

    return res.status(200).json({
      success: true,
      message: 'Author profile fetched successfully.',
      data: {
        ...serializeUser(author),
        stats: {
          blog_count: publishedBlogs.length,
          total_views: totalViews,
          total_likes: totalLikes,
          categories,
        },
        blogs: publishedBlogs.map((b) => serializeBlog(b, currentUser)),
      },
    });
  });

  // ============================================================================
  // BLOGS CRUD, SEARCH, FILTER, PAGINATION, LIKES & BOOKMARKS (/api/blogs/*)
  // ============================================================================
  function queryBlogsHelper(params: {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    tag?: string;
    author?: string;
    statusFilter?: string;
    sort?: string;
    currentUser: UserDoc | null;
  }) {
    let filtered = [...db.blogs];

    if (params.statusFilter && params.statusFilter !== 'all') {
      filtered = filtered.filter((b) => b.status === params.statusFilter);
    }

    if (params.category && params.category.toLowerCase() !== 'all') {
      const catLower = params.category.trim().toLowerCase();
      filtered = filtered.filter((b) => b.category.toLowerCase() === catLower);
    }

    if (params.tag && params.tag.trim()) {
      const tagLower = params.tag.trim().toLowerCase();
      filtered = filtered.filter((b) => b.tags.some((t) => t.toLowerCase() === tagLower));
    }

    if (params.author && params.author.trim()) {
      const authQuery = params.author.trim().toLowerCase();
      filtered = filtered.filter(
        (b) => b.author_id.toLowerCase() === authQuery || b.author_username.toLowerCase() === authQuery
      );
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.excerpt.toLowerCase().includes(q) ||
          b.content.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          b.author_name.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    const sortBy = params.sort || 'latest';
    if (sortBy === 'views' || sortBy === 'most_viewed') {
      filtered.sort((a, b) => b.views - a.views);
    } else if (sortBy === 'likes' || sortBy === 'most_liked') {
      filtered.sort((a, b) => b.likes_count - a.likes_count);
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / params.limit));
    const page = Math.max(1, params.page);
    const start = (page - 1) * params.limit;
    const items = filtered.slice(start, start + params.limit).map((b) => serializeBlog(b, params.currentUser));

    return {
      items,
      page,
      limit: params.limit,
      total,
      pages,
    };
  }

  app.post('/api/blogs', (req: Request, res: Response) => {
    const { user, error } = extractUserFromRequest(req);
    if (!user) {
      return res.status(error?.status || 401).json({ success: false, message: error?.message });
    }

    const { title, slug, excerpt, content, cover_image, category, tags, status } = req.body || {};
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(422).json({ success: false, message: 'Title must be at least 3 characters.' });
    }
    if (!excerpt || typeof excerpt !== 'string' || excerpt.trim().length < 10) {
      return res.status(422).json({ success: false, message: 'Excerpt must be at least 10 characters.' });
    }
    if (!content || typeof content !== 'string' || content.trim().length < 20) {
      return res.status(422).json({ success: false, message: 'Article content must be at least 20 characters.' });
    }
    if (!category || typeof category !== 'string' || category.trim().length < 2) {
      return res.status(422).json({ success: false, message: 'Please select a valid category.' });
    }

    const blogStatus: 'draft' | 'published' = status === 'published' ? 'published' : 'draft';
    const uniqueSlug = generateUniqueSlug(db, slug && String(slug).trim() ? String(slug) : title);
    const now = new Date().toISOString();

    const parsedTags = Array.isArray(tags)
      ? tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)
      : [];

    const newBlog: BlogDoc = {
      _id: createId(),
      title: title.trim(),
      slug: uniqueSlug,
      excerpt: excerpt.trim(),
      content,
      cover_image: cover_image && String(cover_image).trim()
        ? String(cover_image).trim()
        : '/src/assets/images/cover_fastapi_architecture_1791541033807.jpg',
      author_id: user._id,
      author_name: user.name,
      author_username: user.username,
      author_avatar: user.avatar,
      category: category.trim(),
      tags: parsedTags,
      status: blogStatus,
      views: 0,
      likes_count: 0,
      bookmarks_count: 0,
      created_at: now,
      updated_at: now,
      published_at: blogStatus === 'published' ? now : null,
    };

    db.blogs.unshift(newBlog);
    saveDb(db);

    return res.status(201).json({
      success: true,
      message: blogStatus === 'published' ? 'Blog published successfully.' : 'Draft saved successfully.',
      data: serializeBlog(newBlog, user),
    });
  });

  app.get('/api/blogs', (req: Request, res: Response) => {
    const { user: currentUser } = extractUserFromRequest(req);
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));

    const result = queryBlogsHelper({
      page,
      limit,
      search: req.query.search ? String(req.query.search) : undefined,
      category: req.query.category ? String(req.query.category) : undefined,
      tag: req.query.tag ? String(req.query.tag) : undefined,
      author: req.query.author ? String(req.query.author) : undefined,
      statusFilter: 'published',
      sort: req.query.sort ? String(req.query.sort) : 'latest',
      currentUser,
    });

    return res.status(200).json({
      success: true,
      message: 'Blogs fetched successfully.',
      data: result,
    });
  });

  app.get('/api/blogs/my', (req: Request, res: Response) => {
    const { user, error } = extractUserFromRequest(req);
    if (!user) {
      return res.status(error?.status || 401).json({ success: false, message: error?.message });
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));

    const result = queryBlogsHelper({
      page,
      limit,
      search: req.query.search ? String(req.query.search) : undefined,
      category: req.query.category ? String(req.query.category) : undefined,
      author: user._id,
      statusFilter: req.query.status ? String(req.query.status) : 'all',
      sort: req.query.sort ? String(req.query.sort) : 'latest',
      currentUser: user,
    });

    return res.status(200).json({
      success: true,
      message: 'Author blogs fetched successfully.',
      data: result,
    });
  });

  app.get('/api/blogs/category/:category', (req: Request, res: Response) => {
    const { user: currentUser } = extractUserFromRequest(req);
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));

    const result = queryBlogsHelper({
      page,
      limit,
      category: String(req.params.category),
      statusFilter: 'published',
      currentUser,
    });

    return res.status(200).json({
      success: true,
      message: `Blogs in category '${req.params.category}' fetched successfully.`,
      data: result,
    });
  });

  app.get('/api/blogs/tag/:tag', (req: Request, res: Response) => {
    const { user: currentUser } = extractUserFromRequest(req);
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));

    const result = queryBlogsHelper({
      page,
      limit,
      tag: String(req.params.tag),
      statusFilter: 'published',
      currentUser,
    });

    return res.status(200).json({
      success: true,
      message: `Blogs tagged with '${req.params.tag}' fetched successfully.`,
      data: result,
    });
  });

  app.get('/api/blogs/slug/:slug', (req: Request, res: Response) => {
    const { user: currentUser } = extractUserFromRequest(req);
    const blog = db.blogs.find((b) => b.slug === req.params.slug);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found.' });
    }

    if (blog.status === 'draft') {
      const isOwner = currentUser && currentUser._id === blog.author_id;
      const isAdmin = currentUser && currentUser.role === 'admin';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this draft.',
        });
      }
    } else {
      blog.views += 1;
      saveDb(db);
    }

    return res.status(200).json({
      success: true,
      message: 'Blog fetched successfully.',
      data: serializeBlog(blog, currentUser),
    });
  });

  app.get('/api/blogs/:blogId', (req: Request, res: Response) => {
    const { user: currentUser } = extractUserFromRequest(req);
    const blog = db.blogs.find((b) => b._id === req.params.blogId);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found.' });
    }

    if (blog.status === 'draft') {
      const isOwner = currentUser && currentUser._id === blog.author_id;
      const isAdmin = currentUser && currentUser.role === 'admin';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this draft.',
        });
      }
    } else {
      blog.views += 1;
      saveDb(db);
    }

    return res.status(200).json({
      success: true,
      message: 'Blog fetched successfully.',
      data: serializeBlog(blog, currentUser),
    });
  });

  app.put('/api/blogs/:blogId', (req: Request, res: Response) => {
    const { user, error } = extractUserFromRequest(req);
    if (!user) {
      return res.status(error?.status || 401).json({ success: false, message: error?.message });
    }

    const blog = db.blogs.find((b) => b._id === req.params.blogId);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found.' });
    }

    const isOwner = blog.author_id === user._id;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update another user's blog post.",
      });
    }

    const { title, slug, excerpt, content, cover_image, category, tags, status } = req.body || {};
    if (title !== undefined) {
      blog.title = String(title).trim();
      if (!slug) {
        blog.slug = generateUniqueSlug(db, blog.title, blog._id);
      }
    }
    if (slug !== undefined && String(slug).trim()) {
      blog.slug = generateUniqueSlug(db, String(slug).trim(), blog._id);
    }
    if (excerpt !== undefined) blog.excerpt = String(excerpt).trim();
    if (content !== undefined) blog.content = String(content);
    if (cover_image !== undefined) blog.cover_image = String(cover_image).trim();
    if (category !== undefined) blog.category = String(category).trim();
    if (Array.isArray(tags)) {
      blog.tags = tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
    }
    if (status === 'draft' || status === 'published') {
      blog.status = status;
      if (status === 'published' && !blog.published_at) {
        blog.published_at = new Date().toISOString();
      }
    }

    blog.updated_at = new Date().toISOString();
    saveDb(db);

    return res.status(200).json({
      success: true,
      message: 'Blog updated successfully.',
      data: serializeBlog(blog, user),
    });
  });

  app.delete('/api/blogs/:blogId', (req: Request, res: Response) => {
    const { user, error } = extractUserFromRequest(req);
    if (!user) {
      return res.status(error?.status || 401).json({ success: false, message: error?.message });
    }

    const idx = db.blogs.findIndex((b) => b._id === req.params.blogId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Blog not found.' });
    }

    const blog = db.blogs[idx];
    const isOwner = blog.author_id === user._id;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete another user's blog post.",
      });
    }

    db.blogs.splice(idx, 1);
    db.likes = db.likes.filter((l) => l.blog_id !== blog._id);
    db.bookmarks = db.bookmarks.filter((bm) => bm.blog_id !== blog._id);
    saveDb(db);

    return res.status(200).json({
      success: true,
      message: 'Blog deleted successfully.',
    });
  });

  app.post('/api/blogs/:blogId/like', (req: Request, res: Response) => {
    const { user, error } = extractUserFromRequest(req);
    if (!user) {
      return res.status(error?.status || 401).json({ success: false, message: error?.message });
    }

    const blog = db.blogs.find((b) => b._id === req.params.blogId);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found.' });
    }

    const exists = db.likes.some((l) => l.user_id === user._id && l.blog_id === blog._id);
    if (!exists) {
      db.likes.push({
        _id: createId(),
        user_id: user._id,
        blog_id: blog._id,
        created_at: new Date().toISOString(),
      });
      blog.likes_count += 1;
      saveDb(db);
    }

    return res.status(200).json({
      success: true,
      message: 'Blog liked.',
      data: serializeBlog(blog, user),
    });
  });

  app.delete('/api/blogs/:blogId/like', (req: Request, res: Response) => {
    const { user, error } = extractUserFromRequest(req);
    if (!user) {
      return res.status(error?.status || 401).json({ success: false, message: error?.message });
    }

    const blog = db.blogs.find((b) => b._id === req.params.blogId);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found.' });
    }

    const idx = db.likes.findIndex((l) => l.user_id === user._id && l.blog_id === blog._id);
    if (idx !== -1) {
      db.likes.splice(idx, 1);
      blog.likes_count = Math.max(0, blog.likes_count - 1);
      saveDb(db);
    }

    return res.status(200).json({
      success: true,
      message: 'Like removed.',
      data: serializeBlog(blog, user),
    });
  });

  app.post('/api/blogs/:blogId/bookmark', (req: Request, res: Response) => {
    const { user, error } = extractUserFromRequest(req);
    if (!user) {
      return res.status(error?.status || 401).json({ success: false, message: error?.message });
    }

    const blog = db.blogs.find((b) => b._id === req.params.blogId);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found.' });
    }

    const exists = db.bookmarks.some((bm) => bm.user_id === user._id && bm.blog_id === blog._id);
    if (!exists) {
      db.bookmarks.push({
        _id: createId(),
        user_id: user._id,
        blog_id: blog._id,
        created_at: new Date().toISOString(),
      });
      blog.bookmarks_count += 1;
      saveDb(db);
    }

    return res.status(200).json({
      success: true,
      message: 'Blog added to bookmarks.',
      data: serializeBlog(blog, user),
    });
  });

  app.delete('/api/blogs/:blogId/bookmark', (req: Request, res: Response) => {
    const { user, error } = extractUserFromRequest(req);
    if (!user) {
      return res.status(error?.status || 401).json({ success: false, message: error?.message });
    }

    const blog = db.blogs.find((b) => b._id === req.params.blogId);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found.' });
    }

    const idx = db.bookmarks.findIndex((bm) => bm.user_id === user._id && bm.blog_id === blog._id);
    if (idx !== -1) {
      db.bookmarks.splice(idx, 1);
      blog.bookmarks_count = Math.max(0, blog.bookmarks_count - 1);
      saveDb(db);
    }

    return res.status(200).json({
      success: true,
      message: 'Bookmark removed.',
      data: serializeBlog(blog, user),
    });
  });

  // ============================================================================
  // ADMIN ENDPOINTS (/api/admin/*)
  // ============================================================================
  function requireAdmin(req: Request, res: Response): UserDoc | null {
    const { user, error } = extractUserFromRequest(req);
    if (!user) {
      res.status(error?.status || 401).json({ success: false, message: error?.message });
      return null;
    }
    if (user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Admin privileges required to perform this action.',
      });
      return null;
    }
    return user;
  }

  app.get('/api/admin/stats', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const totalUsers = db.users.length;
    const activeUsers = db.users.filter((u) => u.is_active).length;
    const totalBlogs = db.blogs.length;
    const publishedBlogs = db.blogs.filter((b) => b.status === 'published').length;
    const draftBlogs = db.blogs.filter((b) => b.status === 'draft').length;

    return res.status(200).json({
      success: true,
      message: 'Admin statistics fetched successfully.',
      data: {
        total_users: totalUsers,
        active_users: activeUsers,
        total_blogs: totalBlogs,
        published_blogs: publishedBlogs,
        draft_blogs: draftBlogs,
      },
    });
  });

  app.get('/api/admin/users', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    let list = [...db.users];
    const roleFilter = req.query.role ? String(req.query.role) : '';
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';

    if (roleFilter === 'user' || roleFilter === 'admin') {
      list = list.filter((u) => u.role === roleFilter);
    }
    if (search) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.username.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search)
      );
    }

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return res.status(200).json({
      success: true,
      message: 'Users fetched successfully.',
      data: list.map(serializeUser),
    });
  });

  app.patch('/api/admin/users/:userId/role', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const target = db.users.find((u) => u._id === req.params.userId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { role } = req.body || {};
    if (role !== 'user' && role !== 'admin') {
      return res.status(422).json({ success: false, message: 'Role must be user or admin.' });
    }

    target.role = role;
    target.updated_at = new Date().toISOString();
    saveDb(db);

    return res.status(200).json({
      success: true,
      message: `User role updated to ${role}.`,
      data: serializeUser(target),
    });
  });

  app.patch('/api/admin/users/:userId/status', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const target = db.users.find((u) => u._id === req.params.userId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { is_active } = req.body || {};
    if (typeof is_active !== 'boolean') {
      return res.status(422).json({ success: false, message: 'is_active must be a boolean.' });
    }

    if (target._id === admin._id && !is_active) {
      return res.status(400).json({
        success: false,
        message: 'Administrators cannot deactivate their own active session account.',
      });
    }

    target.is_active = is_active;
    target.updated_at = new Date().toISOString();
    saveDb(db);

    return res.status(200).json({
      success: true,
      message: `User account ${is_active ? 'activated' : 'deactivated'} successfully.`,
      data: serializeUser(target),
    });
  });

  app.get('/api/admin/blogs', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '25'), 10) || 25));

    const result = queryBlogsHelper({
      page,
      limit,
      search: req.query.search ? String(req.query.search) : undefined,
      category: req.query.category ? String(req.query.category) : undefined,
      statusFilter: req.query.status ? String(req.query.status) : 'all',
      sort: 'latest',
      currentUser: admin,
    });

    return res.status(200).json({
      success: true,
      message: 'All platform blogs fetched successfully.',
      data: result,
    });
  });

  app.delete('/api/admin/blogs/:blogId', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const idx = db.blogs.findIndex((b) => b._id === req.params.blogId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Blog not found.' });
    }

    const removed = db.blogs[idx];
    db.blogs.splice(idx, 1);
    db.likes = db.likes.filter((l) => l.blog_id !== removed._id);
    db.bookmarks = db.bookmarks.filter((bm) => bm.blog_id !== removed._id);
    saveDb(db);

    return res.status(200).json({
      success: true,
      message: 'Blog deleted by administrator.',
    });
  });

  // ============================================================================
  // OPENAPI / SWAGGER (/openapi.json, /docs, /redoc)
  // ============================================================================
  const openApiSpec = {
    openapi: '3.1.0',
    info: {
      title: 'DevScribe API',
      version: '1.0.0',
      description: 'Production-grade Developer Publishing & Blogging Platform built with FastAPI and MongoDB.',
    },
    tags: [
      { name: 'Authentication', description: 'Registration, Login, Logout, Current User, and Token Refresh' },
      { name: 'Users', description: 'Author Profiles, Profile Settings, Bookmarks, and Dashboard Metrics' },
      { name: 'Blogs', description: 'Blog CRUD, SEO Slugs, Search, Filtering, Pagination, Likes, and Bookmarks' },
      { name: 'Admin', description: 'Platform Overview Stats, User Role/Status Management, and Blog Moderation' },
    ],
    paths: {
      '/api/auth/register': { post: { tags: ['Authentication'], summary: 'Register a new user account' } },
      '/api/auth/login': { post: { tags: ['Authentication'], summary: 'Authenticate user with email or username' } },
      '/api/auth/logout': { post: { tags: ['Authentication'], summary: 'Clear authentication session cookies' } },
      '/api/auth/me': { get: { tags: ['Authentication'], summary: 'Fetch currently authenticated user profile' } },
      '/api/auth/refresh': { post: { tags: ['Authentication'], summary: 'Refresh access and refresh JWT tokens' } },
      '/api/users/dashboard': { get: { tags: ['Users'], summary: 'Fetch personalized author dashboard metrics' } },
      '/api/users/bookmarks': { get: { tags: ['Users'], summary: 'Fetch all bookmarked blog posts' } },
      '/api/users/profile': { put: { tags: ['Users'], summary: 'Update authenticated user profile settings' } },
      '/api/users/profile/{username}': { get: { tags: ['Users'], summary: 'Fetch public developer profile by username' } },
      '/api/blogs': {
        get: { tags: ['Blogs'], summary: 'List published blogs with pagination, search, filtering, and sorting' },
        post: { tags: ['Blogs'], summary: 'Create a new blog post or draft' },
      },
      '/api/blogs/my': { get: { tags: ['Blogs'], summary: 'List authenticated user own blogs (published & drafts)' } },
      '/api/blogs/slug/{slug}': { get: { tags: ['Blogs'], summary: 'Get a single blog post by SEO slug' } },
      '/api/blogs/category/{category}': { get: { tags: ['Blogs'], summary: 'List published blogs by category' } },
      '/api/blogs/tag/{tag}': { get: { tags: ['Blogs'], summary: 'List published blogs by tag' } },
      '/api/blogs/{blog_id}': {
        get: { tags: ['Blogs'], summary: 'Get a single blog post by ID' },
        put: { tags: ['Blogs'], summary: 'Update a blog post (Author or Admin only)' },
        delete: { tags: ['Blogs'], summary: 'Delete a blog post (Author or Admin only)' },
      },
      '/api/blogs/{blog_id}/like': {
        post: { tags: ['Blogs'], summary: 'Like a blog post' },
        delete: { tags: ['Blogs'], summary: 'Remove like from a blog post' },
      },
      '/api/blogs/{blog_id}/bookmark': {
        post: { tags: ['Blogs'], summary: 'Bookmark a blog post' },
        delete: { tags: ['Blogs'], summary: 'Remove bookmark from a blog post' },
      },
      '/api/admin/stats': { get: { tags: ['Admin'], summary: 'Get platform-wide overview metrics (Admin only)' } },
      '/api/admin/users': { get: { tags: ['Admin'], summary: 'List all registered users (Admin only)' } },
      '/api/admin/users/{user_id}/role': { patch: { tags: ['Admin'], summary: 'Change user role (Admin only)' } },
      '/api/admin/users/{user_id}/status': { patch: { tags: ['Admin'], summary: 'Activate/deactivate user (Admin only)' } },
      '/api/admin/blogs': { get: { tags: ['Admin'], summary: 'List all platform blogs including drafts (Admin only)' } },
      '/api/admin/blogs/{blog_id}': { delete: { tags: ['Admin'], summary: 'Delete any blog post (Admin only)' } },
    },
  };

  app.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(openApiSpec);
  });

  app.get('/docs', (_req: Request, res: Response) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>DevScribe API — Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
</head>
<body style="margin:0; background:#fafafa;">
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui' });
    };
  </script>
</body>
</html>`);
  });

  app.get('/redoc', (_req: Request, res: Response) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>DevScribe API — ReDoc</title>
</head>
<body style="margin:0;">
  <redoc spec-url="/openapi.json"></redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>`);
  });

  // Catch-all for unknown /api routes
  app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: 'API endpoint not found.',
    });
  });

  // Vite middleware in development, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Centralized error middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled API Error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected internal server error occurred.',
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DevScribe Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
