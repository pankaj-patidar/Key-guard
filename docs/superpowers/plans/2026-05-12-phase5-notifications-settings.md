# Phase 5: Notifications & Admin Settings

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver in-app notifications (bell icon with unread badge, polled every 30s) and a full Admin Settings page where system-wide configuration can be changed at runtime without code changes.

**Architecture:** `backend/app/domains/notifications/` owns the Notification model and API. `backend/app/domains/settings/` owns SystemSetting model with a 60s in-memory TTL cache. Frontend polls `unread-count` every 30s via TanStack Query `refetchInterval`. Settings fields save on blur with inline feedback.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, React 18, TanStack Query v5, Zustand, Framer Motion, TailwindCSS.

**Prerequisite:** Phase 2 complete. Phase 4 recommended (notifications triggered by comments/status changes).

---

## File Map

**Create:**
- `backend/app/domains/notifications/__init__.py`
- `backend/app/domains/notifications/models.py`
- `backend/app/domains/notifications/schemas.py`
- `backend/app/domains/notifications/service.py`
- `backend/app/domains/notifications/router.py`
- `backend/app/domains/settings/__init__.py`
- `backend/app/domains/settings/models.py`
- `backend/app/domains/settings/schemas.py`
- `backend/app/domains/settings/service.py`
- `backend/app/domains/settings/router.py`
- `backend/app/domains/settings/cache.py`
- `backend/app/domains/settings/seed.py`
- `backend/alembic/versions/0006_notifications.py`
- `backend/alembic/versions/0007_system_settings.py`
- `backend/tests/domains/notifications/__init__.py`
- `backend/tests/domains/notifications/test_notifications.py`
- `backend/tests/domains/settings/__init__.py`
- `backend/tests/domains/settings/test_settings.py`
- `frontend/src/store/notificationStore.ts`
- `frontend/src/store/settingsStore.ts`
- `frontend/src/hooks/useNotifications.ts`
- `frontend/src/hooks/useSystemSettings.ts`
- `frontend/src/hooks/usePublicSettings.ts`
- `frontend/src/components/notifications/NotificationBell.tsx`
- `frontend/src/components/notifications/NotificationPanel.tsx`
- `frontend/src/pages/Settings/SystemSettingsPage.tsx`
- `frontend/src/pages/Settings/tabs/GeneralSettingsTab.tsx`
- `frontend/src/pages/Settings/tabs/TicketSettingsTab.tsx`
- `frontend/src/pages/Settings/tabs/SprintSettingsTab.tsx`
- `frontend/src/pages/Settings/tabs/UploadSettingsTab.tsx`
- `frontend/src/pages/Settings/tabs/NotificationSettingsTab.tsx`
- `frontend/src/pages/Settings/tabs/AccessControlTab.tsx`

**Modify:**
- `backend/app/main.py` — register routers + load public settings on startup
- `backend/alembic/env.py` — import new models
- `backend/app/domains/tickets/service.py` — call notification_service.notify_watchers
- `backend/app/domains/comments/service.py` — call notification_service on new comment
- `frontend/src/App.tsx` — add settings route + load public settings at startup
- `frontend/src/layouts/AppLayout.tsx` — add NotificationBell to header

---

## Task 1: Notification Model & Migration

**Files:**
- Create: `backend/app/domains/notifications/models.py`

- [ ] **Step 1: Write import test**

```python
# backend/tests/domains/notifications/test_notifications.py
def test_model_importable():
    from app.domains.notifications.models import Notification
    assert Notification.__tablename__ == "notifications"
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend && python -m pytest tests/domains/notifications/test_notifications.py::test_model_importable -v
```

- [ ] **Step 3: Implement model**

```python
# backend/app/domains/notifications/models.py
import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class NotificationType(str, enum.Enum):
    ASSIGNED        = "assigned"
    MENTIONED       = "mentioned"
    SPRINT_ENDING   = "sprint_ending"
    STATUS_CHANGED  = "status_changed"
    COMMENTED       = "commented"
    SPRINT_CLOSED   = "sprint_closed"


class Notification(Base):
    __tablename__ = "notifications"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    actor_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    type         = Column(SAEnum(NotificationType), nullable=False)
    ticket_id    = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=True)
    project_id   = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    message      = Column(Text, nullable=False)
    is_read      = Column(Boolean, default=False, nullable=False)
    created_at   = Column(DateTime, default=datetime.utcnow)

    recipient = relationship("User", foreign_keys=[recipient_id])
    actor     = relationship("User", foreign_keys=[actor_id])
```

- [ ] **Step 4: Register and migrate**

```python
# Add to alembic/env.py:
from app.domains.notifications import models as notification_models  # noqa: F401
```

```bash
alembic revision --autogenerate -m "notifications"
alembic upgrade head
```

- [ ] **Step 5: Run test**

