from pydantic import BaseModel, Field

class BlogCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=180)
    slug: str | None = Field(default=None, max_length=200)
    excerpt: str = Field(..., min_length=10, max_length=400)
    content: str = Field(..., min_length=20)
    cover_image: str = Field(default="")
    category: str = Field(..., min_length=2, max_length=50)
    tags: list[str] = Field(default_factory=list)
    status: str = Field(default="draft", pattern="^(draft|published)$")

class BlogUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=180)
    slug: str | None = Field(default=None, max_length=200)
    excerpt: str | None = Field(default=None, min_length=10, max_length=400)
    content: str | None = Field(default=None, min_length=20)
    cover_image: str | None = None
    category: str | None = Field(default=None, min_length=2, max_length=50)
    tags: list[str] | None = None
    status: str | None = Field(default=None, pattern="^(draft|published)$")
