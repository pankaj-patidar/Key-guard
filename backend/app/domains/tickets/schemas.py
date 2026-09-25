from uuid import UUID
from datetime import datetime, date
from typing import Any
from pydantic import BaseModel, Field
from app.domains.tickets.models import TicketType, TicketStatus, TicketPriority


class UserMini(BaseModel):
    id: UUID
    full_name: str
    avatar_url: str | None = None
    model_config = {"from_attributes": True}


class LabelOut(BaseModel):
    id: UUID
    name: str
    color: str
    model_config = {"from_attributes": True}


class SprintDetailOut(BaseModel):
    start_date: date | None
    end_date: date | None
    goal: str | None
    is_active: bool
    model_config = {"from_attributes": True}


class TicketBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    type: TicketType
    status: TicketStatus = TicketStatus.BACKLOG
    priority: TicketPriority = TicketPriority.MEDIUM
    description: dict[str, Any] | None = None
    epic_id: UUID | None = None
    sprint_id: UUID | None = None
    assignee_id: UUID | None = None
    owner_id: UUID | None = None
    story_points: int | None = Field(default=None, ge=0, le=100)
    due_date: date | None = None


class TicketCreate(TicketBase):
    sprint_start_date: date | None = None
    sprint_end_date: date | None = None
    sprint_goal: str | None = None
    label_ids: list[UUID] = Field(default_factory=list)


class TicketUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    status: TicketStatus | None = None
    priority: TicketPriority | None = None
    description: dict[str, Any] | None = None
    epic_id: UUID | None = None
    sprint_id: UUID | None = None
    assignee_id: UUID | None = None
    owner_id: UUID | None = None
    story_points: int | None = Field(default=None, ge=0, le=100)
    due_date: date | None = None
    position: float | None = None
    label_ids: list[UUID] | None = None


class TicketOut(BaseModel):
    id: UUID
    ticket_number: int
    project_id: UUID
    title: str
    type: TicketType
    status: TicketStatus
    priority: TicketPriority
    epic_id: UUID | None
    sprint_id: UUID | None
    assignee: UserMini | None
    owner: UserMini | None
    reporter: UserMini | None
    story_points: int | None
    due_date: date | None
    position: float
    is_archived: bool
    labels: list[LabelOut] = []
    sprint_detail: SprintDetailOut | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class TicketDetail(TicketOut):
    description: dict[str, Any] | None = None


class BoardColumn(BaseModel):
    status: TicketStatus
    tickets: list[TicketOut]


class BoardOut(BaseModel):
    columns: list[BoardColumn]


class LabelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")
