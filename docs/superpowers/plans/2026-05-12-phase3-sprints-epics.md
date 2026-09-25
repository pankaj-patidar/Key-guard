# Phase 3: Sprints & Epics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver complete sprint lifecycle management (create, activate, close with auto-ticket migration) and epic management (create, link tickets, track progress). Frontend includes sprint header with progress bar, sprint board view, and epics overview page.

**Architecture:** `backend/app/domains/sprints/` and `backend/app/domains/epics/` each own their router + service. Models are already defined in the tickets domain (Ticket, SprintDetail). No new DB migration needed.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, React 18, TanStack Query v5, date-fns, TailwindCSS.

**Prerequisite:** Phase 2 complete.

---

## File Map

**Create:**
- `backend/app/domains/sprints/__init__.py`
- `backend/app/domains/sprints/service.py`
- `backend/app/domains/sprints/router.py`
- `backend/app/domains/sprints/schemas.py`
- `backend/app/domains/epics/__init__.py`
- `backend/app/domains/epics/service.py`
- `backend/app/domains/epics/router.py`
- `backend/app/domains/epics/schemas.py`
- `backend/tests/domains/sprints/__init__.py`
- `backend/tests/domains/sprints/test_sprints.py`
- `frontend/src/hooks/useSprints.ts`
- `frontend/src/hooks/useEpics.ts`
- `frontend/src/components/sprints/SprintHeader.tsx`
- `frontend/src/components/sprints/SprintSelector.tsx`
- `frontend/src/components/sprints/SprintForm.tsx`
- `frontend/src/components/epics/EpicProgressBar.tsx`
- `frontend/src/components/epics/EpicSelector.tsx`
- `frontend/src/components/epics/EpicForm.tsx`
- `frontend/src/pages/ProjectManagement/EpicsPage.tsx`

**Modify:**
- `backend/app/main.py` — register sprint + epic routers
- `frontend/src/App.tsx` — add epics route
- `frontend/src/layouts/Sidebar.tsx` — add Epics nav link
- `frontend/src/components/tickets/TicketDetailDrawer.tsx` — add Sprint + Epic selectors

---

## Task 1: Sprint Schemas

**Files:**
- Create: `backend/app/domains/sprints/schemas.py`

- [ ] **Step 1: Implement**

```python
# backend/app/domains/sprints/schemas.py
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field
from app.domains.tickets.schemas import TicketOut


class SprintCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    start_date: date | None = None
    end_date: date | None = None
    goal: str | None = None


class SprintUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    start_date: date | None = None
    end_date: date | None = None
    goal: str | None = None


class SprintOut(BaseModel):
    id: UUID
    ticket_number: int
    project_id: UUID
    title: str
    start_date: date | None
    end_date: date | None
    goal: str | None
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class SprintWithTickets(SprintOut):
    tickets: list[TicketOut] = []


class AddTicketToSprint(BaseModel):
    ticket_number: int
```

- [ ] **Step 2: Commit**

```bash
cd backend
git add app/domains/sprints/
git commit -m "feat: add sprint schemas"
```

---

## Task 2: Sprint Service

**Files:**
- Create: `backend/app/domains/sprints/service.py`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/domains/sprints/test_sprints.py
import pytest
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.sprints.service import (
    create_sprint, activate_sprint, close_sprint,
    SprintConflictError,
)
from app.domains.tickets.models import TicketType, TicketStatus

@pytest.mark.asyncio
async def test_create_sprint(db: AsyncSession, project, reporter):
    sprint = await create_sprint(project.id, "Sprint 1", reporter.id, db,
                                  end_date=date.today() + timedelta(days=14))
    assert sprint.type.value == "sprint"
    assert sprint.sprint_detail is not None
    assert sprint.sprint_detail.is_active is False

@pytest.mark.asyncio
async def test_activate_sprint(db: AsyncSession, project, reporter):
    sprint = await create_sprint(project.id, "Sprint 1", reporter.id, db)
    activated = await activate_sprint(sprint.id, db)
    assert activated.sprint_detail.is_active is True

