from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.security.dependencies import get_current_user
from app.domains.tickets import service
from app.domains.tickets.schemas import (
    TicketCreate, TicketUpdate, TicketOut, TicketDetail, BoardOut, LabelCreate, LabelOut,
)
from app.domains.roles.rbac import require_permission

router = APIRouter(prefix="/api/v1/projects/{project_id}", tags=["tickets"])


@router.get("/board", response_model=BoardOut)
async def get_board(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_board(project_id, db)


@router.get("/parking-lot", response_model=list[TicketOut])
async def get_parking_lot(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_parking_lot(project_id, db)


@router.get("/backlog", response_model=list[TicketOut])
async def get_backlog(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_backlog(project_id, db)


@router.get("/tickets", response_model=list[TicketOut])
async def list_tickets(
    project_id: UUID,
    assignee_id: UUID | None = Query(default=None),
    type: str | None = Query(default=None),
    sprint_id: UUID | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_tickets(project_id, db, assignee_id=assignee_id, type=type, sprint_id=sprint_id)


@router.get("/tickets/{ticket_number}", response_model=TicketDetail)
async def get_ticket(
    project_id: UUID,
    ticket_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_ticket_by_number(project_id, ticket_number, db)


@router.post("/tickets", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    project_id: UUID,
    data: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.type.value == "epic":
        await require_permission("ticket:create_epic", current_user, db, project_id=project_id)
    elif data.type.value == "sprint":
        await require_permission("ticket:create_sprint", current_user, db, project_id=project_id)
    else:
        await require_permission("ticket:create_sub", current_user, db, project_id=project_id)

    return await service.create_ticket(project_id, data, current_user.id, db)


@router.patch("/tickets/{ticket_number}", response_model=TicketOut)
async def update_ticket(
    project_id: UUID,
    ticket_number: int,
    data: TicketUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("ticket:edit_own", current_user, db, project_id=project_id)
    ticket = await service.get_ticket_by_number(project_id, ticket_number, db)
    return await service.update_ticket(ticket.id, data, current_user.id, db)


@router.delete("/tickets/{ticket_number}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ticket(
    project_id: UUID,
    ticket_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("ticket:delete", current_user, db, project_id=project_id)
    ticket = await service.get_ticket_by_number(project_id, ticket_number, db)
    await service.delete_ticket(ticket.id, db)


@router.get("/labels", response_model=list[LabelOut])
async def list_labels(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_labels(project_id, db)


@router.post("/labels", response_model=LabelOut, status_code=status.HTTP_201_CREATED)
async def create_label(
    project_id: UUID,
    data: LabelCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_label(project_id, data.name, data.color, db)
