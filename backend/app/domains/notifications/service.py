from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from app.domains.notifications.models import Notification, NotificationType
from app.domains.tickets.models import Ticket, TicketWatcher


async def create_notification(
    recipient_id: UUID,
    actor_id: UUID | None,
    type: NotificationType,
    message: str,
    db: AsyncSession,
    ticket_id: UUID | None = None,
    project_id: UUID | None = None,
) -> Notification:
    notif = Notification(
        recipient_id=recipient_id,
        actor_id=actor_id,
        type=type,
        message=message,
        ticket_id=ticket_id,
        project_id=project_id,
    )
    db.add(notif)
    await db.flush()
    return notif


async def notify_watchers(
    ticket: Ticket,
    actor_id: UUID,
    type: NotificationType,
    message_template: str,
    db: AsyncSession,
) -> None:
    """Notify all watchers of a ticket, excluding the actor."""
    result = await db.execute(
        select(TicketWatcher).where(
            TicketWatcher.ticket_id == ticket.id,
            TicketWatcher.user_id != actor_id,
        )
    )
    watchers = result.scalars().all()
    for w in watchers:
        await create_notification(
            recipient_id=w.user_id,
            actor_id=actor_id,
            type=type,
            message=message_template,
            db=db,
            ticket_id=ticket.id,
            project_id=ticket.project_id,
        )
    await db.commit()


async def list_notifications(
    recipient_id: UUID,
    db: AsyncSession,
    limit: int = 50,
    offset: int = 0,
) -> list[Notification]:
    result = await db.execute(
        select(Notification)
        .where(Notification.recipient_id == recipient_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


async def get_unread_count(recipient_id: UUID, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).select_from(Notification).where(
            Notification.recipient_id == recipient_id,
            Notification.is_read == False,
        )
    )
    return result.scalar() or 0


async def mark_read(notification_id: UUID, recipient_id: UUID, db: AsyncSession) -> None:
    await db.execute(
        update(Notification)
        .where(Notification.id == notification_id, Notification.recipient_id == recipient_id)
        .values(is_read=True)
    )
    await db.commit()


async def mark_all_read(recipient_id: UUID, db: AsyncSession) -> None:
    await db.execute(
        update(Notification)
        .where(Notification.recipient_id == recipient_id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
