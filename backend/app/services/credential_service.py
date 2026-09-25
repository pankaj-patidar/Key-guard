from datetime import datetime
from uuid import UUID
from fastapi import HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from ..models.credential import Credential, CredentialField
from ..models.audit import AuditLog
from ..models.project import ProjectAssignment
from ..models.user import User, UserRole
from ..schemas.credential import CredentialCreate, CredentialUpdate
from ..schemas.credential_templates import CREDENTIAL_TEMPLATES
from ..security.crypto import encrypt_secret, decrypt_secret


EXPORTABLE_FIELDS = {
    "private_key":  ("application/x-pem-file",   "key.pem"),
    "certificate":  ("application/x-pem-file",   "cert.pem"),
    "chain":        ("application/x-pem-file",   "chain.pem"),
    "ca_cert":      ("application/x-pem-file",   "ca.pem"),
    "client_cert":  ("application/x-pem-file",   "client.pem"),
    "client_key":   ("application/x-pem-file",   "client-key.pem"),
    "config_file":  ("application/octet-stream",  "vpn.ovpn"),
}


# ─── Internal helpers ─────────────────────────────────────────────────────────

async def _load_cred(cred_id: UUID, db: AsyncSession) -> Credential:
    """Fetch a Credential with its fields eagerly loaded (no lazy IO)."""
    cred = await db.scalar(
        select(Credential)
        .options(selectinload(Credential.fields))
        .where(Credential.id == cred_id)
    )
    if not cred:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Credential not found.")
    return cred


async def _assert_project_access(
    project_id: UUID | None,
    user: User,
    db: AsyncSession,
    need_edit: bool = False,
) -> ProjectAssignment | None:
    if project_id is None:
        return None
    if user.role in (UserRole.ADMIN, UserRole.PM):
        return None

    assignment = await db.scalar(
        select(ProjectAssignment).where(
            ProjectAssignment.user_id    == user.id,
            ProjectAssignment.project_id == project_id,
        )
    )
    if not assignment:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not assigned to this project.")
    if need_edit and not assignment.can_edit:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have edit permission on this project.")
    return assignment


async def _assert_reveal_access(credential: Credential, user: User, db: AsyncSession) -> None:
    if user.role in (UserRole.ADMIN, UserRole.PM, UserRole.DEVOPS):
        return
    if credential.project_id:
        asgn = await db.scalar(
            select(ProjectAssignment).where(
                ProjectAssignment.user_id    == user.id,
                ProjectAssignment.project_id == credential.project_id,
            )
        )
        if asgn and asgn.can_reveal:
            return
    raise HTTPException(status.HTTP_403_FORBIDDEN, "Reveal permission not granted.")


def _decrypt_all(cred: Credential) -> dict[str, str]:
    return {
        f.field_key: (decrypt_secret(f.encrypted_value) if f.is_sensitive else (f.plain_value or ""))
        for f in cred.fields
    }


async def _write_audit(
    db: AsyncSession,
    user_id: UUID,
    credential_id: UUID,
    action: str,
    detail: str | None,
    request: Request,
) -> None:
    db.add(AuditLog(
        user_id=user_id,
        credential_id=credential_id,
        action=action,
        detail=detail,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))


# ─── Public service functions ─────────────────────────────────────────────────

async def create_credential(
    payload: CredentialCreate,
    db: AsyncSession,
    user: User,
    request: Request,
) -> Credential:
    await _assert_project_access(payload.project_id, user, db, need_edit=True)

    template  = CREDENTIAL_TEMPLATES.get(payload.credential_type, [])
    field_map = {f.key: f for f in template}

    cred = Credential(
        label=payload.label,
        description=payload.description,
        credential_type=payload.credential_type,
        scope=payload.scope,
        project_id=payload.project_id,
        tags=",".join(payload.tags),
        created_by=user.id,
    )
    db.add(cred)
    await db.flush()

    for order, (key, raw_value) in enumerate(payload.fields.items()):
        tpl          = field_map.get(key)
        is_sensitive = tpl.is_sensitive if tpl else True
        db.add(CredentialField(
            credential_id   = cred.id,
            field_key       = key,
            field_label     = tpl.label if tpl else key.replace("_", " ").title(),
            display_order   = order,
            is_sensitive    = is_sensitive,
            encrypted_value = encrypt_secret(raw_value) if is_sensitive else None,
            plain_value     = raw_value if not is_sensitive else None,
            is_multiline    = tpl.is_multiline if tpl else False,
            field_hint      = tpl.hint if tpl else None,
        ))

    await _write_audit(db, user.id, cred.id, "CREATE", payload.credential_type.value, request)
    await db.commit()

    # Re-fetch with fields eagerly loaded — db.refresh() only reloads columns
    return await _load_cred(cred.id, db)


