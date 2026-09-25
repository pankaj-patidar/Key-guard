from datetime import datetime
from pydantic import BaseModel
from app.domains.settings.models import SettingValueType


class SettingOut(BaseModel):
    key: str
    value: str
    value_type: SettingValueType
    label: str
    description: str | None
    module: str
    is_sensitive: bool
    updated_at: datetime | None
    model_config = {"from_attributes": True}


class SettingUpdate(BaseModel):
    value: str
