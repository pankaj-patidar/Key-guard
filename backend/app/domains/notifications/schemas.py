from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.domains.notifications.models import NotificationType


class UserMini(BaseModel):
    id: UUID
    full_name: str
    model_config = {"from_attributes": True}


class NotificationOut(BaseModel):
    id: UUID
    type: NotificationType
    message: str
    is_read: bool
    ticket_id: UUID | None
    project_id: UUID | None
    actor: UserMini | None
    created_at: datetime
    model_config = {"from_attributes": True}


class UnreadCountOut(BaseModel):
    count: int
