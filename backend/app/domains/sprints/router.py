from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.security.dependencies import get_current_user
from app.domains.sprints import service
from app.domains.sprints.schemas import SprintCreate, SprintOut, AddTicketToSprint
from app.domains.sprints.service import SprintConflictError
from app.domains.roles.rbac import require_permission
from app.domains.tickets import service as ticket_service
from app.domains.tickets.models import Ticket, TicketType

router = APIRouter(prefix="/api/v1/projects/{project_id}", tags=["sprints"])


def _sprint_to_out(sprint: Ticket) -> SprintOut:
    return SprintOut.from_ticket(sprint)


@router.get("/sprints", response_model=list[SprintOut])
async def list_sprints(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sprints = await service.list_sprints(project_id, db)
    return [_sprint_to_out(s) for s in sprints]


@router.post("/sprints", response_model=SprintOut, status_code=status.HTTP_201_CREATED)
async def create_sprint(
    project_id: UUID,
    data: SprintCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("sprint:create", current_user, db, project_id=project_id)
    sprint = await service.create_sprint(
        project_id, data.title, current_user.id, db,
        start_date=data.start_date, end_date=data.end_date, goal=data.goal,
    )
    return _sprint_to_out(sprint)


@router.get("/sprints/{sprint_id}", response_model=SprintOut)
async def get_sprint(
    project_id: UUID,
    sprint_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Ticket).where(Ticket.id == sprint_id, Ticket.type == TicketType.SPRINT))
    sprint = result.scalar_one_or_none()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return _sprint_to_out(sprint)


@router.post("/sprints/{sprint_id}/activate", response_model=SprintOut)
async def activate_sprint(
    project_id: UUID,
    sprint_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("sprint:activate", current_user, db, project_id=project_id)
    try:
        sprint = await service.activate_sprint(sprint_id, db)
        return _sprint_to_out(sprint)
    except SprintConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/sprints/{sprint_id}/close", response_model=SprintOut)
async def close_sprint(
    project_id: UUID,
    sprint_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("sprint:close", current_user, db, project_id=project_id)
    sprint = await service.close_sprint(sprint_id, db)
    return _sprint_to_out(sprint)


@router.post("/sprints/{sprint_id}/tickets", status_code=status.HTTP_200_OK)
async def add_ticket_to_sprint(
    project_id: UUID,
    sprint_id: UUID,
    data: AddTicketToSprint,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("ticket:move_sprint", current_user, db, project_id=project_id)
    ticket = await ticket_service.get_ticket_by_number(project_id, data.ticket_number, db)
    return await service.add_ticket_to_sprint(sprint_id, ticket.id, db)


@router.delete("/sprints/{sprint_id}/tickets/{ticket_number}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_ticket_from_sprint(
    project_id: UUID,
    sprint_id: UUID,
    ticket_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("ticket:move_sprint", current_user, db, project_id=project_id)
    ticket = await ticket_service.get_ticket_by_number(project_id, ticket_number, db)
    await service.remove_ticket_from_sprint(sprint_id, ticket.id, db)