```bash
python -m pytest tests/domains/notifications/test_notifications.py::test_model_importable -v
```

Expected: `1 passed`.

- [ ] **Step 6: Commit**

```bash
git add app/domains/notifications/ alembic/ tests/domains/notifications/
git commit -m "feat: add Notification model and migration (0006)"
```

---

## Task 2: Notification Service

**Files:**
- Create: `backend/app/domains/notifications/service.py`

- [ ] **Step 1: Write tests**

```python
# backend/tests/domains/notifications/test_notifications.py  (add to file)
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.notifications.service import (
    create_notification, list_notifications, get_unread_count, mark_all_read,
)
from app.domains.notifications.models import NotificationType

@pytest.mark.asyncio
async def test_create_and_count(db: AsyncSession, admin_user, developer_user):
    await create_notification(
        recipient_id=developer_user.id,
        actor_id=admin_user.id,
        type=NotificationType.ASSIGNED,
        message="You were assigned to KG-1",
        db=db,
    )
    count = await get_unread_count(developer_user.id, db)
    assert count == 1

@pytest.mark.asyncio
async def test_mark_all_read(db: AsyncSession, admin_user, developer_user):
    await create_notification(developer_user.id, admin_user.id, NotificationType.COMMENTED, "New comment", db)
    await create_notification(developer_user.id, admin_user.id, NotificationType.ASSIGNED, "Assigned", db)
    await mark_all_read(developer_user.id, db)
    count = await get_unread_count(developer_user.id, db)
    assert count == 0
```

- [ ] **Step 2: Run to confirm failure**

```bash
python -m pytest tests/domains/notifications/ -v -k "count or read"
```

- [ ] **Step 3: Implement service**

```python
# backend/app/domains/notifications/service.py
from uuid import UUID
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from app.domains.notifications.models import Notification, NotificationType
from app.domains.tickets.models import Ticket, TicketWatcher


async def create_notification(
    recipient_id: UUID,
    actor_id: UUID | None,
    type: NotificationType,
    message: str,
    db: AsyncSession,
    ticket_id: UUID | None = None,
    project_id: UUID | None = None,
) -> Notification:
    notif = Notification(
        recipient_id=recipient_id,
        actor_id=actor_id,
        type=type,
        message=message,
        ticket_id=ticket_id,
        project_id=project_id,
    )
    db.add(notif)
    await db.flush()
    return notif


async def notify_watchers(
    ticket: Ticket,
    actor_id: UUID,
    type: NotificationType,
    message_template: str,
    db: AsyncSession,
) -> None:
    """Notify all watchers of a ticket, excluding the actor."""
    result = await db.execute(
        select(TicketWatcher).where(
            TicketWatcher.ticket_id == ticket.id,
            TicketWatcher.user_id != actor_id,
        )
    )
    watchers = result.scalars().all()
    for w in watchers:
        await create_notification(
            recipient_id=w.user_id,
            actor_id=actor_id,
            type=type,
            message=message_template,
            db=db,
            ticket_id=ticket.id,
            project_id=ticket.project_id,
        )
    await db.commit()


async def list_notifications(
    recipient_id: UUID,
    db: AsyncSession,
    limit: int = 50,
    offset: int = 0,
) -> list[Notification]:
    result = await db.execute(
        select(Notification)
        .where(Notification.recipient_id == recipient_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


async def get_unread_count(recipient_id: UUID, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).select_from(Notification).where(
            Notification.recipient_id == recipient_id,
            Notification.is_read == False,
        )
    )
    return result.scalar() or 0


async def mark_read(notification_id: UUID, recipient_id: UUID, db: AsyncSession) -> None:
    await db.execute(
        update(Notification)
        .where(Notification.id == notification_id, Notification.recipient_id == recipient_id)
        .values(is_read=True)
    )
    await db.commit()


async def mark_all_read(recipient_id: UUID, db: AsyncSession) -> None:
    await db.execute(
        update(Notification)
        .where(Notification.recipient_id == recipient_id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
```

- [ ] **Step 4: Wire into ticket service**

Open `backend/app/domains/tickets/service.py`. In `update_ticket()`, after the commit, add:

```python
from app.domains.notifications.service import notify_watchers
from app.domains.notifications.models import NotificationType

# After db.commit():
if "assignee_id" in update_data and update_data["assignee_id"]:
    # Notify the new assignee directly
    from app.domains.notifications.service import create_notification
    await create_notification(
        recipient_id=update_data["assignee_id"],
        actor_id=actor_id,
        type=NotificationType.ASSIGNED,
        message=f"You were assigned to ticket {ticket.ticket_number}",
        db=db,
        ticket_id=ticket.id,
        project_id=ticket.project_id,
    )
    await db.commit()

if "status" in update_data:
    await notify_watchers(
        ticket, actor_id, NotificationType.STATUS_CHANGED,
        f"Status changed to {update_data['status'].replace('_', ' ')} on ticket {ticket.ticket_number}",
        db,
    )
```

