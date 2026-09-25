import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class Project(Base):
    __tablename__ = "projects"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    slug        = Column(String(100), unique=True, nullable=False, index=True)
    color_tag   = Column(String(7), default="#6366f1")
    icon_name   = Column(String(50), nullable=True)
    is_archived = Column(Boolean, default=False)
    owner_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner       = relationship("User", back_populates="owned_projects")
    assignments = relationship("ProjectAssignment", back_populates="project",
                               cascade="all, delete-orphan")
    credentials = relationship("Credential", back_populates="project",
                               cascade="all, delete-orphan")


class ProjectAssignment(Base):
    __tablename__ = "project_assignments"
    __table_args__ = (UniqueConstraint("user_id", "project_id", name="uq_user_project"),)

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id  = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    can_reveal  = Column(Boolean, default=True)
    can_edit    = Column(Boolean, default=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    user        = relationship("User", foreign_keys=[user_id], back_populates="assignments")
    project     = relationship("Project", back_populates="assignments")
    assigner    = relationship("User", foreign_keys=[assigned_by])
