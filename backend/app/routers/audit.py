from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload, joinedload
from ..database import get_db
from ..models.audit import AuditLog
from ..models.user import User, UserRole
from ..schemas.audit import AuditLogResponse, AuditLogListResponse
from ..security.dependencies import CurrentUser, require_roles

router = APIRouter(prefix="/audit", tags=["audit"])

AdminOnly = Depends(require_roles(UserRole.ADMIN))


@router.get("/", response_model=AuditLogListResponse, dependencies=[AdminOnly])
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    search: str | None = Query(None),
    action: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    base = select(AuditLog).join(AuditLog.user, isouter=True)

    filters = []
    if action:
        filters.append(AuditLog.action == action)
    if search:
        term = f"%{search}%"
        filters.append(or_(
            AuditLog.detail.ilike(term),
            User.full_name.ilike(term),
            User.email.ilike(term),
        ))

    if filters:
        base = base.where(*filters)

    total = await db.scalar(select(func.count()).select_from(base.subquery()))
    logs = (await db.scalars(
        base
        .options(selectinload(AuditLog.user))
        .order_by(AuditLog.timestamp.desc())
        .offset(skip).limit(limit)
    )).all()
    return AuditLogListResponse(items=list(logs), total=total)


@router.get("/credential/{credential_id}", response_model=AuditLogListResponse)
async def credential_audit(
    credential_id: UUID,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in (UserRole.ADMIN, UserRole.PM):
        raise Exception("Access denied.")
    total = await db.scalar(
        select(func.count()).select_from(AuditLog)
        .where(AuditLog.credential_id == credential_id)
    )
    logs = (await db.scalars(
        select(AuditLog)
        .options(selectinload(AuditLog.user))
        .where(AuditLog.credential_id == credential_id)
        .order_by(AuditLog.timestamp.desc())
        .offset(skip).limit(limit)
    )).all()
    return AuditLogListResponse(items=list(logs), total=total)
