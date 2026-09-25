from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.security.dependencies import get_current_user
from app.domains.comments import service
from app.domains.comments.schemas import CommentCreate, CommentUpdate, CommentOut, ActivityOut

router = APIRouter(prefix="/api/v1/projects/{project_id}/tickets/{ticket_number}", tags=["comments"])


@router.get("/comments", response_model=list[CommentOut])
async def list_comments(
    project_id: UUID,
    ticket_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.domains.tickets.service import get_ticket_by_number
    ticket = await get_ticket_by_number(project_id, ticket_number, db)
    return await service.list_comments(ticket.id, db)


@router.post("/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def create_comment(
    project_id: UUID,
    ticket_number: int,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.domains.tickets.service import get_ticket_by_number
    ticket = await get_ticket_by_number(project_id, ticket_number, db)
    return await service.create_comment(ticket.id, current_user.id, data.content, db, parent_id=data.parent_id)


@router.patch("/comments/{comment_id}", response_model=CommentOut)
async def update_comment(
    project_id: UUID,
    ticket_number: int,
    comment_id: UUID,
    data: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.update_comment(comment_id, current_user.id, data.content, db)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    project_id: UUID,
    ticket_number: int,
    comment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_comment(comment_id, current_user.id, db)


@router.get("/activity", response_model=list[ActivityOut])
async def list_activity(
    project_id: UUID,
    ticket_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.domains.tickets.service import get_ticket_by_number
    ticket = await get_ticket_by_number(project_id, ticket_number, db)
    return await service.list_activity(ticket.id, db)
