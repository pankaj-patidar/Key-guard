import re
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.domains.roles.models import Role, Permission, UserProjectRole, role_permissions_table
from app.domains.roles.schemas import RoleCreate, RoleUpdate
from app.domains.roles.rbac import _resolve_role


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


async def list_roles(db: AsyncSession) -> list[Role]:
    result = await db.execute(select(Role).order_by(Role.is_system.desc(), Role.name))
    return list(result.scalars().all())


async def get_role(role_id: UUID, db: AsyncSession) -> Role:
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return role


async def create_role(data: RoleCreate, db: AsyncSession) -> Role:
    slug = _slugify(data.name)
    existing = await db.execute(select(Role).where(Role.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Role slug '{slug}' already exists")

    role = Role(name=data.name, slug=slug, color=data.color, description=data.description, is_system=False)
    db.add(role)
    await db.flush()

    if data.permission_keys:
        await _set_permissions(role.id, data.permission_keys, db)

    await db.commit()
    await db.refresh(role)
    return role


async def update_role(role_id: UUID, data: RoleUpdate, db: AsyncSession) -> Role:
    role = await get_role(role_id, db)
    if data.name is not None:
        role.name = data.name
    if data.color is not None:
        role.color = data.color
    if data.description is not None:
        role.description = data.description
    await db.commit()
    await db.refresh(role)
    return role


async def delete_role(role_id: UUID, db: AsyncSession) -> None:
    role = await get_role(role_id, db)
    if role.is_system:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="System roles cannot be deleted")
    await db.delete(role)
    await db.commit()


async def _set_permissions(role_id: UUID, permission_keys: list[str], db: AsyncSession) -> None:
    """Replace the entire permission set for a role."""
    await db.execute(
        role_permissions_table.delete().where(role_permissions_table.c.role_id == role_id)
    )
    if not permission_keys:
        return
    result = await db.execute(select(Permission).where(Permission.key.in_(permission_keys)))
    perms = result.scalars().all()
    for perm in perms:
        await db.execute(
            role_permissions_table.insert().values(role_id=role_id, permission_id=perm.id)
        )


async def set_role_permissions(role_id: UUID, permission_keys: list[str], db: AsyncSession) -> Role:
    role = await get_role(role_id, db)
    if role.is_system and role.slug == "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin permissions are locked")
    await _set_permissions(role_id, permission_keys, db)
    await db.commit()
    await db.refresh(role)
    return role


async def set_project_member_role(
    user_id: UUID, project_id: UUID | None, role_id: UUID, assigner_id: UUID, db: AsyncSession
) -> UserProjectRole:
    result = await db.execute(
        select(UserProjectRole).where(
            UserProjectRole.user_id == user_id,
            UserProjectRole.project_id == project_id,
        )
    )
    upr = result.scalar_one_or_none()
    if upr:
        upr.role_id = role_id
        upr.assigned_by = assigner_id
    else:
        upr = UserProjectRole(
            user_id=user_id, project_id=project_id, role_id=role_id, assigned_by=assigner_id
        )
        db.add(upr)
    await db.commit()
    await db.refresh(upr)
    return upr


async def get_my_permissions(user_id: UUID, project_id: UUID | None, db: AsyncSession) -> dict:
    from app.models.user import User
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = await _resolve_role(user, db, project_id)
    if not role:
        return {"project_id": project_id, "role_slug": "none", "permissions": []}

    return {
        "project_id": project_id,
        "role_slug": role.slug,
        "permissions": [p.key for p in role.permissions],
    }