- [ ] **Step 5: Wire into comment service**

Open `backend/app/domains/comments/service.py`. After `create_comment` db.commit(), add:

```python
from app.domains.notifications.service import notify_watchers
from app.domains.notifications.models import NotificationType
from app.domains.tickets.service import get_ticket

# Add after db.commit() in create_comment():
ticket = await get_ticket(ticket_id, db)
await notify_watchers(
    ticket, author_id, NotificationType.COMMENTED,
    f"New comment on ticket {ticket.ticket_number}",
    db,
)
```

- [ ] **Step 6: Run tests**

```bash
python -m pytest tests/domains/notifications/ -v
```

Expected: `3 passed`.

- [ ] **Step 7: Commit**

```bash
git add app/domains/notifications/service.py app/domains/tickets/service.py app/domains/comments/service.py
git commit -m "feat: add notification service with watcher fan-out on status change and comments"
```

---

## Task 3: Notification Router

**Files:**
- Create: `backend/app/domains/notifications/schemas.py`
- Create: `backend/app/domains/notifications/router.py`

- [ ] **Step 1: Schemas**

```python
# backend/app/domains/notifications/schemas.py
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.domains.notifications.models import NotificationType


class UserMini(BaseModel):
    id: UUID
    full_name: str
    model_config = {"from_attributes": True}


class NotificationOut(BaseModel):
    id: UUID
    type: NotificationType
    message: str
    is_read: bool
    ticket_id: UUID | None
    project_id: UUID | None
    actor: UserMini | None
    created_at: datetime
    model_config = {"from_attributes": True}


class UnreadCountOut(BaseModel):
    count: int
```

- [ ] **Step 2: Router**

```python
# backend/app/domains/notifications/router.py
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.security.dependencies import get_current_user
from app.domains.notifications import service
from app.domains.notifications.schemas import NotificationOut, UnreadCountOut

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_notifications(current_user.id, db)


@router.get("/unread-count", response_model=UnreadCountOut)
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await service.get_unread_count(current_user.id, db)
    return {"count": count}


@router.patch("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.mark_read(notification_id, current_user.id, db)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.mark_all_read(current_user.id, db)
```

- [ ] **Step 3: Register in main.py**

```python
from app.domains.notifications.router import router as notifications_router
app.include_router(notifications_router)
```

- [ ] **Step 4: Commit**

```bash
git add app/domains/notifications/schemas.py app/domains/notifications/router.py app/main.py
git commit -m "feat: add notifications REST API with unread-count endpoint"
```

---

## Task 4: Frontend Notification Store & Hook

**Files:**
- Create: `frontend/src/store/notificationStore.ts`
- Create: `frontend/src/hooks/useNotifications.ts`

- [ ] **Step 1: notificationStore.ts**

```typescript
// frontend/src/store/notificationStore.ts
import { create } from 'zustand'

interface NotificationState {
  unreadCount: number
  isPanelOpen: boolean
  setUnreadCount: (count: number) => void
  openPanel: () => void
  closePanel: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  isPanelOpen: false,
  setUnreadCount: (count) => set({ unreadCount: count }),
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
}))
```

- [ ] **Step 2: useNotifications.ts**

```typescript
// frontend/src/hooks/useNotifications.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import api from '../lib/api'
import { useNotificationStore } from '../store/notificationStore'

export interface Notification {
  id: string
  type: string
  message: string
  is_read: boolean
  ticket_id: string | null
  project_id: string | null
  actor: { id: string; full_name: string } | null
  created_at: string
}

export function useUnreadCount() {
  const setUnreadCount = useNotificationStore(s => s.setUnreadCount)

  const query = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/api/v1/notifications/unread-count').then(r => r.data.count),
    refetchInterval: 30_000,        // poll every 30 seconds
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    if (query.data != null) setUnreadCount(query.data)
  }, [query.data, setUnreadCount])

  return query
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/api/v1/notifications').then(r => r.data),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/api/v1/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.setQueryData(['notifications', 'unread-count'], 0)
    },
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/store/notificationStore.ts frontend/src/hooks/useNotifications.ts
git commit -m "feat: add notification store and polling hooks"
```

---

## Task 5: Notification Bell & Panel UI

**Files:**
- Create: `frontend/src/components/notifications/NotificationBell.tsx`
- Create: `frontend/src/components/notifications/NotificationPanel.tsx`
- Modify: `frontend/src/layouts/AppLayout.tsx`

- [ ] **Step 1: NotificationBell**

