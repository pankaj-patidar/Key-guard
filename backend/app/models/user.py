import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class UserRole(str, enum.Enum):
    ADMIN   = "admin"
    PM      = "pm"
    DEVOPS  = "devops"
    DEV     = "developer"
    VIEWER  = "viewer"


class User(Base):
    __tablename__ = "users"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email            = Column(String(255), unique=True, nullable=False, index=True)
    full_name        = Column(String(255), nullable=False)
    hashed_password  = Column(String(255), nullable=False)
    role             = Column(SAEnum(UserRole), nullable=False, default=UserRole.DEV)
    avatar_url       = Column(String(512), nullable=True)
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime, default=datetime.utcnow)
    last_login_at    = Column(DateTime, nullable=True)

    assignments      = relationship("ProjectAssignment", foreign_keys="ProjectAssignment.user_id",
                                    back_populates="user", cascade="all, delete-orphan")
    owned_projects   = relationship("Project", back_populates="owner")
    audit_logs       = relationship("AuditLog", back_populates="user")
