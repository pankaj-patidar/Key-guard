import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class TicketComment(Base):
    __tablename__ = "ticket_comments"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id  = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    author_id  = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content    = Column(JSONB, nullable=False)
    parent_id  = Column(UUID(as_uuid=True), ForeignKey("ticket_comments.id", ondelete="CASCADE"), nullable=True)
    is_edited  = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ticket  = relationship("Ticket")
    author  = relationship("User", foreign_keys=[author_id])
    replies = relationship("TicketComment", foreign_keys=[parent_id])


class TicketActivity(Base):
    __tablename__ = "ticket_activity"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id  = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    actor_id   = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action     = Column(String(60), nullable=False)
    old_value  = Column(JSONB, nullable=True)
    new_value  = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship("Ticket")
    actor  = relationship("User", foreign_keys=[actor_id])