@pytest.mark.asyncio
async def test_only_one_active_sprint_per_project(db: AsyncSession, project, reporter):
    s1 = await create_sprint(project.id, "Sprint 1", reporter.id, db)
    await activate_sprint(s1.id, db)
    s2 = await create_sprint(project.id, "Sprint 2", reporter.id, db)
    with pytest.raises(SprintConflictError):
        await activate_sprint(s2.id, db)

@pytest.mark.asyncio
async def test_close_sprint_moves_incomplete_to_backlog(db: AsyncSession, project, reporter):
    from app.domains.tickets.service import create_ticket
    from app.domains.tickets.schemas import TicketCreate

    sprint = await create_sprint(project.id, "Sprint 1", reporter.id, db)
    await activate_sprint(sprint.id, db)

    task = await create_ticket(project.id,
        TicketCreate(title="Incomplete task", type=TicketType.TASK, sprint_id=sprint.id,
                     status=TicketStatus.IN_PROGRESS),
        reporter.id, db)

    await close_sprint(sprint.id, db)
    await db.refresh(task)
    assert task.status == TicketStatus.BACKLOG
    assert task.sprint_id is None
```

- [ ] **Step 2: Run to confirm failure**

```bash
python -m pytest tests/domains/sprints/test_sprints.py -v
```

Expected: `ImportError`.

- [ ] **Step 3: Implement service**

```python
# backend/app/domains/sprints/service.py
from uuid import UUID
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status
from app.domains.tickets.models import Ticket, TicketType, TicketStatus, SprintDetail
from app.domains.tickets.schemas import TicketCreate
from app.domains.tickets import service as ticket_service


class SprintConflictError(Exception):
    pass


async def _get_sprint_ticket(sprint_id: UUID, db: AsyncSession) -> Ticket:
    result = await db.execute(
        select(Ticket).where(Ticket.id == sprint_id, Ticket.type == TicketType.SPRINT)
    )
    sprint = result.scalar_one_or_none()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return sprint


async def list_sprints(project_id: UUID, db: AsyncSession) -> list[Ticket]:
    result = await db.execute(
        select(Ticket)
        .where(Ticket.project_id == project_id, Ticket.type == TicketType.SPRINT)
        .order_by(Ticket.created_at.desc())
    )
    return list(result.scalars().all())


async def create_sprint(
    project_id: UUID,
    title: str,
    reporter_id: UUID,
    db: AsyncSession,
    start_date: date | None = None,
    end_date: date | None = None,
    goal: str | None = None,
) -> Ticket:
    data = TicketCreate(
        title=title,
        type=TicketType.SPRINT,
        sprint_start_date=start_date,
        sprint_end_date=end_date,
        sprint_goal=goal,
    )
    return await ticket_service.create_ticket(project_id, data, reporter_id, db)


async def activate_sprint(sprint_id: UUID, db: AsyncSession) -> Ticket:
    sprint = await _get_sprint_ticket(sprint_id, db)

    # Check no other sprint is active in this project
    result = await db.execute(
        select(SprintDetail)
        .join(Ticket, Ticket.id == SprintDetail.ticket_id)
        .where(
            Ticket.project_id == sprint.project_id,
            SprintDetail.is_active == True,
            Ticket.id != sprint_id,
        )
    )
    active = result.scalar_one_or_none()
    if active:
        raise SprintConflictError("Another sprint is already active. Close it before activating a new one.")

    if sprint.sprint_detail:
        sprint.sprint_detail.is_active = True
        if not sprint.sprint_detail.start_date:
            sprint.sprint_detail.start_date = date.today()
    await db.commit()
    await db.refresh(sprint)
    return sprint


async def close_sprint(sprint_id: UUID, db: AsyncSession) -> Ticket:
    sprint = await _get_sprint_ticket(sprint_id, db)

    # Move all non-done tickets back to backlog
    result = await db.execute(
        select(Ticket).where(
            Ticket.sprint_id == sprint_id,
            Ticket.status != TicketStatus.DONE,
            Ticket.status != TicketStatus.CANCELLED,
        )
    )
    incomplete = result.scalars().all()
    for t in incomplete:
        t.status = TicketStatus.BACKLOG
        t.sprint_id = None

    if sprint.sprint_detail:
        sprint.sprint_detail.is_active = False

    await db.commit()
    await db.refresh(sprint)
    return sprint