async def update_credential(
    cred_id: UUID,
    payload: CredentialUpdate,
    db: AsyncSession,
    user: User,
    request: Request,
) -> Credential:
    cred = await _load_cred(cred_id, db)
    await _assert_project_access(cred.project_id, user, db, need_edit=True)

    if payload.label is not None:       cred.label       = payload.label
    if payload.description is not None: cred.description = payload.description
    if payload.tags is not None:        cred.tags        = ",".join(payload.tags)

    if payload.fields:
        template  = CREDENTIAL_TEMPLATES.get(cred.credential_type, [])
        field_map = {f.key: f for f in template}
        existing  = {f.field_key: f for f in cred.fields}

        for key, raw_value in payload.fields.items():
            tpl          = field_map.get(key)
            is_sensitive = tpl.is_sensitive if tpl else True
            if key in existing:
                ef = existing[key]
                if is_sensitive:
                    ef.encrypted_value = encrypt_secret(raw_value)
                    ef.plain_value     = None
                else:
                    ef.plain_value     = raw_value
                    ef.encrypted_value = None
            else:
                db.add(CredentialField(
                    credential_id   = cred.id,
                    field_key       = key,
                    field_label     = tpl.label if tpl else key.replace("_", " ").title(),
                    display_order   = len(cred.fields),
                    is_sensitive    = is_sensitive,
                    encrypted_value = encrypt_secret(raw_value) if is_sensitive else None,
                    plain_value     = raw_value if not is_sensitive else None,
                ))

    await _write_audit(db, user.id, cred.id, "UPDATE", None, request)
    await db.commit()
    return await _load_cred(cred_id, db)


async def reveal_field(
    cred_id: UUID,
    field_key: str,
    db: AsyncSession,
    user: User,
    request: Request,
) -> dict[str, str]:
    cred = await _load_cred(cred_id, db)
    await _assert_reveal_access(cred, user, db)

    field = next((f for f in cred.fields if f.field_key == field_key), None)
    if not field:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Field '{field_key}' not found.")

    value = decrypt_secret(field.encrypted_value) if field.is_sensitive else (field.plain_value or "")
    cred.last_accessed_at = datetime.utcnow()
    await _write_audit(db, user.id, cred.id, "REVEAL_FIELD", field_key, request)
    await db.commit()
    return {"field_key": field_key, "value": value}


async def reveal_all_fields(
    cred_id: UUID,
    db: AsyncSession,
    user: User,
    request: Request,
) -> dict[str, str]:
    cred = await _load_cred(cred_id, db)
    await _assert_reveal_access(cred, user, db)

    fields = _decrypt_all(cred)
    cred.last_accessed_at = datetime.utcnow()
    await _write_audit(db, user.id, cred.id, "REVEAL_ALL", None, request)
    await db.commit()
    return fields


async def get_snippets(
    cred_id: UUID,
    db: AsyncSession,
    user: User,
    request: Request,
) -> dict:
    from .snippet_generator import SnippetGenerator
    cred = await _load_cred(cred_id, db)
    await _assert_reveal_access(cred, user, db)

    snippets = SnippetGenerator.generate(cred.credential_type, _decrypt_all(cred))
    await _write_audit(db, user.id, cred.id, "USE_SNIPPETS", None, request)
    await db.commit()
    return snippets


async def export_field(
    cred_id: UUID,
    field_key: str,
    db: AsyncSession,
    user: User,
    request: Request,
) -> tuple[str, str, str]:
    if field_key not in EXPORTABLE_FIELDS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Field '{field_key}' is not exportable.")

    cred = await _load_cred(cred_id, db)
    await _assert_reveal_access(cred, user, db)

    field = next((f for f in cred.fields if f.field_key == field_key), None)
    if not field:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Field '{field_key}' not found.")

    value = decrypt_secret(field.encrypted_value)
    mime, filename = EXPORTABLE_FIELDS[field_key]
    await _write_audit(db, user.id, cred.id, "EXPORT_FILE", field_key, request)
    await db.commit()
    return value, mime, filename


async def delete_credential(
    cred_id: UUID,
    db: AsyncSession,
    user: User,
    request: Request,
) -> None:
    # delete only needs project_id and label — no fields access, plain get is fine
    cred = await db.get(Credential, cred_id)
    if not cred:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Credential not found.")
    await _assert_project_access(cred.project_id, user, db, need_edit=True)
    await _write_audit(db, user.id, cred.id, "DELETE", cred.label, request)
    await db.delete(cred)
    await db.commit()
