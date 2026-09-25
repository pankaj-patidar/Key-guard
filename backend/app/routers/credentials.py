from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from ..database import get_db
from ..models.credential import Credential, CredentialScope
from ..models.user import UserRole
from ..schemas.credential import (CredentialCreate, CredentialUpdate, CredentialResponse,
                                   CredentialFieldResponse, CredentialRevealResponse,
                                   SnippetResponse, CredentialListResponse)
from ..schemas.credential_templates import CREDENTIAL_TEMPLATES, TYPE_META
from ..security.dependencies import CurrentUser, require_roles
from ..services import credential_service as svc

router = APIRouter(prefix="/credentials", tags=["credentials"])


def _to_response(cred: Credential) -> CredentialResponse:
    tags = [t for t in (cred.tags or "").split(",") if t]
    fields = [
        CredentialFieldResponse(
            field_key=f.field_key,
            field_label=f.field_label,
            is_sensitive=f.is_sensitive,
            is_multiline=f.is_multiline,
            display_order=f.display_order,
            value_set=bool(f.encrypted_value or f.plain_value),
            plain_value=f.plain_value if not f.is_sensitive else None,
        )
        for f in cred.fields
    ]
    return CredentialResponse(
        id=cred.id,
        label=cred.label,
        description=cred.description,
        credential_type=cred.credential_type,
        scope=cred.scope,
        project_id=cred.project_id,
        tags=tags,
        fields=fields,
        created_at=cred.created_at,
        updated_at=cred.updated_at,
        last_accessed_at=cred.last_accessed_at,
    )


@router.get("/types")
async def get_credential_types():
    result = []
    for ctype, fields in CREDENTIAL_TEMPLATES.items():
        meta = TYPE_META.get(ctype.value, {})
        result.append({
            "type":   ctype.value,
            "label":  meta.get("label", ctype.value),
            "icon":   meta.get("icon", "key-round"),
            "color":  meta.get("color", "#94a3b8"),
            "fields": [
                {
                    "key":          f.key,
                    "label":        f.label,
                    "is_sensitive": f.is_sensitive,
                    "required":     f.required,
                    "default":      f.default,
                    "placeholder":  f.placeholder,
                    "is_multiline": f.is_multiline,
                    "hint":         f.hint,
                }
                for f in fields
            ],
        })
    return result


@router.get("/global", response_model=CredentialListResponse)
async def list_global_credentials(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    current_user: CurrentUser = ...,
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in (UserRole.ADMIN, UserRole.PM, UserRole.DEVOPS):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied.")
    q = select(Credential).options(selectinload(Credential.fields)).where(Credential.scope == CredentialScope.GLOBAL)
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    creds = (await db.scalars(q.offset(skip).limit(limit))).all()
    return CredentialListResponse(items=[_to_response(c) for c in creds], total=total)


@router.get("/project/{project_id}", response_model=CredentialListResponse)
async def list_project_credentials(
    project_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    current_user: CurrentUser = ...,
    db: AsyncSession = Depends(get_db),
):
    from .projects import _assert_member_or_manager
    await _assert_member_or_manager(project_id, current_user, db)
    q = select(Credential).options(selectinload(Credential.fields)).where(Credential.project_id == project_id)
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    creds = (await db.scalars(q.offset(skip).limit(limit))).all()
    return CredentialListResponse(items=[_to_response(c) for c in creds], total=total)


@router.post("/", response_model=CredentialResponse, status_code=201)
async def create_credential(
    payload: CredentialCreate,
    request: Request,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    cred = await svc.create_credential(payload, db, current_user, request)
    return _to_response(cred)


@router.get("/{credential_id}", response_model=CredentialResponse)
async def get_credential(
    credential_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    cred = await svc._load_cred(credential_id, db)
    return _to_response(cred)


@router.patch("/{credential_id}", response_model=CredentialResponse)
async def update_credential(
    credential_id: UUID,
    payload: CredentialUpdate,
    request: Request,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    cred = await svc.update_credential(credential_id, payload, db, current_user, request)
    return _to_response(cred)


@router.delete("/{credential_id}", status_code=204)
async def delete_credential(
    credential_id: UUID,
    request: Request,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    await svc.delete_credential(credential_id, db, current_user, request)


@router.post("/{credential_id}/fields/{field_key}/reveal")
async def reveal_field(
    credential_id: UUID,
    field_key: str,
    request: Request,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    return await svc.reveal_field(credential_id, field_key, db, current_user, request)


@router.post("/{credential_id}/reveal", response_model=CredentialRevealResponse)
async def reveal_all(
    credential_id: UUID,
    request: Request,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    fields = await svc.reveal_all_fields(credential_id, db, current_user, request)
    return CredentialRevealResponse(credential_id=str(credential_id), fields=fields)


@router.post("/{credential_id}/snippets", response_model=SnippetResponse)
async def get_snippets(
    credential_id: UUID,
    request: Request,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    snippets = await svc.get_snippets(credential_id, db, current_user, request)
    return SnippetResponse(credential_id=str(credential_id), snippets=snippets)


@router.post("/{credential_id}/fields/{field_key}/export")
async def export_field(
    credential_id: UUID,
    field_key: str,
    request: Request,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    value, mime, filename = await svc.export_field(credential_id, field_key, db, current_user, request)
    return StreamingResponse(
        iter([value.encode()]),
        media_type=mime,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