async def add_ticket_to_sprint(sprint_id: UUID, ticket_id: UUID, db: AsyncSession) -> Ticket:
    ticket = await ticket_service.get_ticket(ticket_id, db)
    ticket.sprint_id = sprint_id
    await db.commit()
    await db.refresh(ticket)
    return ticket


async def remove_ticket_from_sprint(sprint_id: UUID, ticket_id: UUID, db: AsyncSession) -> None:
    ticket = await ticket_service.get_ticket(ticket_id, db)
    if str(ticket.sprint_id) != str(sprint_id):
        raise HTTPException(status_code=400, detail="Ticket is not in this sprint")
    ticket.sprint_id = None
    await db.commit()
```

- [ ] **Step 4: Run tests**

```bash
python -m pytest tests/domains/sprints/test_sprints.py -v
```

Expected: `4 passed`.

- [ ] **Step 5: Commit**

```bash
git add app/domains/sprints/service.py tests/domains/sprints/
git commit -m "feat: add sprint service with activate/close lifecycle and conflict guard"
```

---

## Task 3: Sprint Router

**Files:**
- Create: `backend/app/domains/sprints/router.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Implement router**

```python
# backend/app/domains/sprints/router.py
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.security.dependencies import get_current_user
from app.domains.sprints import service
from app.domains.sprints.schemas import SprintCreate, SprintUpdate, SprintOut, AddTicketToSprint
from app.domains.sprints.service import SprintConflictError
from app.domains.roles.rbac import require_permission
from app.domains.tickets import service as ticket_service

router = APIRouter(prefix="/api/v1/projects/{project_id}", tags=["sprints"])


@router.get("/sprints", response_model=list[SprintOut])
async def list_sprints(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_sprints(project_id, db)


@router.post("/sprints", response_model=SprintOut, status_code=status.HTTP_201_CREATED)
async def create_sprint(
    project_id: UUID,
    data: SprintCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("sprint:create", current_user, db, project_id=project_id)
    return await service.create_sprint(
        project_id, data.title, current_user.id, db,
        start_date=data.start_date, end_date=data.end_date, goal=data.goal,
    )


@router.get("/sprints/{sprint_id}", response_model=SprintOut)
async def get_sprint(
    project_id: UUID,
    sprint_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.domains.tickets.models import Ticket, TicketType
    from sqlalchemy import select
    result = await db.execute(select(Ticket).where(Ticket.id == sprint_id, Ticket.type == TicketType.SPRINT))
    sprint = result.scalar_one_or_none()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return sprint


@router.post("/sprints/{sprint_id}/activate", response_model=SprintOut)
async def activate_sprint(
    project_id: UUID,
    sprint_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("sprint:activate", current_user, db, project_id=project_id)
    try:
        return await service.activate_sprint(sprint_id, db)
    except SprintConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/sprints/{sprint_id}/close", response_model=SprintOut)
async def close_sprint(
    project_id: UUID,
    sprint_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("sprint:close", current_user, db, project_id=project_id)
    return await service.close_sprint(sprint_id, db)


@router.post("/sprints/{sprint_id}/tickets", status_code=status.HTTP_200_OK)
async def add_ticket_to_sprint(
    project_id: UUID,
    sprint_id: UUID,
    data: AddTicketToSprint,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("ticket:move_sprint", current_user, db, project_id=project_id)
    ticket = await ticket_service.get_ticket_by_number(project_id, data.ticket_number, db)
    return await service.add_ticket_to_sprint(sprint_id, ticket.id, db)


@router.delete("/sprints/{sprint_id}/tickets/{ticket_number}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_ticket_from_sprint(
    project_id: UUID,
    sprint_id: UUID,
    ticket_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("ticket:move_sprint", current_user, db, project_id=project_id)
    ticket = await ticket_service.get_ticket_by_number(project_id, ticket_number, db)
    await service.remove_ticket_from_sprint(sprint_id, ticket.id, db)
```

- [ ] **Step 2: Register in main.py**

```python
from app.domains.sprints.router import router as sprints_router
app.include_router(sprints_router)
```

- [ ] **Step 3: Commit**

```bash
git add app/domains/sprints/router.py app/main.py
git commit -m "feat: add sprint REST API with activate/close endpoints"
```

