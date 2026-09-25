from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field


class SprintCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    start_date: date | None = None
    end_date: date | None = None
    goal: str | None = None


class SprintUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    start_date: date | None = None
    end_date: date | None = None
    goal: str | None = None


class SprintOut(BaseModel):
    id: UUID
    ticket_number: int
    project_id: UUID
    title: str
    start_date: date | None = None
    end_date: date | None = None
    goal: str | None = None
    is_active: bool = False
    created_at: datetime
    model_config = {"from_attributes": True}

    @classmethod
    def from_ticket(cls, ticket) -> "SprintOut":
        detail = ticket.sprint_detail
        return cls(
            id=ticket.id,
            ticket_number=ticket.ticket_number,
            project_id=ticket.project_id,
            title=ticket.title,
            start_date=detail.start_date if detail else None,
            end_date=detail.end_date if detail else None,
            goal=detail.goal if detail else None,
            is_active=detail.is_active if detail else False,
            created_at=ticket.created_at,
        )


class AddTicketToSprint(BaseModel):
    ticket_number: int
