from uuid import UUID
from typing import Any
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from app.domains.settings.models import SystemSetting, SettingValueType
from app.domains.settings import cache as setting_cache


def _parse(setting: SystemSetting) -> Any:
    if setting.value_type == SettingValueType.INTEGER:
        return int(setting.value)
    if setting.value_type == SettingValueType.BOOLEAN:
        return setting.value.lower() in ("true", "1", "yes")
    if setting.value_type == SettingValueType.JSON:
        return json.loads(setting.value)
    return setting.value


async def get_setting(key: str, db: AsyncSession) -> Any:
    cached = setting_cache.get(key)
    if cached is not None:
        return cached
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    value = _parse(setting)
    setting_cache.set(key, value)
    return value


async def list_settings(db: AsyncSession, module: str | None = None) -> list[SystemSetting]:
    stmt = select(SystemSetting)
    if module:
        stmt = stmt.where(SystemSetting.module == module)
    result = await db.execute(stmt.order_by(SystemSetting.module, SystemSetting.key))
    return list(result.scalars().all())


async def list_public_settings(db: AsyncSession) -> dict[str, Any]:
    PUBLIC_KEYS = [
        "app_name", "app_logo_url", "story_points_enabled",
        "story_points_scale", "default_ticket_priority",
    ]
    result = await db.execute(
        select(SystemSetting).where(
            SystemSetting.key.in_(PUBLIC_KEYS),
            SystemSetting.is_sensitive == False,
        )
    )
    settings = result.scalars().all()
    return {s.key: _parse(s) for s in settings}


async def update_setting(key: str, value: str, db: AsyncSession, updater_id: UUID | None = None) -> SystemSetting:
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    setting.value = str(value)
    if updater_id:
        setting.updated_by = updater_id
    await db.commit()
    await db.refresh(setting)
    setting_cache.invalidate(key)
    return setting