```tsx
// frontend/src/components/notifications/NotificationBell.tsx
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell } from 'lucide-react'
import { useNotificationStore } from '../../store/notificationStore'
import { useUnreadCount } from '../../hooks/useNotifications'

export function NotificationBell() {
  useUnreadCount()  // starts the 30s poll as a side effect
  const { unreadCount, openPanel } = useNotificationStore()

  return (
    <button
      onClick={openPanel}
      className="relative p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
    >
      <Bell className="w-5 h-5" />
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.span
            key="badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white leading-none px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
```

- [ ] **Step 2: NotificationPanel**

```tsx
// frontend/src/components/notifications/NotificationPanel.tsx
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, CheckCheck } from 'lucide-react'
import { formatDistanceToNow, isToday } from 'date-fns'
import { useNotifications, useMarkAllRead } from '../../hooks/useNotifications'
import { useNotificationStore } from '../../store/notificationStore'

const TYPE_COLORS: Record<string, string> = {
  assigned:       'bg-blue-500/20 text-blue-400',
  commented:      'bg-green-500/20 text-green-400',
  status_changed: 'bg-purple-500/20 text-purple-400',
  sprint_ending:  'bg-amber-500/20 text-amber-400',
  sprint_closed:  'bg-zinc-600 text-zinc-300',
  mentioned:      'bg-pink-500/20 text-pink-400',
}

export function NotificationPanel() {
  const { isPanelOpen, closePanel } = useNotificationStore()
  const { data: notifications = [] } = useNotifications()
  const markAll = useMarkAllRead()

  const today = notifications.filter(n => isToday(new Date(n.created_at)))
  const earlier = notifications.filter(n => !isToday(new Date(n.created_at)))

  return (
    <AnimatePresence>
      {isPanelOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={closePanel} />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed top-14 right-4 w-96 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-zinc-400" />
                Notifications
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => markAll.mutate()}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
                <button onClick={closePanel} className="p-1 text-zinc-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto max-h-[480px]">
              {today.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider px-4 py-2">Today</p>
                  {today.map(n => <NotificationItem key={n.id} notification={n} />)}
                </div>
              )}
              {earlier.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider px-4 py-2">Earlier</p>
                  {earlier.map(n => <NotificationItem key={n.id} notification={n} />)}
                </div>
              )}
              {notifications.length === 0 && (
                <div className="text-center py-12 text-zinc-600">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No notifications</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function NotificationItem({ notification }: { notification: any }) {
  const colorClass = TYPE_COLORS[notification.type] ?? 'bg-zinc-700 text-zinc-300'
  return (
    <div className={`flex items-start gap-3 px-4 py-3 hover:bg-zinc-900 transition-colors ${!notification.is_read ? 'bg-zinc-900/50' : ''}`}>
      <span className={`text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 flex-shrink-0 ${colorClass}`}>
        {notification.type.replace(/_/g, ' ')}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 leading-snug">{notification.message}</p>
        <p className="text-xs text-zinc-600 mt-0.5">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      {!notification.is_read && (
        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add bell to AppLayout header**

Open `frontend/src/layouts/AppLayout.tsx`. In the header bar, add:

```tsx
import { NotificationBell } from '../components/notifications/NotificationBell'
import { NotificationPanel } from '../components/notifications/NotificationPanel'

// In the header, before the user avatar:
<NotificationBell />

// At the end of the layout (inside the root element):
<NotificationPanel />
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/notifications/ frontend/src/layouts/AppLayout.tsx frontend/src/store/notificationStore.ts
git commit -m "feat: add NotificationBell with animated badge and NotificationPanel"
```

---

## Task 6: System Settings Model & Migration

**Files:**
- Create: `backend/app/domains/settings/models.py`

- [ ] **Step 1: Write import test**

```python
# backend/tests/domains/settings/test_settings.py
def test_model_importable():
    from app.domains.settings.models import SystemSetting
    assert SystemSetting.__tablename__ == "system_settings"
```

- [ ] **Step 2: Run to confirm failure**

```bash
python -m pytest tests/domains/settings/test_settings.py::test_model_importable -v
```

- [ ] **Step 3: Implement model**

```python
# backend/app/domains/settings/models.py
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class SettingValueType(str, enum.Enum):
    STRING  = "string"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    JSON    = "json"


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key          = Column(String(100), primary_key=True)
    value        = Column(Text, nullable=False)
    value_type   = Column(SAEnum(SettingValueType), nullable=False, default=SettingValueType.STRING)
    label        = Column(String(200), nullable=False)
    description  = Column(Text, nullable=True)
    module       = Column(String(50), nullable=False)   # general|tickets|sprints|uploads|notifications|access
    is_sensitive = Column(Boolean, default=False, nullable=False)
    updated_by   = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

- [ ] **Step 4: Register and migrate**

```python
# Add to alembic/env.py:
from app.domains.settings import models as settings_models  # noqa: F401
```

```bash
alembic revision --autogenerate -m "system_settings"
alembic upgrade head
```

