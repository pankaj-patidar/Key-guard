from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.domains.tickets.models import (
    Ticket, TicketStatus, SprintDetail, Label, ProjectTicketCounter,
    TicketWatcher, BOARD_STATUSES, ticket_labels_table,
)
from app.domains.tickets.schemas import TicketCreate, TicketUpdate, BoardOut, BoardColumn
from app.domains.tickets import filters
from app.domains.comments import service as activity_service


def _with_relations(stmt):
    return stmt.options(
        selectinload(Ticket.assignee),
        selectinload(Ticket.owner),
        selectinload(Ticket.reporter),
        selectinload(Ticket.labels),
        selectinload(Ticket.sprint_detail),
    )


async def _next_ticket_number(project_id: UUID, db: AsyncSession) -> int:
    """Atomically increments the project counter and returns the new number."""
    result = await db.execute(
        text("""
            INSERT INTO project_ticket_counter (project_id, last_number)
            VALUES (:pid, 1)
            ON CONFLICT (project_id) DO UPDATE
                SET last_number = project_ticket_counter.last_number + 1
            RETURNING last_number
        """),
        {"pid": str(project_id)},
    )
    return result.scalar_one()


async def _compute_position(project_id: UUID, status: TicketStatus, db: AsyncSession) -> float:
    stmt = (
        select(Ticket.position)
        .where(Ticket.project_id == project_id, Ticket.status == status)
        .order_by(Ticket.position.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    last = result.scalar_one_or_none()
    return (last or 0.0) + 1.0


async def get_ticket(ticket_id: UUID, db: AsyncSession) -> Ticket:
    result = await db.execute(_with_relations(select(Ticket).where(Ticket.id == ticket_id)))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


async def get_ticket_by_number(project_id: UUID, number: int, db: AsyncSession) -> Ticket:
    result = await db.execute(
        _with_relations(select(Ticket).where(Ticket.project_id == project_id, Ticket.ticket_number == number))
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


async def list_tickets(project_id: UUID, db: AsyncSession, **filter_kwargs) -> list[Ticket]:
    stmt = _with_relations(select(Ticket).where(
        Ticket.project_id == project_id,
        Ticket.is_archived == False,
    ).order_by(Ticket.status, Ticket.position))

    if assignee_id := filter_kwargs.get("assignee_id"):
        stmt = stmt.where(Ticket.assignee_id == assignee_id)
    if type_ := filter_kwargs.get("type"):
        stmt = stmt.where(Ticket.type == type_)
    if sprint_id := filter_kwargs.get("sprint_id"):
        stmt = stmt.where(Ticket.sprint_id == sprint_id)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_ticket(
    project_id: UUID, data: TicketCreate, reporter_id: UUID, db: AsyncSession
) -> Ticket:
    ticket_number = await _next_ticket_number(project_id, db)
    position = await _compute_position(project_id, data.status, db)

    ticket = Ticket(
        ticket_number=ticket_number,
        project_id=project_id,
        reporter_id=reporter_id,
        position=position,
        **data.model_dump(exclude={"sprint_start_date", "sprint_end_date", "sprint_goal", "label_ids"}),
    )
    db.add(ticket)
    await db.flush()

    # Sprint detail
    if data.type.value == "sprint":
        detail = SprintDetail(
            ticket_id=ticket.id,
            start_date=data.sprint_start_date,
            end_date=data.sprint_end_date,
            goal=data.sprint_goal,
        )
        db.add(detail)

    # Labels
    if data.label_ids:
        for label_id in data.label_ids:
            await db.execute(
                ticket_labels_table.insert().values(ticket_id=ticket.id, label_id=label_id)
            )

    # Auto-watch: reporter and assignee
    watcher_ids = {reporter_id}
    if data.assignee_id:
        watcher_ids.add(data.assignee_id)
    for uid in watcher_ids:
        db.add(TicketWatcher(ticket_id=ticket.id, user_id=uid))

    await db.commit()
    return await get_ticket(ticket.id, db)


async def update_ticket(ticket_id: UUID, data: TicketUpdate, actor_id: UUID, db: AsyncSession) -> Ticket:
    ticket = await get_ticket(ticket_id, db)

    update_data = data.model_dump(exclude_unset=True, exclude={"label_ids"})
    for field, new_val in update_data.items():
        old_val = getattr(ticket, field, None)
        if old_val != new_val:
            await activity_service.record_activity(
                ticket.id, actor_id, f"{field}_changed",
                {field: str(old_val) if old_val is not None else None},
                {field: str(new_val) if new_val is not None else None},
                db,
            )
        setattr(ticket, field, new_val)

    if data.label_ids is not None:
        await db.execute(ticket_labels_table.delete().where(ticket_labels_table.c.ticket_id == ticket_id))
        for label_id in data.label_ids:
            await db.execute(ticket_labels_table.insert().values(ticket_id=ticket_id, label_id=label_id))

    await db.commit()

    # Notify new assignee
    if "assignee_id" in update_data and update_data["assignee_id"]:
        from app.domains.notifications.service import create_notification
        from app.domains.notifications.models import NotificationType
        await create_notification(
            recipient_id=update_data["assignee_id"],
            actor_id=actor_id,
            type=NotificationType.ASSIGNED,
            message=f"You were assigned to ticket #{ticket.ticket_number}",
            db=db,
            ticket_id=ticket.id,
            project_id=ticket.project_id,
        )
        await db.commit()

    # Notify watchers on status change
    if "status" in update_data:
        from app.domains.notifications.service import notify_watchers
        from app.domains.notifications.models import NotificationType
        await notify_watchers(
            ticket, actor_id, NotificationType.STATUS_CHANGED,
            f"Status changed to {update_data['status'].replace('_', ' ')} on ticket #{ticket.ticket_number}",
            db,
        )

    return await get_ticket(ticket_id, db)


async def delete_ticket(ticket_id: UUID, db: AsyncSession) -> None:
    ticket = await get_ticket(ticket_id, db)
    await db.delete(ticket)
    await db.commit()


async def get_board(project_id: UUID, db: AsyncSession) -> BoardOut:
    stmt = _with_relations(filters.board_query(project_id))
    result = await db.execute(stmt)
    tickets = result.scalars().all()

    columns = []
    for s in BOARD_STATUSES:
        columns.append(BoardColumn(
            status=s,
            tickets=[t for t in tickets if t.status == s],
        ))
    return BoardOut(columns=columns)


async def get_parking_lot(project_id: UUID, db: AsyncSession) -> list[Ticket]:
    result = await db.execute(_with_relations(filters.parking_lot_query(project_id)))
    return list(result.scalars().all())


async def get_backlog(project_id: UUID, db: AsyncSession) -> list[Ticket]:
    result = await db.execute(_with_relations(filters.backlog_query(project_id)))
    return list(result.scalars().all())


async def list_labels(project_id: UUID, db: AsyncSession) -> list[Label]:
    result = await db.execute(select(Label).where(Label.project_id == project_id))
    return list(result.scalars().all())


async def create_label(project_id: UUID, name: str, color: str, db: AsyncSession) -> Label:
    label = Label(project_id=project_id, name=name, color=color)
    db.add(label)
    await db.commit()
    await db.refresh(label)
    return label
