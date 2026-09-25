from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from ..database import get_db
from ..models.project import Project, ProjectAssignment
from ..models.user import User, UserRole
from ..domains.tickets.models import Ticket, TicketType, TicketStatus
from ..security.dependencies import CurrentUser

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

ACTIVE_STATUSES = {TicketStatus.TODO, TicketStatus.IN_PROGRESS, TicketStatus.IN_REVIEW}
DONE_STATUS     = TicketStatus.DONE


@router.get("/stats")
async def dashboard_stats(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    uid = current_user.id
    is_admin_or_pm = current_user.role in (UserRole.ADMIN, UserRole.PM)

    # My projects
    if is_admin_or_pm:
        my_project_ids = (await db.scalars(select(Project.id))).all()
    else:
        my_project_ids = (await db.scalars(
            select(ProjectAssignment.project_id).where(ProjectAssignment.user_id == uid)
        )).all()
    my_project_ids = list(my_project_ids)

    base_ticket = (
        select(Ticket)
        .where(Ticket.project_id.in_(my_project_ids))
        .where(Ticket.type.notin_([TicketType.EPIC, TicketType.SPRINT]))
    )

    # My assigned tasks (open / in-progress / done)
    my_open       = await db.scalar(select(func.count()).select_from(
        base_ticket.where(Ticket.assignee_id == uid)
        .where(Ticket.status.in_([TicketStatus.BACKLOG, TicketStatus.TODO])).subquery()))
    my_in_progress = await db.scalar(select(func.count()).select_from(
        base_ticket.where(Ticket.assignee_id == uid)
        .where(Ticket.status.in_([TicketStatus.IN_PROGRESS, TicketStatus.IN_REVIEW])).subquery()))
    my_done       = await db.scalar(select(func.count()).select_from(
        base_ticket.where(Ticket.assignee_id == uid)
        .where(Ticket.status == DONE_STATUS).subquery()))

    result = {
        "my_project_count":   len(my_project_ids),
        "my_open_tasks":      my_open      or 0,
        "my_in_progress":     my_in_progress or 0,
        "my_done_tasks":      my_done      or 0,
    }

    if is_admin_or_pm:
        total_open = await db.scalar(select(func.count()).select_from(
            base_ticket.where(Ticket.status != DONE_STATUS).subquery()))
        total_done = await db.scalar(select(func.count()).select_from(
            base_ticket.where(Ticket.status == DONE_STATUS).subquery()))
        total_users = await db.scalar(select(func.count()).select_from(User))
        result.update({
            "total_open_tasks":  total_open  or 0,
            "total_done_tasks":  total_done  or 0,
            "total_users":       total_users or 0,
        })

    return result


@router.get("/my-tasks")
async def my_tasks(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    """Return up to 10 open tickets assigned to the current user across all their projects."""
    uid = current_user.id
    is_admin_or_pm = current_user.role in (UserRole.ADMIN, UserRole.PM)

    if is_admin_or_pm:
        project_ids = (await db.scalars(select(Project.id))).all()
    else:
        project_ids = (await db.scalars(
            select(ProjectAssignment.project_id).where(ProjectAssignment.user_id == uid)
        )).all()

    tickets = (await db.scalars(
        select(Ticket)
        .where(Ticket.assignee_id == uid)
        .where(Ticket.project_id.in_(list(project_ids)))
        .where(Ticket.type.notin_([TicketType.EPIC, TicketType.SPRINT]))
        .where(Ticket.status != DONE_STATUS)
        .order_by(Ticket.priority.asc(), Ticket.created_at.desc())
        .limit(10)
    )).all()

    # attach project name
    projects = {p.id: p for p in (await db.scalars(
        select(Project).where(Project.id.in_(list(project_ids)))
    )).all()}

    return [
        {
            "id":            str(t.id),
            "ticket_number": t.ticket_number,
            "project_id":    str(t.project_id),
            "project_name":  projects.get(t.project_id, type("", (), {"name": "?"})()).name,
            "title":         t.title,
            "status":        t.status.value,
            "priority":      t.priority.value,
            "type":          t.type.value,
        }
        for t in tickets
    ]


@router.get("/project-breakdown")
async def project_breakdown(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    """Return ticket status counts per project."""
    uid = current_user.id
    is_admin_or_pm = current_user.role in (UserRole.ADMIN, UserRole.PM)

    if is_admin_or_pm:
        projects = (await db.scalars(select(Project).limit(10))).all()
    else:
        project_ids = (await db.scalars(
            select(ProjectAssignment.project_id).where(ProjectAssignment.user_id == uid)
        )).all()
        projects = (await db.scalars(
            select(Project).where(Project.id.in_(list(project_ids))).limit(10)
        )).all()

    result = []
    for p in projects:
        base = (
            select(func.count()).select_from(Ticket)
            .where(Ticket.project_id == p.id)
            .where(Ticket.type.notin_([TicketType.EPIC, TicketType.SPRINT]))
        )
        total    = await db.scalar(base) or 0
        done     = await db.scalar(base.where(Ticket.status == DONE_STATUS)) or 0
        active   = await db.scalar(base.where(Ticket.status.in_(list(ACTIVE_STATUSES)))) or 0

        # member count
        members = await db.scalar(
            select(func.count()).select_from(ProjectAssignment)
            .where(ProjectAssignment.project_id == p.id)
        ) or 0

        result.append({
            "id":         str(p.id),
            "name":       p.name,
            "color_tag":  p.color_tag,
            "total":      total,
            "done":       done,
            "active":     active,
            "todo":       total - done - active,
            "members":    members,
        })

    return result
