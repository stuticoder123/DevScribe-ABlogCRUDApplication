from pydantic import BaseModel, Field


class SocialLinksSchema(BaseModel):
    github: str = ""
    website: str = ""
    x: str = ""


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    bio: str | None = Field(default=None, max_length=400)
    avatar: str | None = Field(default=None, max_length=500)
    social_links: SocialLinksSchema | None = None


class AdminRoleUpdateRequest(BaseModel):
    role: str = Field(..., pattern="^(user|admin)$")


class AdminStatusUpdateRequest(BaseModel):
    is_active: bool
