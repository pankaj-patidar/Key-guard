from uuid import UUID
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from app.domains.tickets.models import Ticket, TicketType, TicketStatus, SprintDetail
from app.domains.tickets.schemas import TicketCreate
from app.domains.tickets import service as ticket_service


class SprintConflictError(Exception):
    pass


async def _get_sprint_ticket(sprint_id: UUID, db: AsyncSession) -> Ticket:
    result = await db.execute(
        select(Ticket).where(Ticket.id == sprint_id, Ticket.type == TicketType.SPRINT)
    )
    sprint = result.scalar_one_or_none()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return sprint


async def list_sprints(project_id: UUID, db: AsyncSession) -> list[Ticket]:
    result = await db.execute(
        select(Ticket)
        .where(Ticket.project_id == project_id, Ticket.type == TicketType.SPRINT)
        .order_by(Ticket.created_at.desc())
    )
    return list(result.scalars().all())


async def create_sprint(
    project_id: UUID,
    title: str,
    reporter_id: UUID,
    db: AsyncSession,
    start_date: date | None = None,
    end_date: date | None = None,
    goal: str | None = None,
) -> Ticket:
    data = TicketCreate(
        title=title,
        type=TicketType.SPRINT,
        sprint_start_date=start_date,
        sprint_end_date=end_date,
        sprint_goal=goal,
    )
    return await ticket_service.create_ticket(project_id, data, reporter_id, db)


async def activate_sprint(sprint_id: UUID, db: AsyncSession) -> Ticket:
    sprint = await _get_sprint_ticket(sprint_id, db)

    # Check no other sprint is active in this project
    result = await db.execute(
        select(SprintDetail)
        .join(Ticket, Ticket.id == SprintDetail.ticket_id)
        .where(
            Ticket.project_id == sprint.project_id,
            SprintDetail.is_active == True,
            Ticket.id != sprint_id,
        )
    )
    active = result.scalar_one_or_none()
    if active:
        raise SprintConflictError("Another sprint is already active. Close it before activating a new one.")

    if sprint.sprint_detail:
        sprint.sprint_detail.is_active = True
        if not sprint.sprint_detail.start_date:
            sprint.sprint_detail.start_date = date.today()
    await db.commit()
    await db.refresh(sprint)
    return sprint


async def close_sprint(sprint_id: UUID, db: AsyncSession) -> Ticket:
    sprint = await _get_sprint_ticket(sprint_id, db)

    # Move all non-done tickets back to backlog
    result = await db.execute(
        select(Ticket).where(
            Ticket.sprint_id == sprint_id,
            Ticket.status != TicketStatus.DONE,
            Ticket.status != TicketStatus.CANCELLED,
        )
    )
    incomplete = result.scalars().all()
    for t in incomplete:
        t.status = TicketStatus.BACKLOG
        t.sprint_id = None

    if sprint.sprint_detail:
        sprint.sprint_detail.is_active = False

    await db.commit()
    await db.refresh(sprint)
    return sprint


async def add_ticket_to_sprint(sprint_id: UUID, ticket_id: UUID, db: AsyncSession) -> Ticket:
    ticket = await ticket_service.get_ticket(ticket_id, db)
    ticket.sprint_id = sprint_id
    await db.commit()
    await db.refresh(ticket)
    return ticket


async def remove_ticket_from_sprint(sprint_id: UUID, ticket_id: UUID, db: AsyncSession) -> None:
    ticket = await ticket_service.get_ticket(ticket_id, db)
    if str(ticket.sprint_id) != str(sprint_id):
        raise HTTPException(status_code=400, detail="Ticket is not in this sprint")
    ticket.sprint_id = None
    await db.commit()