- [ ] **Step 5: Run test**

```bash
python -m pytest tests/domains/settings/test_settings.py::test_model_importable -v
```

Expected: `1 passed`.

- [ ] **Step 6: Commit**

```bash
git add app/domains/settings/models.py alembic/ tests/domains/settings/
git commit -m "feat: add SystemSetting model and migration (0007)"
```

---

## Task 7: Settings Seed, Cache & Service

**Files:**
- Create: `backend/app/domains/settings/seed.py`
- Create: `backend/app/domains/settings/cache.py`
- Create: `backend/app/domains/settings/service.py`

- [ ] **Step 1: Write tests**

```python
# backend/tests/domains/settings/test_settings.py  (add to file)
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.settings.seed import seed_settings
from app.domains.settings.service import get_setting, update_setting

@pytest.mark.asyncio
async def test_seed_creates_defaults(db: AsyncSession):
    await seed_settings(db)
    val = await get_setting("max_upload_size_mb", db)
    assert val == 25

@pytest.mark.asyncio
async def test_seed_is_idempotent(db: AsyncSession):
    await seed_settings(db)
    await seed_settings(db)  # must not raise or duplicate
    val = await get_setting("app_name", db)
    assert val == "Key Guard"

@pytest.mark.asyncio
async def test_update_setting(db: AsyncSession):
    await seed_settings(db)
    await update_setting("app_name", "My App", db)
    val = await get_setting("app_name", db)
    assert val == "My App"
```

- [ ] **Step 2: Run to confirm failure**

```bash
python -m pytest tests/domains/settings/ -v -k "seed or update_setting"
```

- [ ] **Step 3: Implement seed.py**

```python
# backend/app/domains/settings/seed.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.domains.settings.models import SystemSetting, SettingValueType

DEFAULTS: list[dict] = [
    # General
    {"key": "app_name",                       "value": "Key Guard",                       "value_type": "string",  "label": "Application Name",              "description": "Displayed in the browser tab and header",                "module": "general",       "is_sensitive": False},
    {"key": "app_logo_url",                   "value": "",                                 "value_type": "string",  "label": "Logo URL",                       "description": "URL to a custom logo image",                             "module": "general",       "is_sensitive": False},
    {"key": "default_timezone",               "value": "UTC",                              "value_type": "string",  "label": "Default Timezone",               "description": "Used for date display across the app",                   "module": "general",       "is_sensitive": False},
    # Tickets
    {"key": "default_ticket_priority",        "value": "medium",                           "value_type": "string",  "label": "Default Priority",               "description": "Priority assigned to new tickets by default",            "module": "tickets",       "is_sensitive": False},
    {"key": "story_points_enabled",           "value": "true",                             "value_type": "boolean", "label": "Enable Story Points",            "description": "Show story points field on tickets",                     "module": "tickets",       "is_sensitive": False},
    {"key": "story_points_scale",             "value": "1,2,3,5,8,13,21",                 "value_type": "string",  "label": "Story Points Scale",             "description": "Comma-separated allowed values",                         "module": "tickets",       "is_sensitive": False},
    {"key": "allow_viewers_to_comment",       "value": "false",                            "value_type": "boolean", "label": "Allow Viewers to Comment",       "description": "Let viewer-role users post comments",                    "module": "tickets",       "is_sensitive": False},
    # Sprints
    {"key": "default_sprint_duration_days",   "value": "14",                               "value_type": "integer", "label": "Default Sprint Duration (days)", "description": "Pre-filled end date when creating a sprint",             "module": "sprints",       "is_sensitive": False},
    {"key": "sprint_naming_pattern",          "value": "Sprint {n}",                       "value_type": "string",  "label": "Sprint Naming Pattern",          "description": "Auto-generated name template. {n} = sprint number",     "module": "sprints",       "is_sensitive": False},
    {"key": "auto_move_incomplete_on_close",  "value": "true",                             "value_type": "boolean", "label": "Auto-move incomplete on close",  "description": "Move unfinished tickets to backlog when sprint closes",   "module": "sprints",       "is_sensitive": False},
    # Uploads
    {"key": "max_upload_size_mb",             "value": "25",                               "value_type": "integer", "label": "Max Upload Size (MB)",           "description": "Maximum file size for ticket attachments",               "module": "uploads",       "is_sensitive": False},
    {"key": "allowed_mime_types",             "value": "image/*,application/pdf,text/*,application/zip", "value_type": "string", "label": "Allowed File Types", "description": "Comma-separated MIME type prefixes",                   "module": "uploads",       "is_sensitive": False},
    # Notifications
    {"key": "notification_retention_days",    "value": "90",                               "value_type": "integer", "label": "Notification Retention (days)",  "description": "Delete read notifications older than this",              "module": "notifications", "is_sensitive": False},
    {"key": "notify_on_assignment",           "value": "true",                             "value_type": "boolean", "label": "Notify on assignment",           "description": "Send notification when a ticket is assigned",            "module": "notifications", "is_sensitive": False},
    {"key": "notify_on_mention",              "value": "true",                             "value_type": "boolean", "label": "Notify on @mention",             "description": "Send notification when mentioned in a comment",          "module": "notifications", "is_sensitive": False},
    {"key": "notify_on_sprint_end_days",      "value": "2",                                "value_type": "integer", "label": "Sprint end warning (days)",       "description": "Notify team X days before sprint ends",                  "module": "notifications", "is_sensitive": False},
    # Access
    {"key": "who_can_create_project",         "value": "admin,pm",                         "value_type": "string",  "label": "Who can create projects",        "description": "Comma-separated role slugs allowed to create projects",  "module": "access",        "is_sensitive": False},
    {"key": "default_project_member_role",    "value": "developer",                        "value_type": "string",  "label": "Default member role",            "description": "Role assigned to new project members by default",        "module": "access",        "is_sensitive": False},
    {"key": "allow_self_assign",              "value": "true",                             "value_type": "boolean", "label": "Allow self-assignment",          "description": "Let users assign tickets to themselves",                 "module": "access",        "is_sensitive": False},
]


async def seed_settings(db: AsyncSession) -> None:
    """Idempotent — inserts only missing settings, never overwrites existing values."""
    for s in DEFAULTS:
        result = await db.execute(
            select(SystemSetting).where(SystemSetting.key == s["key"])
        )
        if not result.scalar_one_or_none():
            db.add(SystemSetting(**s))
    await db.commit()
```

