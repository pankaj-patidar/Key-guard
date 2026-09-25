from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User, UserRole
from app.security.dependencies import get_current_user
from app.domains.settings import service
from app.domains.settings.schemas import SettingOut, SettingUpdate

router = APIRouter(tags=["settings"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return current_user


@router.get("/api/v1/settings/public", response_model=dict)
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    """No auth required — returns only non-sensitive, UI-relevant settings."""
    return await service.list_public_settings(db)


@router.get("/api/v1/admin/settings", response_model=list[SettingOut])
async def list_settings(
    module: str | None = None,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_settings(db, module=module)


@router.patch("/api/v1/admin/settings/{key}", response_model=SettingOut)
async def update_setting(
    key: str,
    data: SettingUpdate,
    current_user: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await service.update_setting(key, data.value, db, updater_id=current_user.id)
