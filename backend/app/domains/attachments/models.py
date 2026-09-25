import uuid
from datetime import datetime
from sqlalchemy import Column, String, BigInteger, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class TicketAttachment(Base):
    __tablename__ = "ticket_attachments"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id   = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    filename    = Column(String(255), nullable=False)
    file_path   = Column(String(512), nullable=False)
    file_size   = Column(BigInteger, nullable=False)
    mime_type   = Column(String(100), nullable=False)
    created_at  = Column(DateTime, default=datetime.utcnow)

    ticket   = relationship("Ticket")
    uploader = relationship("User", foreign_keys=[uploaded_by])
