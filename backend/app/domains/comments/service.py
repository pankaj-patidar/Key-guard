from uuid import UUID
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from app.domains.comments.models import TicketComment, TicketActivity


async def list_comments(ticket_id: UUID, db: AsyncSession) -> list[TicketComment]:
    result = await db.execute(
        select(TicketComment)
        .where(TicketComment.ticket_id == ticket_id, TicketComment.parent_id.is_(None))
        .order_by(TicketComment.created_at.asc())
    )
    return list(result.scalars().all())


async def create_comment(
    ticket_id: UUID,
    author_id: UUID,
    content: dict[str, Any],
    db: AsyncSession,
    parent_id: UUID | None = None,
) -> TicketComment:
    comment = TicketComment(
        ticket_id=ticket_id,
        author_id=author_id,
        content=content,
        parent_id=parent_id,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    # Notify watchers of the ticket
    try:
        from app.domains.tickets.service import get_ticket
        from app.domains.notifications.service import notify_watchers
        from app.domains.notifications.models import NotificationType
        ticket = await get_ticket(ticket_id, db)
        await notify_watchers(
            ticket, author_id, NotificationType.COMMENTED,
            f"New comment on ticket #{ticket.ticket_number}",
            db,
        )
    except Exception:
        pass  # never let notification errors break comment creation

    return comment


async def update_comment(
    comment_id: UUID,
    editor_id: UUID,
    content: dict[str, Any],
    db: AsyncSession,
) -> TicketComment:
    result = await db.execute(select(TicketComment).where(TicketComment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if str(comment.author_id) != str(editor_id):
        raise HTTPException(status_code=403, detail="You can only edit your own comments")
    comment.content = content
    comment.is_edited = True
    await db.commit()
    await db.refresh(comment)
    return comment


async def delete_comment(comment_id: UUID, requester_id: UUID, db: AsyncSession) -> None:
    result = await db.execute(select(TicketComment).where(TicketComment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if str(comment.author_id) != str(requester_id):
        raise HTTPException(status_code=403, detail="You can only delete your own comments")
    await db.delete(comment)
    await db.commit()


async def list_activity(ticket_id: UUID, db: AsyncSession) -> list[TicketActivity]:
    result = await db.execute(
        select(TicketActivity)
        .where(TicketActivity.ticket_id == ticket_id)
        .order_by(TicketActivity.created_at.asc())
    )
    return list(result.scalars().all())


async def record_activity(
    ticket_id: UUID,
    actor_id: UUID,
    action: str,
    old_value: dict[str, Any] | None,
    new_value: dict[str, Any] | None,
    db: AsyncSession,
) -> TicketActivity:
    """Called by ticket service on every mutation. Never called by routers directly."""
    activity = TicketActivity(
        ticket_id=ticket_id,
        actor_id=actor_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(activity)
    await db.flush()
    return activity