- [ ] **Step 4: Implement cache.py**

```python
# backend/app/domains/settings/cache.py
import time
from typing import Any

_cache: dict[str, tuple[Any, float]] = {}
TTL = 60.0  # seconds


def get(key: str) -> Any | None:
    if key in _cache:
        value, ts = _cache[key]
        if time.monotonic() - ts < TTL:
            return value
        del _cache[key]
    return None


def set(key: str, value: Any) -> None:
    _cache[key] = (value, time.monotonic())


def invalidate(key: str) -> None:
    _cache.pop(key, None)


def invalidate_all() -> None:
    _cache.clear()
```

- [ ] **Step 5: Implement service.py**

```python
# backend/app/domains/settings/service.py
from uuid import UUID
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from app.domains.settings.models import SystemSetting, SettingValueType
from app.domains.settings import cache as setting_cache
import json


def _parse(setting: SystemSetting) -> Any:
    """Convert stored string value to the correct Python type."""
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
    """Non-sensitive settings consumed by the frontend on startup."""
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
```

- [ ] **Step 6: Call seed in main.py startup**

```python
# Add to the on_startup handler in main.py:
from app.domains.settings.seed import seed_settings
# Inside on_startup():
async with AsyncSessionLocal() as db:
    await seed_settings(db)
```

- [ ] **Step 7: Run tests**

```bash
python -m pytest tests/domains/settings/ -v
```

Expected: `4 passed`.

- [ ] **Step 8: Commit**

```bash
git add app/domains/settings/ tests/domains/settings/ app/main.py
git commit -m "feat: add settings seed with 19 defaults, in-memory TTL cache, and service"
```

---

## Task 8: Settings Router

**Files:**
- Create: `backend/app/domains/settings/schemas.py`
- Create: `backend/app/domains/settings/router.py`

- [ ] **Step 1: Schemas**

```python
# backend/app/domains/settings/schemas.py
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


class PublicSettingsOut(BaseModel):
    # Typed fields matching the public keys
    app_name: str = "Key Guard"
    app_logo_url: str = ""
    story_points_enabled: bool = True
    story_points_scale: str = "1,2,3,5,8,13,21"
    default_ticket_priority: str = "medium"
```

- [ ] **Step 2: Router**

```python
# backend/app/domains/settings/router.py
from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User, UserRole
from app.security.dependencies import get_current_user
from app.domains.settings import service
from app.domains.settings.schemas import SettingOut, SettingUpdate

router = APIRouter(tags=["settings"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        from fastapi import HTTPException, status
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
```

- [ ] **Step 3: Register in main.py**

```python
from app.domains.settings.router import router as settings_router
app.include_router(settings_router)
```

- [ ] **Step 4: Commit**

```bash
git add app/domains/settings/schemas.py app/domains/settings/router.py app/main.py
git commit -m "feat: add admin settings API with public endpoint for frontend startup"
```

---

## Task 9: Frontend Settings Store & Hooks

**Files:**
- Create: `frontend/src/store/settingsStore.ts`
- Create: `frontend/src/hooks/usePublicSettings.ts`
- Create: `frontend/src/hooks/useSystemSettings.ts`

- [ ] **Step 1: settingsStore.ts**

