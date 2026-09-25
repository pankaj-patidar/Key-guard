import re
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from ..database import get_db
from ..models.project import Project, ProjectAssignment
from ..models.user import User, UserRole
from ..schemas.project import (ProjectCreate, ProjectUpdate, ProjectResponse,
                                AssignmentCreate, AssignmentResponse, ProjectListResponse)
from ..security.dependencies import CurrentUser, require_roles

router = APIRouter(prefix="/projects", tags=["projects"])


def _slugify(name: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", name.lower()).strip()
    slug = re.sub(r"[\s_-]+", "-", slug)
    return slug[:80]


def _can_manage(user: User) -> bool:
    return user.role in (UserRole.ADMIN, UserRole.PM)


async def _get_project_or_404(project_id: UUID, db: AsyncSession) -> Project:
    p = await db.get(Project, project_id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found.")
    return p


async def _assert_member_or_manager(project_id: UUID, user: User, db: AsyncSession):
    if _can_manage(user):
        return
    asgn = await db.scalar(
        select(ProjectAssignment).where(
            ProjectAssignment.user_id   == user.id,
            ProjectAssignment.project_id == project_id,
        )
    )
    if not asgn:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this project.")


@router.get("/", response_model=ProjectListResponse)
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    current_user: CurrentUser = ...,
    db: AsyncSession = Depends(get_db),
):
    q = select(Project)
    if not _can_manage(current_user):
        # filter to assigned only
        assigned_ids = (await db.scalars(
            select(ProjectAssignment.project_id).where(
                ProjectAssignment.user_id == current_user.id
            )
        )).all()
        q = q.where(Project.id.in_(assigned_ids))

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    projects = (await db.scalars(q.offset(skip).limit(limit))).all()

    items = []
    for p in projects:
        mc = await db.scalar(
            select(func.count()).select_from(ProjectAssignment)
            .where(ProjectAssignment.project_id == p.id)
        )
        from ..models.credential import Credential
        cc = await db.scalar(
            select(func.count()).select_from(Credential)
            .where(Credential.project_id == p.id)
        )
        resp = ProjectResponse.model_validate(p)
        resp.member_count = mc or 0
        resp.credential_count = cc or 0
        items.append(resp)

    return ProjectListResponse(items=items, total=total)


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    payload: ProjectCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    if not _can_manage(current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only Admins and PMs can create projects.")

    base_slug = _slugify(payload.name)
    slug = base_slug
    counter = 1
    while await db.scalar(select(Project).where(Project.slug == slug)):
        slug = f"{base_slug}-{counter}"
        counter += 1

    project = Project(
        name=payload.name,
        description=payload.description,
        slug=slug,
        color_tag=payload.color_tag,
        icon_name=payload.icon_name,
        owner_id=current_user.id,
    )
    db.add(project)
    await db.flush()

    # Owner is auto-assigned with full permissions
    db.add(ProjectAssignment(
        user_id=current_user.id,
        project_id=project.id,
        can_reveal=True,
        can_edit=True,
        assigned_by=current_user.id,
    ))
    await db.commit()
    await db.refresh(project)

    resp = ProjectResponse.model_validate(project)
    resp.member_count = 1
    resp.credential_count = 0
    return resp


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    await _assert_member_or_manager(project_id, current_user, db)
    project = await _get_project_or_404(project_id, db)
    from ..models.credential import Credential
    mc = await db.scalar(select(func.count()).select_from(ProjectAssignment).where(ProjectAssignment.project_id == project_id))
    cc = await db.scalar(select(func.count()).select_from(Credential).where(Credential.project_id == project_id))
    resp = ProjectResponse.model_validate(project)
    resp.member_count = mc or 0
    resp.credential_count = cc or 0
    return resp


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, db)
    if not _can_manage(current_user) and project.owner_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot edit this project.")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(project, field, val)
    await db.commit()
    await db.refresh(project)
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only admins can delete projects.")
    project = await _get_project_or_404(project_id, db)
    await db.delete(project)
    await db.commit()


# ─── Member management ────────────────────────────────────────────────────────

@router.get("/{project_id}/members", response_model=list[AssignmentResponse])
async def list_members(
    project_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    await _assert_member_or_manager(project_id, current_user, db)
    assignments = (await db.scalars(
        select(ProjectAssignment)
        .options(selectinload(ProjectAssignment.user))
        .where(ProjectAssignment.project_id == project_id)
    )).all()
    return list(assignments)


@router.post("/{project_id}/members", response_model=AssignmentResponse, status_code=201)
async def add_member(
    project_id: UUID,
    payload: AssignmentCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    if not _can_manage(current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only Admins and PMs can assign members.")
    await _get_project_or_404(project_id, db)
    user = await db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")

    existing = await db.scalar(
        select(ProjectAssignment).where(
            ProjectAssignment.user_id   == payload.user_id,
            ProjectAssignment.project_id == project_id,
        )
    )
    if existing:
        existing.can_reveal = payload.can_reveal
        existing.can_edit   = payload.can_edit
        await db.commit()
        await db.refresh(existing)
        return existing

    asgn = ProjectAssignment(
        user_id=payload.user_id,
        project_id=project_id,
        can_reveal=payload.can_reveal,
        can_edit=payload.can_edit,
        assigned_by=current_user.id,
    )
    db.add(asgn)
    await db.commit()
    await db.refresh(asgn)
    return asgn


@router.delete("/{project_id}/members/{user_id}", status_code=204)
async def remove_member(
    project_id: UUID,
    user_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    if not _can_manage(current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only Admins and PMs can remove members.")
    asgn = await db.scalar(
        select(ProjectAssignment).where(
            ProjectAssignment.user_id   == user_id,
            ProjectAssignment.project_id == project_id,
        )
    )
    if not asgn:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found.")
    await db.delete(asgn)
    await db.commit()
