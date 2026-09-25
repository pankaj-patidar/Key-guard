from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class AttachmentOut(BaseModel):
    id: UUID
    ticket_id: UUID
    filename: str
    file_size: int
    mime_type: str
    created_at: datetime
    model_config = {"from_attributes": True}
