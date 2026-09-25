import uuid
import enum
from datetime import datetime
from sqlalchemy import (Column, String, Text, Boolean, Integer,
                        DateTime, ForeignKey, Enum as SAEnum, UniqueConstraint)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class CredentialType(str, enum.Enum):
    SSH_KEY          = "ssh_key"
    DATABASE         = "database"
    API_KEY          = "api_key"
    CLOUD_ACCOUNT    = "cloud_account"
    VPN              = "vpn"
    SERVER           = "server"
    TLS_CERT         = "tls_cert"
    OAUTH_CLIENT     = "oauth_client"
    SMTP             = "smtp"
    DOCKER_REGISTRY  = "docker_registry"
    GENERIC          = "generic"


class CredentialScope(str, enum.Enum):
    PROJECT = "project"
    GLOBAL  = "global"


class Credential(Base):
    __tablename__ = "credentials"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    label            = Column(String(255), nullable=False)
    description      = Column(Text, nullable=True)
    credential_type  = Column(SAEnum(CredentialType), nullable=False)
    scope            = Column(SAEnum(CredentialScope), nullable=False, default=CredentialScope.PROJECT)
    project_id       = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    tags             = Column(String(512), nullable=True)
    created_by       = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_accessed_at = Column(DateTime, nullable=True)

    fields           = relationship("CredentialField", back_populates="credential",
                                    cascade="all, delete-orphan",
                                    order_by="CredentialField.display_order")
    project          = relationship("Project", back_populates="credentials")
    creator          = relationship("User", foreign_keys=[created_by])
    audit_logs       = relationship("AuditLog", back_populates="credential")


class CredentialField(Base):
    __tablename__ = "credential_fields"
    __table_args__ = (UniqueConstraint("credential_id", "field_key", name="uq_cred_field_key"),)

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    credential_id   = Column(UUID(as_uuid=True), ForeignKey("credentials.id", ondelete="CASCADE"), nullable=False)
    field_key       = Column(String(100), nullable=False)
    field_label     = Column(String(255), nullable=False)
    display_order   = Column(Integer, default=0)
    is_sensitive    = Column(Boolean, nullable=False, default=False)
    plain_value     = Column(Text, nullable=True)
    encrypted_value = Column(Text, nullable=True)
    field_hint      = Column(String(512), nullable=True)
    is_multiline    = Column(Boolean, default=False)

    credential      = relationship("Credential", back_populates="fields")
