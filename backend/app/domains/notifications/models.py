import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class NotificationType(str, enum.Enum):
    ASSIGNED       = "assigned"
    MENTIONED      = "mentioned"
    SPRINT_ENDING  = "sprint_ending"
    STATUS_CHANGED = "status_changed"
    COMMENTED      = "commented"
    SPRINT_CLOSED  = "sprint_closed"


class Notification(Base):
    __tablename__ = "notifications"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    actor_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    type         = Column(SAEnum(NotificationType), nullable=False)
    ticket_id    = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=True)
    project_id   = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    message      = Column(Text, nullable=False)
    is_read      = Column(Boolean, default=False, nullable=False)
    created_at   = Column(DateTime, default=datetime.utcnow)

    recipient = relationship("User", foreign_keys=[recipient_id])
    actor     = relationship("User", foreign_keys=[actor_id])
