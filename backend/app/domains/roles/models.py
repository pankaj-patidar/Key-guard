import uuid
from datetime import datetime
from sqlalchemy import (Column, String, Boolean, Text, DateTime,
                        ForeignKey, Table, UniqueConstraint)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

# M2M association table
role_permissions_table = Table(
    "role_permissions", Base.metadata,
    Column("role_id",       UUID(as_uuid=True),
           ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", UUID(as_uuid=True),
           ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class Role(Base):
    __tablename__ = "roles"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String(100), nullable=False)
    slug        = Column(String(100), unique=True, nullable=False, index=True)
    is_system   = Column(Boolean, default=False, nullable=False)
    color       = Column(String(7), default="#6366f1")
    description = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)

    permissions        = relationship("Permission", secondary=role_permissions_table,
                                      back_populates="roles", lazy="selectin")
    user_project_roles = relationship("UserProjectRole", back_populates="role",
                                      cascade="all, delete-orphan")


class Permission(Base):
    __tablename__ = "permissions"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key         = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    module      = Column(String(50), nullable=False)

    roles = relationship("Role", secondary=role_permissions_table, back_populates="permissions")


class UserProjectRole(Base):
    __tablename__ = "user_project_roles"
    __table_args__ = (UniqueConstraint("user_id", "project_id", name="uq_user_project_role"),)

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id  = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    role_id     = Column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)

    user     = relationship("User", foreign_keys=[user_id])
    project  = relationship("Project")
    role     = relationship("Role", back_populates="user_project_roles")
    assigner = relationship("User", foreign_keys=[assigned_by])
