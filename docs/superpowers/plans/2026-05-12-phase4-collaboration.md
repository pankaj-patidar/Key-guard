# Phase 4: Collaboration — Comments, Activity & Attachments

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rich text comments (Tiptap), automatic activity log, and file attachments to every ticket. The TicketDetailDrawer becomes a full collaboration surface.

**Architecture:** `backend/app/domains/comments/` owns TicketComment and TicketActivity models + API. `backend/app/domains/attachments/` owns TicketAttachment + file I/O. Activity is recorded automatically inside the ticket service, never by routers directly. Frontend uses a shared `RichTextEditor` (Tiptap) for both descriptions and comments.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, python-magic (MIME validation), Tiptap (@tiptap/react, @tiptap/starter-kit, @tiptap/extension-mention, @tiptap/extension-placeholder), React 18, TanStack Query v5.

**Prerequisite:** Phase 2 complete.

---

## File Map

**Create:**
- `backend/app/domains/comments/__init__.py`
- `backend/app/domains/comments/models.py`
- `backend/app/domains/comments/schemas.py`
- `backend/app/domains/comments/service.py`
- `backend/app/domains/comments/router.py`
- `backend/app/domains/attachments/__init__.py`
- `backend/app/domains/attachments/models.py`
- `backend/app/domains/attachments/schemas.py`
- `backend/app/domains/attachments/service.py`
- `backend/app/domains/attachments/router.py`
- `backend/alembic/versions/0004_comments_activity.py`
- `backend/alembic/versions/0005_attachments.py`
- `backend/tests/domains/comments/__init__.py`
- `backend/tests/domains/comments/test_comments.py`
- `frontend/src/hooks/useComments.ts`
- `frontend/src/hooks/useActivity.ts`
- `frontend/src/hooks/useAttachments.ts`
- `frontend/src/components/editor/RichTextEditor.tsx`
- `frontend/src/components/editor/RichTextViewer.tsx`
- `frontend/src/components/comments/CommentItem.tsx`
- `frontend/src/components/comments/ActivityItem.tsx`
- `frontend/src/components/comments/CommentThread.tsx`
- `frontend/src/components/attachments/AttachmentList.tsx`
- `frontend/src/components/attachments/AttachmentUpload.tsx`

**Modify:**
- `backend/app/domains/tickets/service.py` — call activity_service on every mutation
- `backend/app/main.py` — register comments + attachments routers
- `backend/alembic/env.py` — import new models
- `frontend/src/components/tickets/TicketDetailDrawer.tsx` — add RichTextEditor, CommentThread, AttachmentList
- `frontend/package.json` — add Tiptap packages

---

## Task 1: Install Tiptap

- [ ] **Step 1: Install**

```bash
cd frontend
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-mention @tiptap/extension-placeholder
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add Tiptap rich text editor dependencies"
```

---

## Task 2: Comment & Activity Models

**Files:**
- Create: `backend/app/domains/comments/models.py`

- [ ] **Step 1: Write import test**

```python
# backend/tests/domains/comments/test_comments.py
def test_models_importable():
    from app.domains.comments.models import TicketComment, TicketActivity
    assert TicketComment.__tablename__ == "ticket_comments"
    assert TicketActivity.__tablename__ == "ticket_activity"
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend && python -m pytest tests/domains/comments/test_comments.py::test_models_importable -v
```

- [ ] **Step 3: Implement models**

