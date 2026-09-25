from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class PermissionOut(BaseModel):
    id: UUID
    key: str
    description: str | None
    module: str

    model_config = {"from_attributes": True}


class RoleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")
    description: str | None = None


class RoleCreate(RoleBase):
    permission_keys: list[str] = Field(default_factory=list)


class RoleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    description: str | None = None


class RoleOut(RoleBase):
    id: UUID
    slug: str
    is_system: bool
    created_at: datetime
    permissions: list[PermissionOut] = []

    model_config = {"from_attributes": True}


class PermissionSetUpdate(BaseModel):
    permission_keys: list[str]


class UserProjectRoleCreate(BaseModel):
    role_id: UUID


class UserProjectRoleOut(BaseModel):
    id: UUID
    user_id: UUID
    project_id: UUID | None
    role_id: UUID
    assigned_at: datetime

    model_config = {"from_attributes": True}


class MyPermissionsOut(BaseModel):
    project_id: UUID | None
    role_slug: str
    permissions: list[str]
