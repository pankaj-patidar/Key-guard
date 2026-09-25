import os
import uuid
import re
from pathlib import Path
from uuid import UUID
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import get_settings
from app.domains.attachments.models import TicketAttachment

ALLOWED_MIME_PREFIXES = [
    "image/", "application/pdf", "text/",
    "application/zip", "application/x-zip-compressed",
    "application/msword", "application/vnd.openxmlformats",
]


def _sanitize_filename(name: str) -> str:
    name = os.path.basename(name)
    name = re.sub(r"[^\w.\-]", "_", name)
    return name[:200]


def _check_mime(file_bytes: bytes) -> str:
    try:
        import magic
        mime = magic.from_buffer(file_bytes[:2048], mime=True)
    except ImportError:
        mime = "application/octet-stream"
    if not any(mime.startswith(prefix) for prefix in ALLOWED_MIME_PREFIXES):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{mime}' is not allowed",
        )
    return mime


async def upload_attachment(
    ticket_id: UUID,
    uploader_id: UUID,
    file: UploadFile,
    db: AsyncSession,
) -> TicketAttachment:
    settings = get_settings()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit",
        )

    mime = _check_mime(content)
    safe_name = _sanitize_filename(file.filename or "file")
    file_id = str(uuid.uuid4())
    rel_path = f"{ticket_id}/{file_id}-{safe_name}"
    full_path = Path(settings.UPLOADS_DIR) / rel_path
    full_path.parent.mkdir(parents=True, exist_ok=True)
    full_path.write_bytes(content)

    attachment = TicketAttachment(
        ticket_id=ticket_id,
        uploaded_by=uploader_id,
        filename=file.filename or safe_name,
        file_path=str(rel_path),
        file_size=len(content),
        mime_type=mime,
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)
    return attachment


async def list_attachments(ticket_id: UUID, db: AsyncSession) -> list[TicketAttachment]:
    result = await db.execute(
        select(TicketAttachment)
        .where(TicketAttachment.ticket_id == ticket_id)
        .order_by(TicketAttachment.created_at.asc())
    )
    return list(result.scalars().all())


async def get_attachment(attachment_id: UUID, db: AsyncSession) -> TicketAttachment:
    result = await db.execute(select(TicketAttachment).where(TicketAttachment.id == attachment_id))
    attachment = result.scalar_one_or_none()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    return attachment


async def delete_attachment(attachment_id: UUID, requester_id: UUID, db: AsyncSession) -> None:
    attachment = await get_attachment(attachment_id, db)
    if str(attachment.uploaded_by) != str(requester_id):
        raise HTTPException(status_code=403, detail="You can only delete your own attachments")
    settings = get_settings()
    full_path = Path(settings.UPLOADS_DIR) / attachment.file_path
    if full_path.exists():
        full_path.unlink()
    await db.delete(attachment)
    await db.commit()
