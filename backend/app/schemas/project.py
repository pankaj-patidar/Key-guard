from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, field_validator
import re
from .user import UserResponse


class ProjectCreate(BaseModel):
    name:        str
    description: str | None = None
    color_tag:   str = "#6366f1"
    icon_name:   str | None = None

    @field_validator("name")
    @classmethod
    def generate_slug_hint(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Project name cannot be empty")
        return v


class ProjectUpdate(BaseModel):
    name:        str | None = None
    description: str | None = None
    color_tag:   str | None = None
    icon_name:   str | None = None
    is_archived: bool | None = None


class AssignmentCreate(BaseModel):
    user_id:    UUID
    can_reveal: bool = True
    can_edit:   bool = False


class AssignmentResponse(BaseModel):
    id:          UUID
    user_id:     UUID
    project_id:  UUID
    can_reveal:  bool
    can_edit:    bool
    assigned_at: datetime
    user:        UserResponse | None = None

    model_config = {"from_attributes": True}


class ProjectResponse(BaseModel):
    id:           UUID
    name:         str
    description:  str | None
    slug:         str
    color_tag:    str
    icon_name:    str | None
    is_archived:  bool
    owner_id:     UUID
    created_at:   datetime
    updated_at:   datetime
    member_count: int = 0
    credential_count: int = 0

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    total: int
