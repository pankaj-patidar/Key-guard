from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.security.dependencies import get_current_user
from app.domains.roles import service
from app.domains.roles.schemas import (
    RoleOut, RoleCreate, RoleUpdate, PermissionOut,
    PermissionSetUpdate, UserProjectRoleCreate, UserProjectRoleOut, MyPermissionsOut,
)
from app.domains.roles.rbac import require_permission
from app.domains.roles.permissions import ALL_PERMISSIONS

router = APIRouter(tags=["roles"])


@router.get("/roles", response_model=list[RoleOut])
async def list_roles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_roles(db)


@router.get("/roles/{role_id}", response_model=RoleOut)
async def get_role(
    role_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_role(role_id, db)


@router.post("/roles", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
async def create_role(
    data: RoleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("role:create", current_user, db)
    return await service.create_role(data, db)


@router.patch("/roles/{role_id}", response_model=RoleOut)
async def update_role(
    role_id: UUID,
    data: RoleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("role:edit", current_user, db)
    return await service.update_role(role_id, data, db)


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("role:delete", current_user, db)
    await service.delete_role(role_id, db)


@router.get("/permissions", response_model=list[PermissionOut])
async def list_permissions(current_user: User = Depends(get_current_user)):
    """Returns all permission keys from constants (not DB)."""
    import uuid
    return [
        {"id": uuid.uuid4(), **p}
        for p in ALL_PERMISSIONS
    ]


@router.put("/roles/{role_id}/permissions", response_model=RoleOut)
async def set_role_permissions(
    role_id: UUID,
    data: PermissionSetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("role:edit", current_user, db)
    return await service.set_role_permissions(role_id, data.permission_keys, db)


@router.put(
    "/projects/{project_id}/members/{user_id}/role",
    response_model=UserProjectRoleOut,
)
async def set_project_member_role(
    project_id: UUID,
    user_id: UUID,
    data: UserProjectRoleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("role:assign_project", current_user, db, project_id=project_id)
    return await service.set_project_member_role(user_id, project_id, data.role_id, current_user.id, db)


@router.get("/projects/{project_id}/my-permissions", response_model=MyPermissionsOut)
async def get_my_permissions(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await service.get_my_permissions(current_user.id, project_id, db)
    return result