```typescript
// frontend/src/store/settingsStore.ts
import { create } from 'zustand'

interface PublicSettings {
  app_name: string
  app_logo_url: string
  story_points_enabled: boolean
  story_points_scale: string
  default_ticket_priority: string
}

interface SettingsState {
  settings: PublicSettings
  setSettings: (s: PublicSettings) => void
}

const DEFAULTS: PublicSettings = {
  app_name: 'Key Guard',
  app_logo_url: '',
  story_points_enabled: true,
  story_points_scale: '1,2,3,5,8,13,21',
  default_ticket_priority: 'medium',
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULTS,
  setSettings: (settings) => set({ settings }),
}))
```

- [ ] **Step 2: usePublicSettings.ts**

```typescript
// frontend/src/hooks/usePublicSettings.ts
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { useSettingsStore } from '../store/settingsStore'

export function usePublicSettings() {
  const setSettings = useSettingsStore(s => s.setSettings)

  const query = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => api.get('/api/v1/settings/public').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (query.data) setSettings(query.data)
  }, [query.data, setSettings])

  return query
}
```

- [ ] **Step 3: useSystemSettings.ts**

```typescript
// frontend/src/hooks/useSystemSettings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import toast from 'react-hot-toast'

export interface SystemSetting {
  key: string
  value: string
  value_type: 'string' | 'integer' | 'boolean' | 'json'
  label: string
  description: string | null
  module: string
  is_sensitive: boolean
}

export function useSystemSettings(module?: string) {
  return useQuery({
    queryKey: ['admin', 'settings', module],
    queryFn: () =>
      api.get<SystemSetting[]>('/api/v1/admin/settings', { params: module ? { module } : undefined })
         .then(r => r.data),
  })
}

export function useUpdateSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.patch<SystemSetting>(`/api/v1/admin/settings/${key}`, { value }).then(r => r.data),
    onSuccess: (_, { key }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
      qc.invalidateQueries({ queryKey: ['settings', 'public'] })
      toast.success(`Setting updated`, { duration: 1500 })
    },
    onError: () => toast.error('Failed to save setting'),
  })
}
```

- [ ] **Step 4: Load public settings at app startup**

Open `frontend/src/App.tsx`. Add at the top of the main `App` component:

```tsx
import { usePublicSettings } from './hooks/usePublicSettings'

// Inside App():
usePublicSettings()  // loads once on mount, populates settingsStore
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/store/settingsStore.ts frontend/src/hooks/usePublicSettings.ts frontend/src/hooks/useSystemSettings.ts frontend/src/App.tsx
git commit -m "feat: add settings store, public settings loader, admin settings hook"
```

---

## Task 10: Admin Settings Page

**Files:**
- Create: `frontend/src/pages/Settings/SystemSettingsPage.tsx`
- Create: `frontend/src/pages/Settings/tabs/GeneralSettingsTab.tsx`
- Create: `frontend/src/pages/Settings/tabs/TicketSettingsTab.tsx`
- Create: `frontend/src/pages/Settings/tabs/SprintSettingsTab.tsx`
- Create: `frontend/src/pages/Settings/tabs/UploadSettingsTab.tsx`
- Create: `frontend/src/pages/Settings/tabs/NotificationSettingsTab.tsx`
- Create: `frontend/src/pages/Settings/tabs/AccessControlTab.tsx`

- [ ] **Step 1: Create a shared SettingField component**

Create `frontend/src/pages/Settings/tabs/SettingField.tsx`:

```tsx
// frontend/src/pages/Settings/tabs/SettingField.tsx
import React, { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { SystemSetting, useUpdateSetting } from '../../../hooks/useSystemSettings'

interface Props { setting: SystemSetting }

export function SettingField({ setting }: Props) {
  const update = useUpdateSetting()
  const [value, setValue] = useState(setting.value)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setValue(setting.value) }, [setting.value])

  const handleBlur = async () => {
    if (value === setting.value) return
    await update.mutateAsync({ key: setting.key, value })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-zinc-800 last:border-0">
      <div className="flex-1">
        <label className="block text-sm font-medium text-zinc-200 mb-0.5">{setting.label}</label>
        {setting.description && <p className="text-xs text-zinc-500">{setting.description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {setting.value_type === 'boolean' ? (
          <button
            onClick={() => {
              const next = value === 'true' ? 'false' : 'true'
              setValue(next)
              update.mutate({ key: setting.key, value: next })
            }}
            className={`relative w-10 h-6 rounded-full transition-colors ${
              value === 'true' ? 'bg-indigo-600' : 'bg-zinc-700'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              value === 'true' ? 'translate-x-5' : 'translate-x-1'
            }`} />
          </button>
        ) : (
          <div className="relative">
            <input
              type={setting.value_type === 'integer' ? 'number' : 'text'}
              value={value}
              onChange={e => setValue(e.target.value)}
              onBlur={handleBlur}
              className="w-52 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {saved && (
              <Check className="absolute right-2.5 top-2 w-3.5 h-3.5 text-green-400" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create each tab (same pattern, different module)**

```tsx
// frontend/src/pages/Settings/tabs/GeneralSettingsTab.tsx
import React from 'react'
import { useSystemSettings } from '../../../hooks/useSystemSettings'
import { SettingField } from './SettingField'

