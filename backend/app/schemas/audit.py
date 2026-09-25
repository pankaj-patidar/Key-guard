from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from .user import UserResponse


class AuditLogResponse(BaseModel):
    id:            UUID
    user_id:       UUID
    credential_id: UUID | None
    action:        str
    detail:        str | None
    ip_address:    str | None
    timestamp:     datetime
    user:          UserResponse | None = None

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