```python
# backend/app/domains/comments/models.py
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class TicketComment(Base):
    __tablename__ = "ticket_comments"

    id        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content   = Column(JSONB, nullable=False)          # Tiptap ProseMirror JSON
    parent_id = Column(UUID(as_uuid=True), ForeignKey("ticket_comments.id", ondelete="CASCADE"), nullable=True)
    is_edited = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ticket  = relationship("Ticket")
    author  = relationship("User", foreign_keys=[author_id])
    replies = relationship("TicketComment", foreign_keys=[parent_id])


class TicketActivity(Base):
    __tablename__ = "ticket_activity"

    id        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    actor_id  = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action    = Column(String(60), nullable=False)      # e.g. "status_changed", "assignee_changed"
    old_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship("Ticket")
    actor  = relationship("User", foreign_keys=[actor_id])
```

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/domains/comments/test_comments.py::test_models_importable -v
```

Expected: `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add app/domains/comments/ tests/domains/comments/
git commit -m "feat: add TicketComment and TicketActivity SQLAlchemy models"
```

---

## Task 3: Comments Migration

- [ ] **Step 1: Register in env.py**

```python
from app.domains.comments import models as comment_models  # noqa: F401
```

- [ ] **Step 2: Generate and apply**

```bash
alembic revision --autogenerate -m "comments_activity"
alembic upgrade head
```

Expected: creates `ticket_comments` and `ticket_activity` tables.

- [ ] **Step 3: Commit**

```bash
git add alembic/
git commit -m "feat: add comments/activity migration (0004)"
```

---

## Task 4: Comment Service

**Files:**
- Create: `backend/app/domains/comments/service.py`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/domains/comments/test_comments.py  (add to file)
import pytest
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.comments.service import create_comment, list_comments, record_activity
from app.domains.tickets.service import create_ticket
from app.domains.tickets.schemas import TicketCreate
from app.domains.tickets.models import TicketType

SAMPLE_TIPTAP = {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Hello"}]}]}

@pytest.mark.asyncio
async def test_create_comment(db: AsyncSession, project, reporter):
    ticket = await create_ticket(project.id, TicketCreate(title="Test", type=TicketType.TASK), reporter.id, db)
    comment = await create_comment(ticket.id, reporter.id, SAMPLE_TIPTAP, db)
    assert comment.id is not None
    assert comment.author_id == reporter.id

@pytest.mark.asyncio
async def test_list_comments(db: AsyncSession, project, reporter):
    ticket = await create_ticket(project.id, TicketCreate(title="Test", type=TicketType.TASK), reporter.id, db)
    await create_comment(ticket.id, reporter.id, SAMPLE_TIPTAP, db)
    await create_comment(ticket.id, reporter.id, SAMPLE_TIPTAP, db)
    comments = await list_comments(ticket.id, db)
    assert len(comments) == 2

@pytest.mark.asyncio
async def test_record_activity(db: AsyncSession, project, reporter):
    ticket = await create_ticket(project.id, TicketCreate(title="Test", type=TicketType.TASK), reporter.id, db)
    activity = await record_activity(ticket.id, reporter.id, "status_changed",
                                     {"status": "backlog"}, {"status": "in_progress"}, db)
    assert activity.action == "status_changed"
```

- [ ] **Step 2: Run to confirm failure**

```bash
python -m pytest tests/domains/comments/test_comments.py -v -k "comment or activity"
```

- [ ] **Step 3: Implement service**

```python
# backend/app/domains/comments/service.py
from uuid import UUID
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from app.domains.comments.models import TicketComment, TicketActivity


async def list_comments(ticket_id: UUID, db: AsyncSession) -> list[TicketComment]:
    result = await db.execute(
        select(TicketComment)
        .where(TicketComment.ticket_id == ticket_id, TicketComment.parent_id.is_(None))
        .order_by(TicketComment.created_at.asc())
    )
    return list(result.scalars().all())


async def create_comment(
    ticket_id: UUID,
    author_id: UUID,
    content: dict[str, Any],
    db: AsyncSession,
    parent_id: UUID | None = None,
) -> TicketComment:
    comment = TicketComment(
        ticket_id=ticket_id,
        author_id=author_id,
        content=content,
        parent_id=parent_id,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment


async def update_comment(
    comment_id: UUID,
    editor_id: UUID,
    content: dict[str, Any],
    db: AsyncSession,
) -> TicketComment:
    result = await db.execute(select(TicketComment).where(TicketComment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if str(comment.author_id) != str(editor_id):
        raise HTTPException(status_code=403, detail="You can only edit your own comments")
    comment.content = content
    comment.is_edited = True
    await db.commit()
    await db.refresh(comment)
    return comment


async def delete_comment(comment_id: UUID, requester_id: UUID, db: AsyncSession) -> None:
    result = await db.execute(select(TicketComment).where(TicketComment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if str(comment.author_id) != str(requester_id):
        raise HTTPException(status_code=403, detail="You can only delete your own comments")
    await db.delete(comment)
    await db.commit()


async def list_activity(ticket_id: UUID, db: AsyncSession) -> list[TicketActivity]:
    result = await db.execute(
        select(TicketActivity)
        .where(TicketActivity.ticket_id == ticket_id)
        .order_by(TicketActivity.created_at.asc())
    )
    return list(result.scalars().all())


async def record_activity(
    ticket_id: UUID,
    actor_id: UUID,
    action: str,
    old_value: dict[str, Any] | None,
    new_value: dict[str, Any] | None,
    db: AsyncSession,
) -> TicketActivity:
    """Called by ticket service on every mutation. Never called by routers directly."""
    activity = TicketActivity(
        ticket_id=ticket_id,
        actor_id=actor_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(activity)
    await db.flush()  # flush so the activity gets an ID but doesn't commit independently
    return activity
```