---

## Task 4: Epic Service & Router

**Files:**
- Create: `backend/app/domains/epics/schemas.py`
- Create: `backend/app/domains/epics/service.py`
- Create: `backend/app/domains/epics/router.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Implement schemas**

```python
# backend/app/domains/epics/schemas.py
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field
from app.domains.tickets.schemas import TicketOut


class EpicCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: dict | None = None


class EpicOut(BaseModel):
    id: UUID
    ticket_number: int
    project_id: UUID
    title: str
    is_archived: bool
    created_at: datetime
    total_tickets: int = 0
    done_tickets: int = 0
    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Implement service**

```python
# backend/app/domains/epics/service.py
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException
from app.domains.tickets.models import Ticket, TicketType, TicketStatus
from app.domains.tickets.schemas import TicketCreate
from app.domains.tickets import service as ticket_service


async def list_epics(project_id: UUID, db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(Ticket).where(
            Ticket.project_id == project_id,
            Ticket.type == TicketType.EPIC,
            Ticket.is_archived == False,
        ).order_by(Ticket.created_at.desc())
    )
    epics = result.scalars().all()
    output = []
    for epic in epics:
        total_result = await db.execute(
            select(func.count()).select_from(Ticket).where(Ticket.epic_id == epic.id)
        )
        done_result = await db.execute(
            select(func.count()).select_from(Ticket).where(
                Ticket.epic_id == epic.id, Ticket.status == TicketStatus.DONE
            )
        )
        total = total_result.scalar() or 0
        done = done_result.scalar() or 0
        output.append({**epic.__dict__, "total_tickets": total, "done_tickets": done})
    return output


async def create_epic(project_id: UUID, title: str, reporter_id: UUID, db: AsyncSession) -> Ticket:
    data = TicketCreate(title=title, type=TicketType.EPIC)
    return await ticket_service.create_ticket(project_id, data, reporter_id, db)


async def get_epic_tickets(epic_id: UUID, db: AsyncSession) -> list[Ticket]:
    result = await db.execute(select(Ticket).where(Ticket.epic_id == epic_id))
    return list(result.scalars().all())


async def link_ticket_to_epic(epic_id: UUID, ticket_id: UUID, db: AsyncSession) -> Ticket:
    ticket = await ticket_service.get_ticket(ticket_id, db)
    ticket.epic_id = epic_id
    await db.commit()
    await db.refresh(ticket)
    return ticket


async def unlink_ticket_from_epic(ticket_id: UUID, db: AsyncSession) -> None:
    ticket = await ticket_service.get_ticket(ticket_id, db)
    ticket.epic_id = None
    await db.commit()
```

- [ ] **Step 3: Implement router**

```python
# backend/app/domains/epics/router.py
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.security.dependencies import get_current_user
from app.domains.epics import service
from app.domains.epics.schemas import EpicCreate, EpicOut
from app.domains.roles.rbac import require_permission
from app.domains.tickets.schemas import TicketOut

router = APIRouter(prefix="/api/v1/projects/{project_id}", tags=["epics"])


@router.get("/epics", response_model=list[EpicOut])
async def list_epics(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_epics(project_id, db)


@router.post("/epics", response_model=EpicOut, status_code=status.HTTP_201_CREATED)
async def create_epic(
    project_id: UUID,
    data: EpicCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("epic:create", current_user, db, project_id=project_id)
    return await service.create_epic(project_id, data.title, current_user.id, db)


@router.get("/epics/{epic_id}/tickets", response_model=list[TicketOut])
async def get_epic_tickets(
    project_id: UUID,
    epic_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_epic_tickets(epic_id, db)
```

- [ ] **Step 4: Register in main.py**

```python
from app.domains.epics.router import router as epics_router
app.include_router(epics_router)
```

- [ ] **Step 5: Commit**

```bash
git add app/domains/epics/ app/main.py
git commit -m "feat: add epic service and REST API with ticket linking"
```

---

## Task 5: Frontend Sprint Hooks & Components

**Files:**
- Create: `frontend/src/hooks/useSprints.ts`
- Create: `frontend/src/components/sprints/SprintHeader.tsx`
- Create: `frontend/src/components/sprints/SprintSelector.tsx`
- Create: `frontend/src/components/sprints/SprintForm.tsx`

