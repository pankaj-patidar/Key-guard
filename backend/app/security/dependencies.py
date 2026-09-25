from typing import Annotated
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models.user import User, UserRole
from .jwt import decode_token, CREDENTIALS_EXCEPTION

_bearer = HTTPBearer()


async def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    db:    AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(creds.credentials, expected_type="access")
    user_id = payload.get("sub")
    if not user_id:
        raise CREDENTIALS_EXCEPTION
    user = await db.scalar(select(User).where(User.id == UUID(user_id)))
    if not user or not user.is_active:
        raise CREDENTIALS_EXCEPTION
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: UserRole):
    async def checker(current_user: CurrentUser) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {[r.value for r in roles]}. Your role: {current_user.role.value}",
            )
        return current_user
    return checker