- [ ] **Step 4: Run tests**

```bash
python -m pytest tests/domains/comments/test_comments.py -v
```

Expected: `4 passed`.

- [ ] **Step 5: Wire activity into ticket service**

Open `backend/app/domains/tickets/service.py`. Update `update_ticket()`:

```python
from app.domains.comments import service as activity_service

async def update_ticket(ticket_id: UUID, data: TicketUpdate, actor_id: UUID, db: AsyncSession) -> Ticket:
    ticket = await get_ticket(ticket_id, db)
    update_data = data.model_dump(exclude_unset=True, exclude={"label_ids"})

    # Track changed fields as activity
    for field, new_val in update_data.items():
        old_val = getattr(ticket, field, None)
        if old_val != new_val:
            await activity_service.record_activity(
                ticket.id, actor_id, f"{field}_changed",
                {field: str(old_val) if old_val is not None else None},
                {field: str(new_val) if new_val is not None else None},
                db,
            )
        setattr(ticket, field, new_val)

    if data.label_ids is not None:
        await db.execute(ticket_labels_table.delete().where(ticket_labels_table.c.ticket_id == ticket_id))
        for label_id in data.label_ids:
            await db.execute(ticket_labels_table.insert().values(ticket_id=ticket_id, label_id=label_id))

    await db.commit()
    await db.refresh(ticket)
    return ticket
```

- [ ] **Step 6: Commit**

```bash
git add app/domains/comments/service.py app/domains/tickets/service.py tests/domains/comments/
git commit -m "feat: add comment service with activity auto-tracking on ticket mutations"
```

---

## Task 5: Comment Router

**Files:**
- Create: `backend/app/domains/comments/schemas.py`
- Create: `backend/app/domains/comments/router.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Schemas**

```python
# backend/app/domains/comments/schemas.py
from uuid import UUID
from datetime import datetime
from typing import Any
from pydantic import BaseModel


class UserMini(BaseModel):
    id: UUID
    full_name: str
    avatar_url: str | None = None
    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    content: dict[str, Any]          # Tiptap ProseMirror JSON
    parent_id: UUID | None = None


class CommentUpdate(BaseModel):
    content: dict[str, Any]


class CommentOut(BaseModel):
    id: UUID
    ticket_id: UUID
    author: UserMini
    content: dict[str, Any]
    parent_id: UUID | None
    is_edited: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ActivityOut(BaseModel):
    id: UUID
    ticket_id: UUID
    actor: UserMini
    action: str
    old_value: dict[str, Any] | None
    new_value: dict[str, Any] | None
    created_at: datetime
    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Router**

```python
# backend/app/domains/comments/router.py
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.security.dependencies import get_current_user
from app.domains.comments import service
from app.domains.comments.schemas import CommentCreate, CommentUpdate, CommentOut, ActivityOut

router = APIRouter(prefix="/api/v1/projects/{project_id}/tickets/{ticket_number}", tags=["comments"])


@router.get("/comments", response_model=list[CommentOut])
async def list_comments(
    project_id: UUID,
    ticket_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.domains.tickets.service import get_ticket_by_number
    ticket = await get_ticket_by_number(project_id, ticket_number, db)
    return await service.list_comments(ticket.id, db)


@router.post("/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def create_comment(
    project_id: UUID,
    ticket_number: int,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.domains.tickets.service import get_ticket_by_number
    ticket = await get_ticket_by_number(project_id, ticket_number, db)
    return await service.create_comment(ticket.id, current_user.id, data.content, db, parent_id=data.parent_id)


@router.patch("/comments/{comment_id}", response_model=CommentOut)
async def update_comment(
    project_id: UUID,
    ticket_number: int,
    comment_id: UUID,
    data: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.update_comment(comment_id, current_user.id, data.content, db)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    project_id: UUID,
    ticket_number: int,
    comment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_comment(comment_id, current_user.id, db)


@router.get("/activity", response_model=list[ActivityOut])
async def list_activity(
    project_id: UUID,
    ticket_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.domains.tickets.service import get_ticket_by_number
    ticket = await get_ticket_by_number(project_id, ticket_number, db)
    return await service.list_activity(ticket.id, db)
```

