from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.security.dependencies import get_current_user
from app.domains.epics import service
from app.domains.epics.schemas import EpicCreate, EpicOut
from app.domains.roles.rbac import require_permission
from app.domains.tickets.schemas import TicketOut

router = APIRouter(prefix="/api/v1/projects/{project_id}", tags=["epics"])


@router.get("/epics", response_model=list[EpicOut])
async def list_epics(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_epics(project_id, db)


@router.post("/epics", response_model=EpicOut, status_code=status.HTTP_201_CREATED)
async def create_epic(
    project_id: UUID,
    data: EpicCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("epic:create", current_user, db, project_id=project_id)
    return await service.create_epic(project_id, data.title, current_user.id, db)


@router.get("/epics/{epic_id}/tickets", response_model=list[TicketOut])
async def get_epic_tickets(
    project_id: UUID,
    epic_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_epic_tickets(epic_id, db)