export function GeneralSettingsTab() {
  const { data: settings = [] } = useSystemSettings('general')
  return (
    <div>
      {settings.map(s => <SettingField key={s.key} setting={s} />)}
    </div>
  )
}
```

Repeat this exact pattern for each module, changing only the import name and module string:

- `TicketSettingsTab.tsx` → `useSystemSettings('tickets')`
- `SprintSettingsTab.tsx` → `useSystemSettings('sprints')`
- `UploadSettingsTab.tsx` → `useSystemSettings('uploads')`
- `NotificationSettingsTab.tsx` → `useSystemSettings('notifications')`
- `AccessControlTab.tsx` → `useSystemSettings('access')`

- [ ] **Step 3: SystemSettingsPage**

```tsx
// frontend/src/pages/Settings/SystemSettingsPage.tsx
import React, { useState } from 'react'
import { Settings } from 'lucide-react'
import { GeneralSettingsTab }      from './tabs/GeneralSettingsTab'
import { TicketSettingsTab }       from './tabs/TicketSettingsTab'
import { SprintSettingsTab }       from './tabs/SprintSettingsTab'
import { UploadSettingsTab }       from './tabs/UploadSettingsTab'
import { NotificationSettingsTab } from './tabs/NotificationSettingsTab'
import { AccessControlTab }        from './tabs/AccessControlTab'

const TABS = [
  { id: 'general',       label: 'General',       component: GeneralSettingsTab },
  { id: 'tickets',       label: 'Tickets',        component: TicketSettingsTab },
  { id: 'sprints',       label: 'Sprints',        component: SprintSettingsTab },
  { id: 'uploads',       label: 'Uploads',        component: UploadSettingsTab },
  { id: 'notifications', label: 'Notifications',  component: NotificationSettingsTab },
  { id: 'access',        label: 'Access Control', component: AccessControlTab },
] as const

export function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState<string>('general')
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component ?? GeneralSettingsTab

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-6 h-6 text-zinc-400" />
        <div>
          <h1 className="text-xl font-bold text-white">System Settings</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Configure application behaviour without code changes</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-8 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <ActiveComponent />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add route to App.tsx**

```tsx
import { SystemSettingsPage } from './pages/Settings/SystemSettingsPage'
<Route path="/settings/system" element={<SystemSettingsPage />} />
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Settings/ frontend/src/App.tsx
git commit -m "feat: add Admin Settings page with tabbed modules and save-on-blur fields"
```

---

## Task 11: End-to-End Verification

- [ ] **Step 1: Verify notifications**
  - Log in as Developer. Assign a ticket to another user → that user should see unread count = 1 in bell
  - Change ticket status → watcher sees notification in panel
  - Click "Mark all read" → badge disappears

- [ ] **Step 2: Verify notification polling**
  - Open DevTools → Network tab → confirm `GET /api/v1/notifications/unread-count` fires every 30s

- [ ] **Step 3: Verify settings page**
  - Log in as Admin → navigate to `/settings/system`
  - Click Tickets tab → toggle "Enable Story Points" to off → toggle persists after page refresh
  - Change "App Name" to "My Team's Tool" → blur field → inline checkmark appears → value persists after refresh
  - Log in as Developer → confirm `/settings/system` returns 403

- [ ] **Step 4: Verify public settings consumed**
  - With story_points_enabled = false, open TicketForm → story points field should be hidden
  - (Requires reading `settingsStore.settings.story_points_enabled` in TicketForm)

  In `frontend/src/components/tickets/TicketForm.tsx`, add:

  ```tsx
  import { useSettingsStore } from '../../store/settingsStore'
  const { story_points_enabled } = useSettingsStore(s => s.settings)

  // In the form JSX, conditionally render:
  {story_points_enabled && (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1">Story Points</label>
      <input type="number" ... />
    </div>
  )}
  ```

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat(phase-5): complete in-app notifications and admin settings system"
```

---

## Phase Complete

All 5 phases build Key Guard's Project Management module:

| Phase | Delivered |
|---|---|
| 1 | Modular domain structure + full RBAC with custom roles |
| 2 | Ticket system + Kanban board + list view + parking lot + backlog |
| 3 | Sprint lifecycle + epic management |
| 4 | Rich text descriptions + threaded comments + activity log + file attachments |
| 5 | In-app notifications + admin settings page |

Each phase produces working, deployable software independently.