- [ ] **Step 3: Register in main.py**

```python
from app.domains.comments.router import router as comments_router
app.include_router(comments_router)
```

- [ ] **Step 4: Commit**

```bash
git add app/domains/comments/ app/main.py
git commit -m "feat: add comments and activity REST API"
```

---

## Task 6: Attachment Model, Migration & Service

**Files:**
- Create: `backend/app/domains/attachments/models.py`
- Create: `backend/app/domains/attachments/service.py`
- Create: `backend/app/domains/attachments/schemas.py`
- Create: `backend/app/domains/attachments/router.py`

- [ ] **Step 1: Install python-magic**

```bash
cd backend
pip install python-magic
echo "python-magic==0.4.27" >> requirements.txt
```

- [ ] **Step 2: Implement models**

```python
# backend/app/domains/attachments/models.py
import uuid
from datetime import datetime
from sqlalchemy import Column, String, BigInteger, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class TicketAttachment(Base):
    __tablename__ = "ticket_attachments"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id   = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    filename    = Column(String(255), nullable=False)    # display name only
    file_path   = Column(String(512), nullable=False)    # relative path on disk
    file_size   = Column(BigInteger, nullable=False)
    mime_type   = Column(String(100), nullable=False)
    created_at  = Column(DateTime, default=datetime.utcnow)

    ticket   = relationship("Ticket")
    uploader = relationship("User", foreign_keys=[uploaded_by])
```

- [ ] **Step 3: Register and migrate**

```python
# Add to alembic/env.py:
from app.domains.attachments import models as attachment_models  # noqa: F401
```

```bash
alembic revision --autogenerate -m "attachments"
alembic upgrade head
```

- [ ] **Step 4: Implement service**

```python
# backend/app/domains/attachments/service.py
import os
import uuid
import re
from pathlib import Path
from uuid import UUID
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.domains.attachments.models import TicketAttachment

MAX_BYTES = getattr(settings, "MAX_UPLOAD_SIZE_MB", 25) * 1024 * 1024

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
        # Fallback if libmagic not installed
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
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {MAX_BYTES // (1024*1024)} MB limit",
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
    # Allow uploader or admin to delete
    if str(attachment.uploaded_by) != str(requester_id):
        raise HTTPException(status_code=403, detail="You can only delete your own attachments")
    # Remove file from disk
    full_path = Path(settings.UPLOADS_DIR) / attachment.file_path
    if full_path.exists():
        full_path.unlink()
    await db.delete(attachment)
    await db.commit()
```

- [ ] **Step 5: Add UPLOADS_DIR to config**

Open `backend/app/config.py` and add:

```python
UPLOADS_DIR: str = "./uploads"
MAX_UPLOAD_SIZE_MB: int = 25
```

- [ ] **Step 6: Implement attachment schemas and router**

```python
# backend/app/domains/attachments/schemas.py
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
```

```python
# backend/app/domains/attachments/router.py
from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File, status
from fastapi.responses import FileResponse
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.security.dependencies import get_current_user
from app.domains.attachments import service
from app.domains.attachments.schemas import AttachmentOut

router = APIRouter(tags=["attachments"])


@router.get("/api/v1/projects/{project_id}/tickets/{ticket_number}/attachments",
            response_model=list[AttachmentOut])
async def list_attachments(
    project_id: UUID, ticket_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.domains.tickets.service import get_ticket_by_number
    ticket = await get_ticket_by_number(project_id, ticket_number, db)
    return await service.list_attachments(ticket.id, db)


@router.post("/api/v1/projects/{project_id}/tickets/{ticket_number}/attachments",
             response_model=AttachmentOut, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    project_id: UUID, ticket_number: int,
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
    """Auth-gated file download — membership check omitted for MVP, add in security hardening."""
    attachment = await service.get_attachment(attachment_id, db)
    full_path = Path(settings.UPLOADS_DIR) / attachment.file_path
    if not full_path.exists():
        from fastapi import HTTPException
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
```

