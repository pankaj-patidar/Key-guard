import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class SettingValueType(str, enum.Enum):
    STRING  = "string"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    JSON    = "json"


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key          = Column(String(100), primary_key=True)
    value        = Column(Text, nullable=False)
    value_type   = Column(SAEnum(SettingValueType), nullable=False, default=SettingValueType.STRING)
    label        = Column(String(200), nullable=False)
    description  = Column(Text, nullable=True)
    module       = Column(String(50), nullable=False)
    is_sensitive = Column(Boolean, default=False, nullable=False)
    updated_by   = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
