from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException
from app.domains.tickets.models import Ticket, TicketType, TicketStatus
from app.domains.tickets.schemas import TicketCreate
from app.domains.tickets import service as ticket_service


async def list_epics(project_id: UUID, db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(Ticket).where(
            Ticket.project_id == project_id,
            Ticket.type == TicketType.EPIC,
            Ticket.is_archived == False,
        ).order_by(Ticket.created_at.desc())
    )
    epics = result.scalars().all()
    output = []
    for epic in epics:
        total_result = await db.execute(
            select(func.count()).select_from(Ticket).where(Ticket.epic_id == epic.id)
        )
        done_result = await db.execute(
            select(func.count()).select_from(Ticket).where(
                Ticket.epic_id == epic.id, Ticket.status == TicketStatus.DONE
            )
        )
        total = total_result.scalar() or 0
        done = done_result.scalar() or 0
        output.append({**epic.__dict__, "total_tickets": total, "done_tickets": done})
    return output


async def create_epic(project_id: UUID, title: str, reporter_id: UUID, db: AsyncSession) -> Ticket:
    data = TicketCreate(title=title, type=TicketType.EPIC)
    return await ticket_service.create_ticket(project_id, data, reporter_id, db)


async def get_epic_tickets(epic_id: UUID, db: AsyncSession) -> list[Ticket]:
    result = await db.execute(select(Ticket).where(Ticket.epic_id == epic_id))
    return list(result.scalars().all())


async def link_ticket_to_epic(epic_id: UUID, ticket_id: UUID, db: AsyncSession) -> Ticket:
    ticket = await ticket_service.get_ticket(ticket_id, db)
    ticket.epic_id = epic_id
    await db.commit()
    await db.refresh(ticket)
    return ticket


async def unlink_ticket_from_epic(ticket_id: UUID, db: AsyncSession) -> None:
    ticket = await ticket_service.get_ticket(ticket_id, db)
    ticket.epic_id = None
    await db.commit()
