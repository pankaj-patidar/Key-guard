from uuid import UUID
from fastapi import HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User, UserRole
from app.domains.roles.models import Role, Permission, UserProjectRole, role_permissions_table
from app.security.dependencies import get_current_user

_ROLE_SLUG_MAP: dict[UserRole, str] = {
    UserRole.ADMIN:  "admin",
    UserRole.PM:     "pm",
    UserRole.DEVOPS: "devops",
    UserRole.DEV:    "developer",
    UserRole.VIEWER: "viewer",
}


async def _resolve_role(user: User, db: AsyncSession, project_id: UUID | None) -> Role | None:
    """Returns the most specific role: project-level override first, then system role."""
    if project_id:
        stmt = (
            select(Role)
            .join(UserProjectRole, UserProjectRole.role_id == Role.id)
            .where(
                UserProjectRole.user_id == user.id,
                UserProjectRole.project_id == project_id,
            )
        )
        result = await db.execute(stmt)
        role = result.scalar_one_or_none()
        if role:
            return role

    # System-wide override (project_id = NULL row)
    stmt = (
        select(Role)
        .join(UserProjectRole, UserProjectRole.role_id == Role.id)
        .where(
            UserProjectRole.user_id == user.id,
            UserProjectRole.project_id.is_(None),
        )
    )
    result = await db.execute(stmt)
    role = result.scalar_one_or_none()
    if role:
        return role

    # Fall back to system role matching user.role enum
    slug = _ROLE_SLUG_MAP.get(user.role)
    if slug:
        stmt = select(Role).where(Role.slug == slug, Role.is_system == True)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    return None


async def _role_has_permission(role: Role, permission_key: str, db: AsyncSession) -> bool:
    stmt = (
        select(Permission)
        .join(role_permissions_table, role_permissions_table.c.permission_id == Permission.id)
        .where(
            role_permissions_table.c.role_id == role.id,
            Permission.key == permission_key,
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


async def require_permission(
    permission_key: str,
    user: User,
    db: AsyncSession,
    project_id: UUID | None = None,
) -> None:
    """Raises HTTP 403 if the user lacks the given permission."""
    if user.role == UserRole.ADMIN:
        return

    role = await _resolve_role(user, db, project_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No role assigned")

    has_perm = await _role_has_permission(role, permission_key, db)
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to perform this action",
        )


def permission_required(permission_key: str):
    """FastAPI dependency factory for simple (non-project-scoped) permission checks."""
    async def _dep(
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        await require_permission(permission_key, user, db)
    return _dep
