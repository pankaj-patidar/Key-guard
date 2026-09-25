from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File, status, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.config import get_settings
from app.models.user import User
from app.security.dependencies import get_current_user
from app.domains.attachments import service
from app.domains.attachments.schemas import AttachmentOut

router = APIRouter(tags=["attachments"])


@router.get("/api/v1/projects/{project_id}/tickets/{ticket_number}/attachments",
            response_model=list[AttachmentOut])
async def list_attachments(
    project_id: UUID,
    ticket_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.domains.tickets.service import get_ticket_by_number
    ticket = await get_ticket_by_number(project_id, ticket_number, db)
    return await service.list_attachments(ticket.id, db)


@router.post("/api/v1/projects/{project_id}/tickets/{ticket_number}/attachments",
             response_model=AttachmentOut, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    project_id: UUID,
    ticket_number: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.domains.tickets.service import get_ticket_by_number
    ticket = await get_ticket_by_number(project_id, ticket_number, db)
    return await service.upload_attachment(ticket.id, current_user.id, file, db)


@router.get("/api/v1/attachments/{attachment_id}/download")
async def download_attachment(
    attachment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    attachment = await service.get_attachment(attachment_id, db)
    full_path = Path(settings.UPLOADS_DIR) / attachment.file_path
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(
        path=str(full_path),
        filename=attachment.filename,
        media_type=attachment.mime_type,
    )


@router.delete("/api/v1/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    attachment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_attachment(attachment_id, current_user.id, db)