- [ ] **Step 1: useSprints.ts**

```typescript
// frontend/src/hooks/useSprints.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export interface Sprint {
  id: string
  ticket_number: number
  project_id: string
  title: string
  start_date: string | null
  end_date: string | null
  goal: string | null
  is_active: boolean
  created_at: string
}

const key = (projectId: string) => ['projects', projectId, 'sprints']

export function useSprints(projectId: string) {
  return useQuery({
    queryKey: key(projectId),
    queryFn: () => api.get<Sprint[]>(`/api/v1/projects/${projectId}/sprints`).then(r => r.data),
  })
}

export function useActiveSprint(projectId: string) {
  const { data: sprints = [] } = useSprints(projectId)
  return sprints.find(s => s.is_active) ?? null
}

export function useCreateSprint(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; start_date?: string; end_date?: string; goal?: string }) =>
      api.post<Sprint>(`/api/v1/projects/${projectId}/sprints`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId) }),
  })
}

export function useActivateSprint(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sprintId: string) =>
      api.post<Sprint>(`/api/v1/projects/${projectId}/sprints/${sprintId}/activate`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId) }),
  })
}

export function useCloseSprint(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sprintId: string) =>
      api.post<Sprint>(`/api/v1/projects/${projectId}/sprints/${sprintId}/close`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(projectId) })
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'board'] })
    },
  })
}
```

- [ ] **Step 2: SprintHeader**

```tsx
// frontend/src/components/sprints/SprintHeader.tsx
import React from 'react'
import { differenceInDays, format, parseISO } from 'date-fns'
import { Play, Square, Calendar } from 'lucide-react'
import { Sprint, useActivateSprint, useCloseSprint } from '../../hooks/useSprints'
import toast from 'react-hot-toast'

interface Props {
  sprint: Sprint
  projectId: string
  doneCount: number
  totalCount: number
}

export function SprintHeader({ sprint, projectId, doneCount, totalCount }: Props) {
  const activate = useActivateSprint(projectId)
  const close = useCloseSprint(projectId)

  const daysLeft = sprint.end_date
    ? differenceInDays(parseISO(sprint.end_date), new Date())
    : null

  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const handleActivate = async () => {
    try { await activate.mutateAsync(sprint.id); toast.success('Sprint activated') }
    catch (e: any) { toast.error(e.response?.data?.detail ?? 'Failed to activate sprint') }
  }

  const handleClose = async () => {
    if (!confirm('Close sprint? Incomplete tickets will return to the backlog.')) return
    try { await close.mutateAsync(sprint.id); toast.success('Sprint closed') }
    catch { toast.error('Failed to close sprint') }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-white flex items-center gap-2">
            {sprint.title}
            {sprint.is_active && (
              <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full font-normal">Active</span>
            )}
          </h2>
          {sprint.goal && <p className="text-sm text-zinc-400 mt-0.5">{sprint.goal}</p>}
        </div>

        <div className="flex items-center gap-2">
          {sprint.end_date && (
            <span className={`text-xs flex items-center gap-1 ${daysLeft != null && daysLeft < 3 ? 'text-red-400' : 'text-zinc-400'}`}>
              <Calendar className="w-3.5 h-3.5" />
              {daysLeft != null ? (daysLeft > 0 ? `${daysLeft}d left` : 'Overdue') : format(parseISO(sprint.end_date), 'MMM d')}
            </span>
          )}
          {!sprint.is_active ? (
            <button onClick={handleActivate} disabled={activate.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">
              <Play className="w-3.5 h-3.5" /> Activate
            </button>
          ) : (
            <button onClick={handleClose} disabled={close.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">
              <Square className="w-3.5 h-3.5" /> Close Sprint
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
          <span>{doneCount}/{totalCount} done</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: pct === 100
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : 'linear-gradient(90deg, #6366f1, #818cf8)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: SprintSelector (dropdown for ticket detail)**

```tsx
// frontend/src/components/sprints/SprintSelector.tsx
import React from 'react'
import { Calendar } from 'lucide-react'
import { useSprints } from '../../hooks/useSprints'

