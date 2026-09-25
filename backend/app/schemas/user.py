import re
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, field_validator
from ..models.user import UserRole

# Accepts any user@domain.tld format — no RFC deliverability checks so
# internal domains (.local, .internal, .corp, etc.) are all valid.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _check_email(v: str) -> str:
    v = v.strip().lower()
    if not _EMAIL_RE.match(v):
        raise ValueError("Invalid email format — expected user@domain.tld")
    return v


class UserCreate(BaseModel):
    email:     str
    full_name: str
    password:  str
    role:      UserRole = UserRole.DEV

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, v: str) -> str:
        return _check_email(v)


class UserUpdate(BaseModel):
    full_name:  str | None = None
    role:       UserRole | None = None
    is_active:  bool | None = None
    avatar_url: str | None = None


class UserResponse(BaseModel):
    id:           UUID
    email:        str
    full_name:    str
    role:         UserRole
    avatar_url:   str | None
    is_active:    bool
    created_at:   datetime
    last_login_at: datetime | None

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
