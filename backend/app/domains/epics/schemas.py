from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class EpicCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: dict | None = None


class EpicOut(BaseModel):
    id: UUID
    ticket_number: int
    project_id: UUID
    title: str
    is_archived: bool
    created_at: datetime
    total_tickets: int = 0
    done_tickets: int = 0
    model_config = {"from_attributes": True}