- [ ] **Step 7: Register in main.py**

```python
from app.domains.attachments.router import router as attachments_router
app.include_router(attachments_router)
```

- [ ] **Step 8: Commit**

```bash
git add app/domains/attachments/ app/main.py alembic/
git commit -m "feat: add attachment upload/download with MIME validation and auth-gated download"
```

---

## Task 7: Frontend — RichTextEditor

**Files:**
- Create: `frontend/src/components/editor/RichTextEditor.tsx`
- Create: `frontend/src/components/editor/RichTextViewer.tsx`

- [ ] **Step 1: RichTextEditor**

```tsx
// frontend/src/components/editor/RichTextEditor.tsx
import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Code, List, ListOrdered, Heading2, Quote, Minus,
} from 'lucide-react'

interface Props {
  content: Record<string, unknown> | null
  onChange: (content: Record<string, unknown>) => void
  placeholder?: string
  minHeight?: string
}

function ToolbarButton({ onClick, active, children }: { onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
      }`}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({ content, onChange, placeholder = 'Write something…', minHeight = '120px' }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder, emptyEditorClass: 'is-editor-empty' }),
    ],
    content: content ?? undefined,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON() as Record<string, unknown>)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none',
      },
    },
  })

  if (!editor) return null

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden focus-within:border-indigo-500 transition-colors">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-2 border-b border-zinc-700">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')}>
          <Code className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-zinc-700 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>
          <Quote className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="px-4 py-3 text-sm text-zinc-200"
        style={{ minHeight }}
      />
    </div>
  )
}
```

Add Tiptap placeholder CSS to `frontend/src/index.css`:

```css
.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #71717a;
  pointer-events: none;
  height: 0;
}
```

- [ ] **Step 2: RichTextViewer**

```tsx
// frontend/src/components/editor/RichTextViewer.tsx
import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface Props {
  content: Record<string, unknown> | null
}

export function RichTextViewer({ content }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content ?? undefined,
    editable: false,
    editorProps: {
      attributes: { class: 'prose prose-invert prose-sm max-w-none' },
    },
  })

  if (!content) return <p className="text-zinc-500 text-sm italic">No description</p>
  return <EditorContent editor={editor} />
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/editor/ frontend/src/index.css
git commit -m "feat: add RichTextEditor and RichTextViewer Tiptap components"
```

---

## Task 8: Comment UI Components

**Files:**
- Create: `frontend/src/hooks/useComments.ts`
- Create: `frontend/src/hooks/useActivity.ts`
- Create: `frontend/src/components/comments/CommentItem.tsx`
- Create: `frontend/src/components/comments/ActivityItem.tsx`
- Create: `frontend/src/components/comments/CommentThread.tsx`

- [ ] **Step 1: useComments.ts**

```typescript
// frontend/src/hooks/useComments.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export interface Comment {
  id: string
  ticket_id: string
  author: { id: string; full_name: string; avatar_url: string | null }
  content: Record<string, unknown>
  parent_id: string | null
  is_edited: boolean
  created_at: string
  updated_at: string
}

const key = (projectId: string, ticketNumber: number) =>
  ['projects', projectId, 'tickets', ticketNumber, 'comments']

export function useComments(projectId: string, ticketNumber: number) {
  return useQuery({
    queryKey: key(projectId, ticketNumber),
    queryFn: () =>
      api.get<Comment[]>(`/api/v1/projects/${projectId}/tickets/${ticketNumber}/comments`).then(r => r.data),
    enabled: !!ticketNumber,
  })
}

export function useCreateComment(projectId: string, ticketNumber: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { content: Record<string, unknown>; parent_id?: string }) =>
      api.post<Comment>(`/api/v1/projects/${projectId}/tickets/${ticketNumber}/comments`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId, ticketNumber) }),
  })
}