interface Props {
  projectId: string
  value: string | null
  onChange: (sprintId: string | null) => void
}

export function SprintSelector({ projectId, value, onChange }: Props) {
  const { data: sprints = [] } = useSprints(projectId)

  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 mb-1 flex items-center gap-1">
        <Calendar className="w-3 h-3" /> Sprint
      </label>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
      >
        <option value="">No sprint</option>
        {sprints.map(s => (
          <option key={s.id} value={s.id}>{s.title}{s.is_active ? ' (Active)' : ''}</option>
        ))}
      </select>
    </div>
  )
}
```

- [ ] **Step 4: SprintForm modal**

```tsx
// frontend/src/components/sprints/SprintForm.tsx
import React, { useState } from 'react'
import { X } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { useCreateSprint } from '../../hooks/useSprints'
import toast from 'react-hot-toast'

interface Props { projectId: string; onClose: () => void }

export function SprintForm({ projectId, onClose }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const twoWeeks = format(addDays(new Date(), 14), 'yyyy-MM-dd')

  const [title, setTitle]     = useState('')
  const [startDate, setStart] = useState(today)
  const [endDate, setEnd]     = useState(twoWeeks)
  const [goal, setGoal]       = useState('')

  const create = useCreateSprint(projectId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    try {
      await create.mutateAsync({ title: title.trim(), start_date: startDate, end_date: endDate, goal: goal || undefined })
      toast.success('Sprint created')
      onClose()
    } catch { toast.error('Failed to create sprint') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="font-semibold text-white">New Sprint</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Sprint name" required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStart(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => setEnd(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Sprint goal (optional)"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500" />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
            <button type="submit" disabled={!title.trim() || create.isPending}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
              {create.isPending ? 'Creating…' : 'Create Sprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useSprints.ts frontend/src/components/sprints/
git commit -m "feat: add sprint hooks, SprintHeader with progress bar, SprintSelector, SprintForm"
```

---

## Task 6: Frontend Epic Hooks & Components

**Files:**
- Create: `frontend/src/hooks/useEpics.ts`
- Create: `frontend/src/components/epics/EpicProgressBar.tsx`
- Create: `frontend/src/components/epics/EpicSelector.tsx`
- Create: `frontend/src/components/epics/EpicForm.tsx`
- Create: `frontend/src/pages/ProjectManagement/EpicsPage.tsx`

- [ ] **Step 1: useEpics.ts**

```typescript
// frontend/src/hooks/useEpics.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export interface Epic {
  id: string
  ticket_number: number
  project_id: string
  title: string
  is_archived: boolean
  created_at: string
  total_tickets: number
  done_tickets: number
}

const key = (projectId: string) => ['projects', projectId, 'epics']

export function useEpics(projectId: string) {
  return useQuery({
    queryKey: key(projectId),
    queryFn: () => api.get<Epic[]>(`/api/v1/projects/${projectId}/epics`).then(r => r.data),
  })
}

export function useCreateEpic(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string }) =>
      api.post<Epic>(`/api/v1/projects/${projectId}/epics`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId) }),
  })
}
```

- [ ] **Step 2: EpicProgressBar**

```tsx
// frontend/src/components/epics/EpicProgressBar.tsx
import React from 'react'

interface Props { done: number; total: number; color?: string }

export function EpicProgressBar({ done, total, color = '#6366f1' }: Props) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs text-zinc-500 mb-1">
        <span>{done}/{total} tickets done</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: EpicSelector**

```tsx
// frontend/src/components/epics/EpicSelector.tsx
import React from 'react'
import { Zap } from 'lucide-react'
import { useEpics } from '../../hooks/useEpics'

interface Props { projectId: string; value: string | null; onChange: (epicId: string | null) => void }

export function EpicSelector({ projectId, value, onChange }: Props) {
  const { data: epics = [] } = useEpics(projectId)
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 mb-1 flex items-center gap-1">
        <Zap className="w-3 h-3 text-purple-400" /> Epic
      </label>
      <select value={value ?? ''} onChange={e => onChange(e.target.value || null)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500">
        <option value="">No epic</option>
        {epics.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
      </select>
    </div>
  )
}
```

- [ ] **Step 4: EpicsPage**

