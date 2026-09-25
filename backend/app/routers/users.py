from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from ..database import get_db
from ..models.user import User, UserRole
from ..schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse
from ..security.dependencies import CurrentUser, require_roles
from ..security.password import hash_password

router = APIRouter(prefix="/users", tags=["users"])

AdminOnly = Depends(require_roles(UserRole.ADMIN))


@router.get("/", response_model=UserListResponse, dependencies=[AdminOnly])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    search: str | None = Query(None),
    role: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    base = select(User)
    filters = []
    if search:
        term = f"%{search}%"
        filters.append(or_(User.full_name.ilike(term), User.email.ilike(term)))
    if role:
        filters.append(User.role == role)
    if filters:
        base = base.where(*filters)

    total = await db.scalar(select(func.count()).select_from(base.subquery()))
    users = (await db.scalars(
        base.order_by(User.created_at.desc()).offset(skip).limit(limit)
    )).all()
    return UserListResponse(items=list(users), total=total)


@router.post("/", response_model=UserResponse, status_code=201, dependencies=[AdminOnly])
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered.")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: UUID, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied.")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    return user


@router.patch("/{user_id}", response_model=UserResponse, dependencies=[AdminOnly])
async def update_user(user_id: UUID, payload: UserUpdate, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(user, field, val)
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204, dependencies=[AdminOnly])
async def delete_user(user_id: UUID, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    if current_user.id == user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot delete your own account.")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    await db.delete(user)
    await db.commit()