export function useDeleteComment(projectId: string, ticketNumber: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) =>
      api.delete(`/api/v1/projects/${projectId}/tickets/${ticketNumber}/comments/${commentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId, ticketNumber) }),
  })
}
```

- [ ] **Step 2: useActivity.ts**

```typescript
// frontend/src/hooks/useActivity.ts
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export interface ActivityEntry {
  id: string
  ticket_id: string
  actor: { id: string; full_name: string; avatar_url: string | null }
  action: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
}

export function useActivity(projectId: string, ticketNumber: number) {
  return useQuery({
    queryKey: ['projects', projectId, 'tickets', ticketNumber, 'activity'],
    queryFn: () =>
      api.get<ActivityEntry[]>(`/api/v1/projects/${projectId}/tickets/${ticketNumber}/activity`).then(r => r.data),
    enabled: !!ticketNumber,
  })
}
```

- [ ] **Step 3: ActivityItem**

```tsx
// frontend/src/components/comments/ActivityItem.tsx
import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ActivityEntry } from '../../hooks/useActivity'

const ACTION_LABELS: Record<string, (entry: ActivityEntry) => string> = {
  status_changed:   e => `changed status from ${e.old_value?.status} → ${e.new_value?.status}`,
  assignee_changed: e => `changed assignee`,
  priority_changed: e => `changed priority from ${e.old_value?.priority} → ${e.new_value?.priority}`,
  sprint_id_changed: e => `updated sprint`,
  epic_id_changed:   e => `updated epic`,
}

function describeAction(entry: ActivityEntry): string {
  const fn = ACTION_LABELS[entry.action]
  return fn ? fn(entry) : entry.action.replace(/_/g, ' ')
}

export function ActivityItem({ entry }: { entry: ActivityEntry }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 flex-shrink-0 mt-0.5">
        {entry.actor.full_name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-zinc-300">{entry.actor.full_name}</span>
        {' '}
        <span className="text-zinc-500">{describeAction(entry)}</span>
        <span className="text-zinc-600 text-xs ml-2">
          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: CommentItem**

```tsx
// frontend/src/components/comments/CommentItem.tsx
import React, { useState } from 'react'
import { Trash2, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Comment, useDeleteComment } from '../../hooks/useComments'
import { RichTextViewer } from '../editor/RichTextViewer'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

interface Props {
  comment: Comment
  projectId: string
  ticketNumber: number
}

export function CommentItem({ comment, projectId, ticketNumber }: Props) {
  const currentUser = useAuthStore(s => s.user)
  const deleteComment = useDeleteComment(projectId, ticketNumber)
  const isOwn = currentUser?.id === comment.author.id

  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return
    try {
      await deleteComment.mutateAsync(comment.id)
      toast.success('Comment deleted')
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="flex items-start gap-3 group">
      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
        {comment.author.full_name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-semibold text-zinc-200">{comment.author.full_name}</span>
          <span className="text-xs text-zinc-600 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
          {comment.is_edited && <span className="text-xs text-zinc-600">(edited)</span>}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
          <RichTextViewer content={comment.content} />
        </div>
        {isOwn && (
          <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={handleDelete}
              className="text-xs text-zinc-600 hover:text-red-400 flex items-center gap-1 transition-colors">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: CommentThread**

```tsx
// frontend/src/components/comments/CommentThread.tsx
import React, { useState } from 'react'
import { useComments, useCreateComment } from '../../hooks/useComments'
import { useActivity } from '../../hooks/useActivity'
import { CommentItem } from './CommentItem'
import { ActivityItem } from './ActivityItem'
import { RichTextEditor } from '../editor/RichTextEditor'
import toast from 'react-hot-toast'

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] }

interface Props {
  projectId: string
  ticketNumber: number
}

export function CommentThread({ projectId, ticketNumber }: Props) {
  const { data: comments = [] } = useComments(projectId, ticketNumber)
  const { data: activity = [] } = useActivity(projectId, ticketNumber)
  const createComment = useCreateComment(projectId, ticketNumber)
  const [draft, setDraft] = useState<Record<string, unknown>>(EMPTY_DOC)
  const [isFocused, setIsFocused] = useState(false)

  // Merge comments and activity into a single timeline sorted by created_at
  const timeline = [
    ...comments.map(c => ({ type: 'comment' as const, created_at: c.created_at, data: c })),
    ...activity.map(a => ({ type: 'activity' as const, created_at: a.created_at, data: a })),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createComment.mutateAsync({ content: draft })
      setDraft(EMPTY_DOC)
      setIsFocused(false)
      toast.success('Comment added')
    } catch { toast.error('Failed to post comment') }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Activity</h3>

      <div className="space-y-4">
        {timeline.map(item =>
          item.type === 'comment' ? (
            <CommentItem key={item.data.id} comment={item.data as any} projectId={projectId} ticketNumber={ticketNumber} />
          ) : (
            <ActivityItem key={item.data.id} entry={item.data as any} />
          )
        )}
        {timeline.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-4">No activity yet</p>
        )}
      </div>

      {/* New comment editor */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <RichTextEditor
          content={draft}
          onChange={setDraft}
          placeholder="Add a comment…"
          minHeight="80px"
        />
        {isFocused && (
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setIsFocused(false); setDraft(EMPTY_DOC) }}
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={createComment.isPending}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {createComment.isPending ? 'Posting…' : 'Comment'}
            </button>
          </div>
        )}
        {!isFocused && (
          <button type="button" onClick={() => setIsFocused(true)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Click to add a comment…
          </button>
        )}
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useComments.ts frontend/src/hooks/useActivity.ts frontend/src/components/comments/
git commit -m "feat: add CommentThread with activity timeline, rich text editor, delete support"
```

---

## Task 9: Attachment UI Components

**Files:**
- Create: `frontend/src/hooks/useAttachments.ts`
- Create: `frontend/src/components/attachments/AttachmentList.tsx`
- Create: `frontend/src/components/attachments/AttachmentUpload.tsx`

- [ ] **Step 1: useAttachments.ts**

```typescript
// frontend/src/hooks/useAttachments.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export interface Attachment {
  id: string
  ticket_id: string
  filename: string
  file_size: number
  mime_type: string
  created_at: string
}

const key = (projectId: string, ticketNumber: number) =>
  ['projects', projectId, 'tickets', ticketNumber, 'attachments']

export function useAttachments(projectId: string, ticketNumber: number) {
  return useQuery({
    queryKey: key(projectId, ticketNumber),
    queryFn: () =>
      api.get<Attachment[]>(`/api/v1/projects/${projectId}/tickets/${ticketNumber}/attachments`).then(r => r.data),
    enabled: !!ticketNumber,
  })
}

export function useUploadAttachment(projectId: string, ticketNumber: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post<Attachment>(
        `/api/v1/projects/${projectId}/tickets/${ticketNumber}/attachments`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      ).then(r => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId, ticketNumber) }),
  })
}

export function useDeleteAttachment(projectId: string, ticketNumber: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) => api.delete(`/api/v1/attachments/${attachmentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId, ticketNumber) }),
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
```

- [ ] **Step 2: AttachmentList + AttachmentUpload**

```tsx
// frontend/src/components/attachments/AttachmentUpload.tsx
import React, { useRef } from 'react'
import { Upload } from 'lucide-react'
import { useUploadAttachment } from '../../hooks/useAttachments'
import toast from 'react-hot-toast'

interface Props { projectId: string; ticketNumber: number }

export function AttachmentUpload({ projectId, ticketNumber }: Props) {
  const upload = useUploadAttachment(projectId, ticketNumber)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      try {
        await upload.mutateAsync(file)
        toast.success(`${file.name} uploaded`)
      } catch (e: any) {
        toast.error(e.response?.data?.detail ?? `Failed to upload ${file.name}`)
      }
    }
  }

  return (
    <div
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
      onClick={() => inputRef.current?.click()}
      className="border border-dashed border-zinc-700 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-500/5 transition-all"
    >
      <Upload className="w-5 h-5 text-zinc-500 mx-auto mb-1.5" />
      <p className="text-xs text-zinc-500">
        {upload.isPending ? 'Uploading…' : 'Drop files or click to upload'}
      </p>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
    </div>
  )
}
```

```tsx
// frontend/src/components/attachments/AttachmentList.tsx
import React from 'react'
import { File, Trash2, Download } from 'lucide-react'
import { useAttachments, useDeleteAttachment, formatBytes } from '../../hooks/useAttachments'
import { AttachmentUpload } from './AttachmentUpload'
import toast from 'react-hot-toast'

interface Props { projectId: string; ticketNumber: number }

export function AttachmentList({ projectId, ticketNumber }: Props) {
  const { data: attachments = [] } = useAttachments(projectId, ticketNumber)
  const del = useDeleteAttachment(projectId, ticketNumber)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    try { await del.mutateAsync(id); toast.success('Deleted') }
    catch { toast.error('Failed to delete') }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
        Attachments {attachments.length > 0 && `(${attachments.length})`}
      </h3>
      {attachments.map(a => (
        <div key={a.id} className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg group">
          <File className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-200 truncate">{a.filename}</p>
            <p className="text-xs text-zinc-500">{formatBytes(a.file_size)} · {a.mime_type}</p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <a href={`/api/v1/attachments/${a.id}/download`} target="_blank" rel="noreferrer"
              className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition-colors">
              <Download className="w-3.5 h-3.5" />
            </a>
            <button onClick={() => handleDelete(a.id, a.filename)}
              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
      <AttachmentUpload projectId={projectId} ticketNumber={ticketNumber} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useAttachments.ts frontend/src/components/attachments/
git commit -m "feat: add attachment upload/list/delete UI with drag-drop zone"
```

---

## Task 10: Wire Everything into TicketDetailDrawer

**Files:**
- Modify: `frontend/src/components/tickets/TicketDetailDrawer.tsx`

- [ ] **Step 1: Update TicketDetailDrawer to use RichTextEditor, CommentThread, AttachmentList**

Replace the placeholder sections in `TicketDetailDrawer.tsx` with the real components:

```tsx
// Add imports at the top:
import { RichTextEditor } from '../editor/RichTextEditor'
import { RichTextViewer } from '../editor/RichTextViewer'
import { CommentThread } from '../comments/CommentThread'
import { AttachmentList } from '../attachments/AttachmentList'

// Replace the description section with:
<div>
  <p className="text-xs font-medium text-zinc-500 mb-2">Description</p>
  {isEditing ? (
    <RichTextEditor
      content={ticket.description}
      onChange={(content) => updateTicket.mutate({ description: content })}
      placeholder="Add a description…"
    />
  ) : (
    <div
      className="min-h-16 cursor-pointer hover:bg-zinc-900 rounded-xl p-3 -mx-3 transition-colors"
      onClick={() => setIsEditing(true)}
    >
      <RichTextViewer content={ticket.description} />
    </div>
  )}
</div>

// Replace the comments placeholder with:
<CommentThread projectId={projectId} ticketNumber={ticket.ticket_number} />

// Replace the attachments placeholder with:
<AttachmentList projectId={projectId} ticketNumber={ticket.ticket_number} />
```

Add `const [isEditing, setIsEditing] = useState(false)` to the component.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/tickets/TicketDetailDrawer.tsx
git commit -m "feat: wire Tiptap editor, comments, attachments into TicketDetailDrawer"
```

---

## Task 11: End-to-End Verification

- [ ] **Step 1: Test rich text description**
  - Open ticket detail → click description area → Tiptap editor activates
  - Type text, use bold/italic/bullet list toolbar → changes save on blur

- [ ] **Step 2: Test comments**
  - Click comment area → Tiptap editor appears → type a comment → post
  - Comment appears in timeline with author name and timestamp
  - Change ticket status → activity entry appears in timeline: "X changed status from backlog → in_progress"

- [ ] **Step 3: Test attachments**
  - Drag a PDF onto the upload zone → success toast → file appears in list
  - Click download icon → file downloads
  - Click trash icon → confirm → file removed

- [ ] **Step 4: Test MIME rejection**
  - Try uploading an `.exe` → expect 415 error toast

- [ ] **Step 5: Final commit**

```bash
git commit -m "feat(phase-4): complete collaboration — rich text, comments, activity log, attachments"
```
