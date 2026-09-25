from uuid import UUID
from datetime import datetime
from typing import Any
from pydantic import BaseModel


class UserMini(BaseModel):
    id: UUID
    full_name: str
    avatar_url: str | None = None
    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    content: dict[str, Any]
    parent_id: UUID | None = None


class CommentUpdate(BaseModel):
    content: dict[str, Any]


class CommentOut(BaseModel):
    id: UUID
    ticket_id: UUID
    author: UserMini
    content: dict[str, Any]
    parent_id: UUID | None
    is_edited: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ActivityOut(BaseModel):
    id: UUID
    ticket_id: UUID
    actor: UserMini
    action: str
    old_value: dict[str, Any] | None
    new_value: dict[str, Any] | None
    created_at: datetime
    model_config = {"from_attributes": True}
