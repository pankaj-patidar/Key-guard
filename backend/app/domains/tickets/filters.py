from uuid import UUID
from sqlalchemy import select
from app.domains.tickets.models import Ticket, TicketStatus, BOARD_STATUSES, PARKING_LOT_STATUSES


def board_query(project_id: UUID):
    return (
        select(Ticket)
        .where(
            Ticket.project_id == project_id,
            Ticket.status.in_(BOARD_STATUSES),
            Ticket.is_archived == False,
            Ticket.type.not_in(["epic", "sprint"]),
        )
        .order_by(Ticket.status, Ticket.position)
    )


def parking_lot_query(project_id: UUID):
    return (
        select(Ticket)
        .where(
            Ticket.project_id == project_id,
            Ticket.status.in_(PARKING_LOT_STATUSES),
            Ticket.is_archived == False,
        )
        .order_by(Ticket.updated_at.desc())
    )


def backlog_query(project_id: UUID):
    return (
        select(Ticket)
        .where(
            Ticket.project_id == project_id,
            Ticket.sprint_id.is_(None),
            Ticket.is_archived == False,
            Ticket.type.not_in(["epic", "sprint"]),
        )
        .order_by(Ticket.priority, Ticket.position)
    )
