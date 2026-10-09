import re
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    username: str = Field(..., min_length=3, max_length=32)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not re.match(r"^[a-z0-9_-]+$", cleaned):
            raise ValueError("Username may only contain lowercase letters, numbers, underscores, and hyphens.")
        return cleaned

    @model_validator(mode="after")
    def verify_passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Password and confirm password do not match.")
        return self


class LoginRequest(BaseModel):
    identifier: str = Field(..., min_length=2, max_length=120, description="Email or username")
    password: str = Field(..., min_length=1, max_length=128)


class RefreshTokenRequest(BaseModel):
    refresh_token: str | None = None
