import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    credential_id = Column(UUID(as_uuid=True), ForeignKey("credentials.id", ondelete="SET NULL"), nullable=True)
    action        = Column(String(50), nullable=False)
    detail        = Column(String(255), nullable=True)
    ip_address    = Column(String(45), nullable=True)
    user_agent    = Column(String(512), nullable=True)
    timestamp     = Column(DateTime, default=datetime.utcnow, index=True)

    user          = relationship("User", back_populates="audit_logs")
    credential    = relationship("Credential", back_populates="audit_logs")