```tsx
// frontend/src/pages/ProjectManagement/EpicsPage.tsx
import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Zap, Plus } from 'lucide-react'
import { useEpics, useCreateEpic } from '../../hooks/useEpics'
import { EpicProgressBar } from '../../components/epics/EpicProgressBar'
import toast from 'react-hot-toast'

export function EpicsPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: epics = [], isLoading } = useEpics(slug!)
  const createEpic = useCreateEpic(slug!)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    try {
      await createEpic.mutateAsync({ title: newTitle.trim() })
      toast.success('Epic created')
      setNewTitle('')
      setShowForm(false)
    } catch { toast.error('Failed to create epic') }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-purple-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Epics</h1>
            <p className="text-zinc-400 text-sm mt-0.5">High-level themes grouping related tickets</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New Epic
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 flex gap-3">
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus
            placeholder="Epic title…"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500" />
          <button type="submit" disabled={!newTitle.trim() || createEpic.isPending}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            Create
          </button>
          <button type="button" onClick={() => setShowForm(false)}
            className="px-4 py-2 text-zinc-400 hover:text-white text-sm transition-colors">
            Cancel
          </button>
        </form>
      )}

      <div className="space-y-3">
        {epics.map(epic => (
          <div key={epic.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-white">{epic.title}</p>
                  <p className="text-xs font-mono text-zinc-500">{slug?.toUpperCase()}-{epic.ticket_number}</p>
                </div>
              </div>
            </div>
            <EpicProgressBar done={epic.done_tickets} total={epic.total_tickets} color="#8b5cf6" />
          </div>
        ))}
        {!isLoading && epics.length === 0 && (
          <div className="text-center py-20 text-zinc-600 text-sm border border-dashed border-zinc-800 rounded-xl">
            No epics yet
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Wire Sprint + Epic selectors into TicketDetailDrawer**

Open `frontend/src/components/tickets/TicketDetailDrawer.tsx`. In the detail content section, add after the priority/assignee fields:

```tsx
import { SprintSelector } from '../sprints/SprintSelector'
import { EpicSelector } from '../epics/EpicSelector'

// In the grid of ticket metadata fields, add:
<SprintSelector
  projectId={projectId}
  value={ticket.sprint_id}
  onChange={(sprintId) => updateTicket.mutate({ sprint_id: sprintId })}
/>
<EpicSelector
  projectId={projectId}
  value={ticket.epic_id}
  onChange={(epicId) => updateTicket.mutate({ epic_id: epicId })}
/>
```

You'll need to add `useUpdateTicket` to the drawer's imports. Add at the top of the component:

```tsx
const updateTicket = useUpdateTicket(projectId, ticket.ticket_number)
```

- [ ] **Step 6: Add Epics route and sidebar link**

In `App.tsx`:

```tsx
import { EpicsPage } from './pages/ProjectManagement/EpicsPage'
<Route path="/projects/:slug/epics" element={<EpicsPage />} />
```

In `Sidebar.tsx`, add after Parking Lot link:

```tsx
import { Zap } from 'lucide-react'
<NavLink to={`/projects/${slug}/epics`} icon={<Zap className="w-4 h-4" />} label="Epics" />
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: add epics page, EpicProgressBar, sprint/epic selectors in ticket drawer"
```

---

## Task 7: End-to-End Verification

- [ ] **Step 1: Sprint lifecycle**
  - Create a sprint → appears in sprint list
  - Activate it → button changes to "Close Sprint", progress bar shows
  - Create a second sprint → try to activate → confirm 409 error toast
  - Mark some tickets as Done → progress bar updates
  - Close sprint → incomplete tickets appear in Backlog → sprint `is_active` = false

- [ ] **Step 2: Epic management**
  - Navigate to Epics page → create epic → appears with 0/0 progress bar
  - Open a ticket detail → link it to the epic via EpicSelector → epic card updates ticket count

- [ ] **Step 3: Sprint + Epic independence**
  - Open a ticket → set both an epic AND a sprint → both selectors show the correct values
  - Confirm the ticket appears in the sprint board AND in the epic's ticket list

- [ ] **Step 4: Final commit**

```bash
git commit -m "feat(phase-3): complete sprint lifecycle and epic management"
```
