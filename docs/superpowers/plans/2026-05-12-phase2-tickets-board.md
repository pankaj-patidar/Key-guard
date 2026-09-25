# Phase 2: Tickets Core + Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete ticket system — create/edit/delete tickets, Kanban board with drag-and-drop, list view, ticket detail drawer, Parking Lot page, and Backlog page.

**Architecture:** `backend/app/domains/tickets/` owns all ticket models and API. The board endpoint returns all columns in one call to minimise round-trips. Frontend uses `@dnd-kit` for drag-and-drop with optimistic updates via `boardStore` (Zustand).

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, Pydantic v2, React 18, TanStack Query v5, Zustand, @dnd-kit/core + @dnd-kit/sortable, Framer Motion, TailwindCSS.

**Prerequisite:** Phase 1 complete (RBAC engine available).

---

## File Map

**Create:**
- `backend/app/domains/tickets/__init__.py`
- `backend/app/domains/tickets/models.py`
- `backend/app/domains/tickets/schemas.py`
- `backend/app/domains/tickets/service.py`
- `backend/app/domains/tickets/router.py`
- `backend/app/domains/tickets/filters.py`
- `backend/alembic/versions/0003_tickets.py`
- `backend/tests/domains/tickets/__init__.py`
- `backend/tests/domains/tickets/test_tickets_api.py`
- `frontend/src/store/boardStore.ts`
- `frontend/src/hooks/useTickets.ts`
- `frontend/src/hooks/useBoard.ts`
- `frontend/src/components/tickets/TicketTypeIcon.tsx`
- `frontend/src/components/tickets/TicketStatusBadge.tsx`
- `frontend/src/components/tickets/TicketPriorityBadge.tsx`
- `frontend/src/components/tickets/TicketCard.tsx`
- `frontend/src/components/tickets/TicketRow.tsx`
- `frontend/src/components/tickets/TicketForm.tsx`
- `frontend/src/components/tickets/TicketDetailDrawer.tsx`
- `frontend/src/components/board/KanbanColumn.tsx`
- `frontend/src/components/board/KanbanBoard.tsx`
- `frontend/src/pages/ProjectManagement/BoardPage.tsx`
- `frontend/src/pages/ProjectManagement/ListPage.tsx`
- `frontend/src/pages/ProjectManagement/BacklogPage.tsx`
- `frontend/src/pages/ProjectManagement/ParkingLotPage.tsx`

**Modify:**
- `backend/app/main.py` — register tickets router
- `backend/alembic/env.py` — import ticket models
- `frontend/src/App.tsx` — add PM routes
- `frontend/src/layouts/Sidebar.tsx` — PM nav links
- `frontend/package.json` — add @dnd-kit packages

---

## Task 1: Install Frontend Dependencies

- [ ] **Step 1: Install dnd-kit**

```bash
cd frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: packages added to `node_modules` and `package.json`.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add @dnd-kit drag-and-drop dependencies"
```

---

## Task 2: Ticket Models

**Files:**
- Create: `backend/app/domains/tickets/models.py`

- [ ] **Step 1: Write import test**

```python
# backend/tests/domains/tickets/test_tickets_api.py
def test_models_importable():
    from app.domains.tickets.models import Ticket, TicketType, TicketStatus, TicketPriority
    assert Ticket.__tablename__ == "tickets"
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend && python -m pytest tests/domains/tickets/test_tickets_api.py::test_models_importable -v
```

- [ ] **Step 3: Implement models**

```python
# backend/app/domains/tickets/models.py
import uuid
import enum
from datetime import datetime
from sqlalchemy import (Column, String, Text, Integer, SmallInteger, Boolean,
                        Date, Float, DateTime, ForeignKey, Enum as SAEnum, UniqueConstraint)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class TicketType(str, enum.Enum):
    EPIC   = "epic"
    SPRINT = "sprint"
    BUG    = "bug"
    TASK   = "task"
    TODO   = "todo"


class TicketStatus(str, enum.Enum):
    BACKLOG            = "backlog"
    TODO               = "todo"
    IN_PROGRESS        = "in_progress"
    IN_REVIEW          = "in_review"
    ON_HOLD            = "on_hold"
    WAITING_FOR_CLIENT = "waiting_for_client"
    DONE               = "done"
    CANCELLED          = "cancelled"


class TicketPriority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH     = "high"
    MEDIUM   = "medium"
    LOW      = "low"


# Statuses shown on the Kanban board (Parking Lot statuses are excluded)
BOARD_STATUSES = [
    TicketStatus.BACKLOG,
    TicketStatus.TODO,
    TicketStatus.IN_PROGRESS,
    TicketStatus.IN_REVIEW,
    TicketStatus.DONE,
]

# Statuses that go to Parking Lot
PARKING_LOT_STATUSES = [TicketStatus.ON_HOLD, TicketStatus.WAITING_FOR_CLIENT]


class Ticket(Base):
    __tablename__ = "tickets"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_number   = Column(Integer, nullable=False)
    project_id      = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title           = Column(String(500), nullable=False)
    type            = Column(SAEnum(TicketType), nullable=False)
    status          = Column(SAEnum(TicketStatus), nullable=False, default=TicketStatus.BACKLOG)
    priority        = Column(SAEnum(TicketPriority), nullable=False, default=TicketPriority.MEDIUM)
    description     = Column(JSONB, nullable=True)          # Tiptap ProseMirror JSON
    epic_id         = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True)
    sprint_id       = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True)
    assignee_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    owner_id        = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reporter_id     = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    story_points    = Column(SmallInteger, nullable=True)
    due_date        = Column(Date, nullable=True)
    position        = Column(Float, nullable=False, default=0.0)
    is_archived     = Column(Boolean, default=False, nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project         = relationship("Project")
    assignee        = relationship("User", foreign_keys=[assignee_id])
    owner           = relationship("User", foreign_keys=[owner_id])
    reporter        = relationship("User", foreign_keys=[reporter_id])
    epic            = relationship("Ticket", foreign_keys=[epic_id], remote_side="Ticket.id",
                                   primaryjoin="Ticket.epic_id == Ticket.id")
    sprint_ticket   = relationship("Ticket", foreign_keys=[sprint_id], remote_side="Ticket.id",
                                   primaryjoin="Ticket.sprint_id == Ticket.id")
    sprint_detail   = relationship("SprintDetail", back_populates="ticket",
                                   cascade="all, delete-orphan", uselist=False)
    labels          = relationship("Label", secondary="ticket_labels", back_populates="tickets")
    watchers        = relationship("TicketWatcher", back_populates="ticket", cascade="all, delete-orphan")


class SprintDetail(Base):
    __tablename__ = "sprint_details"

    ticket_id  = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), primary_key=True)
    start_date = Column(Date, nullable=True)
    end_date   = Column(Date, nullable=True)
    goal       = Column(Text, nullable=True)
    is_active  = Column(Boolean, default=False, nullable=False)

    ticket = relationship("Ticket", back_populates="sprint_detail")


class Label(Base):
    __tablename__ = "labels"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name       = Column(String(50), nullable=False)
    color      = Column(String(7), default="#6366f1")

    tickets = relationship("Ticket", secondary="ticket_labels", back_populates="labels")


ticket_labels_table = __import__("sqlalchemy", fromlist=["Table"]).Table(
    "ticket_labels", Base.metadata,
    Column("ticket_id", UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), primary_key=True),
    Column("label_id",  UUID(as_uuid=True), ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True),
)


class ProjectTicketCounter(Base):
    __tablename__ = "project_ticket_counter"

    project_id  = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    last_number = Column(Integer, default=0, nullable=False)


class TicketWatcher(Base):
    __tablename__ = "ticket_watchers"
    __table_args__ = (UniqueConstraint("ticket_id", "user_id", name="uq_ticket_watcher"),)

    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), primary_key=True)
    user_id   = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    ticket = relationship("Ticket", back_populates="watchers")
    user   = relationship("User")
```

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/domains/tickets/test_tickets_api.py::test_models_importable -v
```

Expected: `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add app/domains/tickets/ tests/domains/tickets/
git commit -m "feat: add ticket domain models (Ticket, SprintDetail, Label, TicketWatcher)"
```

---

## Task 3: Ticket Migration

**Files:**
- Modify: `backend/alembic/env.py`
- Create: `backend/alembic/versions/0003_tickets.py`

- [ ] **Step 1: Register models in env.py**

```python
# Add to alembic/env.py:
from app.domains.tickets import models as ticket_models  # noqa: F401
```

- [ ] **Step 2: Generate and apply migration**

```bash
cd backend
alembic revision --autogenerate -m "tickets"
alembic upgrade head
```

Expected: 7 new tables: `tickets`, `sprint_details`, `labels`, `ticket_labels`, `project_ticket_counter`, `ticket_watchers`.

- [ ] **Step 3: Commit**

```bash
git add alembic/
git commit -m "feat: add ticket tables migration (0003)"
```

---

## Task 4: Ticket Schemas

**Files:**
- Create: `backend/app/domains/tickets/schemas.py`

- [ ] **Step 1: Implement schemas**

```python
# backend/app/domains/tickets/schemas.py
from uuid import UUID
from datetime import datetime, date
from typing import Any
from pydantic import BaseModel, Field
from app.domains.tickets.models import TicketType, TicketStatus, TicketPriority


class UserMini(BaseModel):
    id: UUID
    full_name: str
    avatar_url: str | None = None
    model_config = {"from_attributes": True}


class LabelOut(BaseModel):
    id: UUID
    name: str
    color: str
    model_config = {"from_attributes": True}


class SprintDetailOut(BaseModel):
    start_date: date | None
    end_date: date | None
    goal: str | None
    is_active: bool
    model_config = {"from_attributes": True}


class TicketBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    type: TicketType
    status: TicketStatus = TicketStatus.BACKLOG
    priority: TicketPriority = TicketPriority.MEDIUM
    description: dict[str, Any] | None = None     # ProseMirror JSON
    epic_id: UUID | None = None
    sprint_id: UUID | None = None
    assignee_id: UUID | None = None
    owner_id: UUID | None = None
    story_points: int | None = Field(default=None, ge=0, le=100)
    due_date: date | None = None


class TicketCreate(TicketBase):
    # Sprint-specific fields (only used when type == sprint)
    sprint_start_date: date | None = None
    sprint_end_date: date | None = None
    sprint_goal: str | None = None
    label_ids: list[UUID] = Field(default_factory=list)


class TicketUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    status: TicketStatus | None = None
    priority: TicketPriority | None = None
    description: dict[str, Any] | None = None
    epic_id: UUID | None = None
    sprint_id: UUID | None = None
    assignee_id: UUID | None = None
    owner_id: UUID | None = None
    story_points: int | None = Field(default=None, ge=0, le=100)
    due_date: date | None = None
    position: float | None = None
    label_ids: list[UUID] | None = None


class TicketOut(BaseModel):
    id: UUID
    ticket_number: int
    project_id: UUID
    title: str
    type: TicketType
    status: TicketStatus
    priority: TicketPriority
    epic_id: UUID | None
    sprint_id: UUID | None
    assignee: UserMini | None
    owner: UserMini | None
    reporter: UserMini | None
    story_points: int | None
    due_date: date | None
    position: float
    is_archived: bool
    labels: list[LabelOut] = []
    sprint_detail: SprintDetailOut | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class TicketDetail(TicketOut):
    description: dict[str, Any] | None = None


class BoardColumn(BaseModel):
    status: TicketStatus
    tickets: list[TicketOut]


class BoardOut(BaseModel):
    columns: list[BoardColumn]


class LabelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")
```

- [ ] **Step 2: Commit**

```bash
git add app/domains/tickets/schemas.py
git commit -m "feat: add ticket Pydantic v2 schemas"
```

---

## Task 5: Ticket Service

**Files:**
- Create: `backend/app/domains/tickets/service.py`
- Create: `backend/app/domains/tickets/filters.py`

- [ ] **Step 1: Implement filters.py**

```python
# backend/app/domains/tickets/filters.py
from uuid import UUID
from sqlalchemy import select, and_
from app.domains.tickets.models import Ticket, TicketStatus, BOARD_STATUSES, PARKING_LOT_STATUSES


def board_query(project_id: UUID):
    """Returns tickets for the Kanban board (excludes parking lot statuses)."""
    return (
        select(Ticket)
        .where(
            Ticket.project_id == project_id,
            Ticket.status.in_(BOARD_STATUSES),
            Ticket.is_archived == False,
            Ticket.type.not_in(["epic", "sprint"]),
        )
        .order_by(Ticket.status, Ticket.position)
    )


def parking_lot_query(project_id: UUID):
    return (
        select(Ticket)
        .where(
            Ticket.project_id == project_id,
            Ticket.status.in_(PARKING_LOT_STATUSES),
            Ticket.is_archived == False,
        )
        .order_by(Ticket.updated_at.desc())
    )


def backlog_query(project_id: UUID):
    """Tickets not assigned to any sprint."""
    return (
        select(Ticket)
        .where(
            Ticket.project_id == project_id,
            Ticket.sprint_id.is_(None),
            Ticket.is_archived == False,
            Ticket.type.not_in(["epic", "sprint"]),
        )
        .order_by(Ticket.priority, Ticket.position)
    )
```

- [ ] **Step 2: Implement service.py**

```python
# backend/app/domains/tickets/service.py
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, text
from fastapi import HTTPException, status
from app.domains.tickets.models import (
    Ticket, TicketStatus, SprintDetail, Label, ProjectTicketCounter,
    TicketWatcher, BOARD_STATUSES, ticket_labels_table,
)
from app.domains.tickets.schemas import TicketCreate, TicketUpdate, BoardOut, BoardColumn
from app.domains.tickets import filters


async def _next_ticket_number(project_id: UUID, db: AsyncSession) -> int:
    """Atomically increments the project counter and returns the new number."""
    result = await db.execute(
        text("""
            INSERT INTO project_ticket_counter (project_id, last_number)
            VALUES (:pid, 1)
            ON CONFLICT (project_id) DO UPDATE
                SET last_number = project_ticket_counter.last_number + 1
            RETURNING last_number
        """),
        {"pid": str(project_id)},
    )
    return result.scalar_one()


async def _compute_position(
    project_id: UUID, status: TicketStatus, before_id: UUID | None, db: AsyncSession
) -> float:
    """Returns a fractional position value for inserting a card in a column."""
    stmt = (
        select(Ticket.position)
        .where(Ticket.project_id == project_id, Ticket.status == status)
        .order_by(Ticket.position.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    last = result.scalar_one_or_none()
    return (last or 0.0) + 1.0


async def get_ticket(ticket_id: UUID, db: AsyncSession) -> Ticket:
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


async def get_ticket_by_number(project_id: UUID, number: int, db: AsyncSession) -> Ticket:
    result = await db.execute(
        select(Ticket).where(Ticket.project_id == project_id, Ticket.ticket_number == number)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


async def list_tickets(project_id: UUID, db: AsyncSession, **filter_kwargs) -> list[Ticket]:
    stmt = select(Ticket).where(
        Ticket.project_id == project_id,
        Ticket.is_archived == False,
    ).order_by(Ticket.status, Ticket.position)

    if assignee_id := filter_kwargs.get("assignee_id"):
        stmt = stmt.where(Ticket.assignee_id == assignee_id)
    if type_ := filter_kwargs.get("type"):
        stmt = stmt.where(Ticket.type == type_)
    if sprint_id := filter_kwargs.get("sprint_id"):
        stmt = stmt.where(Ticket.sprint_id == sprint_id)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_ticket(
    project_id: UUID, data: TicketCreate, reporter_id: UUID, db: AsyncSession
) -> Ticket:
    ticket_number = await _next_ticket_number(project_id, db)
    position = await _compute_position(project_id, data.status, None, db)

    ticket = Ticket(
        ticket_number=ticket_number,
        project_id=project_id,
        reporter_id=reporter_id,
        position=position,
        **data.model_dump(exclude={"sprint_start_date", "sprint_end_date", "sprint_goal", "label_ids"}),
    )
    db.add(ticket)
    await db.flush()

    # Sprint detail
    if data.type.value == "sprint":
        detail = SprintDetail(
            ticket_id=ticket.id,
            start_date=data.sprint_start_date,
            end_date=data.sprint_end_date,
            goal=data.sprint_goal,
        )
        db.add(detail)

    # Labels
    if data.label_ids:
        for label_id in data.label_ids:
            await db.execute(
                ticket_labels_table.insert().values(ticket_id=ticket.id, label_id=label_id)
            )

    # Auto-watch: reporter and assignee become watchers
    watcher_ids = {reporter_id}
    if data.assignee_id:
        watcher_ids.add(data.assignee_id)
    for uid in watcher_ids:
        db.add(TicketWatcher(ticket_id=ticket.id, user_id=uid))

    await db.commit()
    await db.refresh(ticket)
    return ticket


async def update_ticket(ticket_id: UUID, data: TicketUpdate, actor_id: UUID, db: AsyncSession) -> Ticket:
    ticket = await get_ticket(ticket_id, db)
    old_status = ticket.status

    update_data = data.model_dump(exclude_unset=True, exclude={"label_ids"})
    for field, value in update_data.items():
        setattr(ticket, field, value)

    if data.label_ids is not None:
        await db.execute(ticket_labels_table.delete().where(ticket_labels_table.c.ticket_id == ticket_id))
        for label_id in data.label_ids:
            await db.execute(ticket_labels_table.insert().values(ticket_id=ticket_id, label_id=label_id))

    await db.commit()
    await db.refresh(ticket)
    return ticket


async def delete_ticket(ticket_id: UUID, db: AsyncSession) -> None:
    ticket = await get_ticket(ticket_id, db)
    await db.delete(ticket)
    await db.commit()


async def get_board(project_id: UUID, db: AsyncSession) -> BoardOut:
    stmt = filters.board_query(project_id)
    result = await db.execute(stmt)
    tickets = result.scalars().all()

    columns = []
    for s in BOARD_STATUSES:
        columns.append(BoardColumn(
            status=s,
            tickets=[t for t in tickets if t.status == s],
        ))
    return BoardOut(columns=columns)


async def get_parking_lot(project_id: UUID, db: AsyncSession) -> list[Ticket]:
    result = await db.execute(filters.parking_lot_query(project_id))
    return list(result.scalars().all())


async def get_backlog(project_id: UUID, db: AsyncSession) -> list[Ticket]:
    result = await db.execute(filters.backlog_query(project_id))
    return list(result.scalars().all())


async def list_labels(project_id: UUID, db: AsyncSession) -> list[Label]:
    result = await db.execute(select(Label).where(Label.project_id == project_id))
    return list(result.scalars().all())


async def create_label(project_id: UUID, name: str, color: str, db: AsyncSession) -> Label:
    label = Label(project_id=project_id, name=name, color=color)
    db.add(label)
    await db.commit()
    await db.refresh(label)
    return label
```

- [ ] **Step 3: Write service tests**

```python
# backend/tests/domains/tickets/test_tickets_api.py  (add to file)
import pytest
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.tickets.service import create_ticket, get_board
from app.domains.tickets.schemas import TicketCreate
from app.domains.tickets.models import TicketType, TicketStatus, TicketPriority

@pytest.mark.asyncio
async def test_create_ticket_assigns_sequential_number(db: AsyncSession, project, reporter):
    data = TicketCreate(title="First ticket", type=TicketType.TASK)
    t1 = await create_ticket(project.id, data, reporter.id, db)
    t2 = await create_ticket(project.id, TicketCreate(title="Second", type=TicketType.BUG), reporter.id, db)
    assert t1.ticket_number == 1
    assert t2.ticket_number == 2

@pytest.mark.asyncio
async def test_board_excludes_parking_lot_tickets(db: AsyncSession, project, reporter):
    on_hold_data = TicketCreate(title="Blocked", type=TicketType.TASK, status=TicketStatus.ON_HOLD)
    await create_ticket(project.id, on_hold_data, reporter.id, db)
    board = await get_board(project.id, db)
    all_tickets = [t for col in board.columns for t in col.tickets]
    assert all(t.status != TicketStatus.ON_HOLD for t in all_tickets)
```

Add fixtures to conftest.py:

```python
# Add to backend/tests/conftest.py
from app.models.project import Project

@pytest_asyncio.fixture
async def project(db: AsyncSession, admin_user) -> Project:
    from app.models.project import Project
    p = Project(name="Test Project", slug="test-project", owner_id=admin_user.id)
    db.add(p)
    await db.flush()
    return p

@pytest.fixture
def reporter(admin_user):
    return admin_user
```

- [ ] **Step 4: Run tests**

```bash
python -m pytest tests/domains/tickets/ -v
```

Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add app/domains/tickets/service.py app/domains/tickets/filters.py tests/domains/tickets/
git commit -m "feat: add ticket service with sequential numbering, board, parking lot"
```

---

## Task 6: Ticket Router

**Files:**
- Create: `backend/app/domains/tickets/router.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Implement router**

```python
# backend/app/domains/tickets/router.py
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.security.dependencies import get_current_user
from app.domains.tickets import service
from app.domains.tickets.schemas import (
    TicketCreate, TicketUpdate, TicketOut, TicketDetail, BoardOut, LabelCreate, LabelOut,
)
from app.domains.roles.rbac import require_permission

router = APIRouter(prefix="/api/v1/projects/{project_id}", tags=["tickets"])


@router.get("/board", response_model=BoardOut)
async def get_board(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_board(project_id, db)


@router.get("/parking-lot", response_model=list[TicketOut])
async def get_parking_lot(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_parking_lot(project_id, db)


@router.get("/backlog", response_model=list[TicketOut])
async def get_backlog(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_backlog(project_id, db)


@router.get("/tickets", response_model=list[TicketOut])
async def list_tickets(
    project_id: UUID,
    assignee_id: UUID | None = Query(default=None),
    type: str | None = Query(default=None),
    sprint_id: UUID | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_tickets(project_id, db, assignee_id=assignee_id, type=type, sprint_id=sprint_id)


@router.get("/tickets/{ticket_number}", response_model=TicketDetail)
async def get_ticket(
    project_id: UUID,
    ticket_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_ticket_by_number(project_id, ticket_number, db)


@router.post("/tickets", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    project_id: UUID,
    data: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Permission depends on ticket type
    if data.type.value in ("epic",):
        await require_permission("ticket:create_epic", current_user, db, project_id=project_id)
    elif data.type.value in ("sprint",):
        await require_permission("ticket:create_sprint", current_user, db, project_id=project_id)
    else:
        await require_permission("ticket:create_sub", current_user, db, project_id=project_id)

    return await service.create_ticket(project_id, data, current_user.id, db)


@router.patch("/tickets/{ticket_number}", response_model=TicketOut)
async def update_ticket(
    project_id: UUID,
    ticket_number: int,
    data: TicketUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("ticket:edit_own", current_user, db, project_id=project_id)
    ticket = await service.get_ticket_by_number(project_id, ticket_number, db)
    return await service.update_ticket(ticket.id, data, current_user.id, db)


@router.delete("/tickets/{ticket_number}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ticket(
    project_id: UUID,
    ticket_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("ticket:delete", current_user, db, project_id=project_id)
    ticket = await service.get_ticket_by_number(project_id, ticket_number, db)
    await service.delete_ticket(ticket.id, db)


@router.get("/labels", response_model=list[LabelOut])
async def list_labels(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_labels(project_id, db)


@router.post("/labels", response_model=LabelOut, status_code=status.HTTP_201_CREATED)
async def create_label(
    project_id: UUID,
    data: LabelCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_label(project_id, data.name, data.color, db)
```

- [ ] **Step 2: Register in main.py**

```python
from app.domains.tickets.router import router as tickets_router
app.include_router(tickets_router)
```

- [ ] **Step 3: Run full API test**

```bash
python -m pytest tests/domains/tickets/ -v
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/domains/tickets/router.py app/main.py
git commit -m "feat: add ticket REST API with RBAC guards"
```

---

## Task 7: Frontend State — boardStore & Hooks

**Files:**
- Create: `frontend/src/store/boardStore.ts`
- Create: `frontend/src/hooks/useTickets.ts`
- Create: `frontend/src/hooks/useBoard.ts`

- [ ] **Step 1: boardStore.ts**

```typescript
// frontend/src/store/boardStore.ts
import { create } from 'zustand'
import { Ticket, BoardColumn } from '../hooks/useBoard'

interface BoardState {
  columns: BoardColumn[]
  setColumns: (columns: BoardColumn[]) => void
  moveTicket: (ticketId: string, fromStatus: string, toStatus: string, newPosition: number) => void
}

export const useBoardStore = create<BoardState>((set) => ({
  columns: [],
  setColumns: (columns) => set({ columns }),
  moveTicket: (ticketId, fromStatus, toStatus, newPosition) =>
    set((state) => {
      const columns = state.columns.map(col => ({ ...col, tickets: [...col.tickets] }))
      let moved: Ticket | undefined
      const fromCol = columns.find(c => c.status === fromStatus)
      if (fromCol) {
        const idx = fromCol.tickets.findIndex(t => t.id === ticketId)
        if (idx !== -1) {
          moved = { ...fromCol.tickets[idx], status: toStatus, position: newPosition }
          fromCol.tickets.splice(idx, 1)
        }
      }
      if (moved) {
        const toCol = columns.find(c => c.status === toStatus)
        if (toCol) {
          // Insert at correct position
          const insertAt = toCol.tickets.findIndex(t => t.position > newPosition)
          if (insertAt === -1) toCol.tickets.push(moved)
          else toCol.tickets.splice(insertAt, 0, moved)
        }
      }
      return { columns }
    }),
}))
```

- [ ] **Step 2: useTickets.ts**

```typescript
// frontend/src/hooks/useTickets.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export interface Ticket {
  id: string
  ticket_number: number
  project_id: string
  title: string
  type: 'epic' | 'sprint' | 'bug' | 'task' | 'todo'
  status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'on_hold' | 'waiting_for_client' | 'done' | 'cancelled'
  priority: 'critical' | 'high' | 'medium' | 'low'
  description: Record<string, unknown> | null
  epic_id: string | null
  sprint_id: string | null
  assignee: { id: string; full_name: string; avatar_url: string | null } | null
  owner: { id: string; full_name: string; avatar_url: string | null } | null
  reporter: { id: string; full_name: string; avatar_url: string | null } | null
  story_points: number | null
  due_date: string | null
  position: number
  is_archived: boolean
  labels: { id: string; name: string; color: string }[]
  sprint_detail: { start_date: string; end_date: string; goal: string; is_active: boolean } | null
  created_at: string
  updated_at: string
}

const key = (projectId: string) => ['projects', projectId, 'tickets']

export function useTickets(projectId: string, params?: Record<string, string>) {
  return useQuery({
    queryKey: [...key(projectId), params],
    queryFn: () => api.get<Ticket[]>(`/api/v1/projects/${projectId}/tickets`, { params }).then(r => r.data),
  })
}

export function useTicket(projectId: string, ticketNumber: number) {
  return useQuery({
    queryKey: [...key(projectId), ticketNumber],
    queryFn: () => api.get<Ticket>(`/api/v1/projects/${projectId}/tickets/${ticketNumber}`).then(r => r.data),
    enabled: !!ticketNumber,
  })
}

export function useCreateTicket(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Ticket> & { title: string; type: string }) =>
      api.post<Ticket>(`/api/v1/projects/${projectId}/tickets`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId) }),
  })
}

export function useUpdateTicket(projectId: string, ticketNumber: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Ticket>) =>
      api.patch<Ticket>(`/api/v1/projects/${projectId}/tickets/${ticketNumber}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(projectId) })
      qc.invalidateQueries({ queryKey: [...key(projectId), ticketNumber] })
    },
  })
}

export function useDeleteTicket(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ticketNumber: number) =>
      api.delete(`/api/v1/projects/${projectId}/tickets/${ticketNumber}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId) }),
  })
}
```

- [ ] **Step 3: useBoard.ts**

```typescript
// frontend/src/hooks/useBoard.ts
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import api from '../lib/api'
import { useBoardStore } from '../store/boardStore'
import { Ticket } from './useTickets'

export type { Ticket }

export interface BoardColumn {
  status: string
  tickets: Ticket[]
}

export interface BoardOut {
  columns: BoardColumn[]
}

export function useBoard(projectId: string) {
  const setColumns = useBoardStore(s => s.setColumns)

  const query = useQuery({
    queryKey: ['projects', projectId, 'board'],
    queryFn: () => api.get<BoardOut>(`/api/v1/projects/${projectId}/board`).then(r => r.data),
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (query.data) setColumns(query.data.columns)
  }, [query.data, setColumns])

  return query
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/store/boardStore.ts frontend/src/hooks/useTickets.ts frontend/src/hooks/useBoard.ts
git commit -m "feat: add boardStore, useTickets, useBoard hooks"
```

---

## Task 8: Ticket UI Components

**Files:**
- Create: `frontend/src/components/tickets/TicketTypeIcon.tsx`
- Create: `frontend/src/components/tickets/TicketStatusBadge.tsx`
- Create: `frontend/src/components/tickets/TicketPriorityBadge.tsx`
- Create: `frontend/src/components/tickets/TicketCard.tsx`

- [ ] **Step 1: TicketTypeIcon**

```tsx
// frontend/src/components/tickets/TicketTypeIcon.tsx
import React from 'react'
import { Zap, Calendar, Bug, CheckSquare, Circle } from 'lucide-react'

const CONFIG = {
  epic:   { icon: Zap,         color: 'text-purple-400', bg: 'bg-purple-400/10' },
  sprint: { icon: Calendar,    color: 'text-blue-400',   bg: 'bg-blue-400/10'   },
  bug:    { icon: Bug,         color: 'text-red-400',    bg: 'bg-red-400/10'    },
  task:   { icon: CheckSquare, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  todo:   { icon: Circle,      color: 'text-green-400',  bg: 'bg-green-400/10'  },
} as const

interface Props {
  type: keyof typeof CONFIG
  size?: 'sm' | 'md'
}

export function TicketTypeIcon({ type, size = 'md' }: Props) {
  const { icon: Icon, color, bg } = CONFIG[type] ?? CONFIG.task
  const sz = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  const pad = size === 'sm' ? 'p-1' : 'p-1.5'
  return (
    <span className={`inline-flex items-center justify-center rounded ${bg} ${pad}`}>
      <Icon className={`${sz} ${color}`} />
    </span>
  )
}
```

- [ ] **Step 2: TicketStatusBadge**

```tsx
// frontend/src/components/tickets/TicketStatusBadge.tsx
import React from 'react'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  backlog:            { label: 'Backlog',            className: 'bg-zinc-700 text-zinc-300' },
  todo:               { label: 'Todo',               className: 'bg-slate-700 text-slate-200' },
  in_progress:        { label: 'In Progress',        className: 'bg-blue-500/20 text-blue-300' },
  in_review:          { label: 'In Review',          className: 'bg-purple-500/20 text-purple-300' },
  on_hold:            { label: 'On Hold',            className: 'bg-amber-500/20 text-amber-300' },
  waiting_for_client: { label: 'Waiting Client',     className: 'bg-orange-500/20 text-orange-300' },
  done:               { label: 'Done',               className: 'bg-green-500/20 text-green-300' },
  cancelled:          { label: 'Cancelled',          className: 'bg-zinc-600 text-zinc-400 line-through' },
}

export function TicketStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-zinc-700 text-zinc-300' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
```

- [ ] **Step 3: TicketPriorityBadge**

```tsx
// frontend/src/components/tickets/TicketPriorityBadge.tsx
import React from 'react'
import { AlertCircle, ArrowUp, Minus, ArrowDown } from 'lucide-react'

const PRIORITY_CONFIG = {
  critical: { icon: AlertCircle, color: 'text-red-400',    label: 'Critical' },
  high:     { icon: ArrowUp,     color: 'text-orange-400', label: 'High'     },
  medium:   { icon: Minus,       color: 'text-blue-400',   label: 'Medium'   },
  low:      { icon: ArrowDown,   color: 'text-zinc-400',   label: 'Low'      },
} as const

interface Props { priority: keyof typeof PRIORITY_CONFIG; showLabel?: boolean }

export function TicketPriorityBadge({ priority, showLabel = false }: Props) {
  const { icon: Icon, color, label } = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium
  return (
    <span className={`inline-flex items-center gap-1 ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {showLabel && <span className="text-xs">{label}</span>}
    </span>
  )
}
```

- [ ] **Step 4: TicketCard (Kanban card)**

```tsx
// frontend/src/components/tickets/TicketCard.tsx
import React from 'react'
import { MessageSquare, Paperclip } from 'lucide-react'
import { Ticket } from '../../hooks/useTickets'
import { TicketTypeIcon } from './TicketTypeIcon'
import { TicketPriorityBadge } from './TicketPriorityBadge'

const PRIORITY_STRIP: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-blue-500',
  low:      'bg-zinc-600',
}

interface Props {
  ticket: Ticket
  onClick: (ticket: Ticket) => void
}

export function TicketCard({ ticket, onClick }: Props) {
  return (
    <div
      onClick={() => onClick(ticket)}
      className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-3 cursor-pointer hover:border-zinc-600 hover:shadow-lg hover:shadow-black/20 transition-all group overflow-hidden"
    >
      {/* Priority strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${PRIORITY_STRIP[ticket.priority] ?? 'bg-zinc-600'}`} />

      <div className="pl-2">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2">
          <TicketTypeIcon type={ticket.type} size="sm" />
          <span className="text-xs text-zinc-500 font-mono">
            {ticket.project_id.slice(0, 8).toUpperCase()}-{ticket.ticket_number}
          </span>
          <div className="ml-auto">
            <TicketPriorityBadge priority={ticket.priority} />
          </div>
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-zinc-100 leading-snug line-clamp-2 mb-3 group-hover:text-white transition-colors">
          {ticket.title}
        </p>

        {/* Labels */}
        {ticket.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {ticket.labels.slice(0, 3).map(l => (
              <span
                key={l.id}
                className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${l.color}20`, color: l.color }}
              >
                {l.name}
              </span>
            ))}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-zinc-600 text-xs">
            {ticket.story_points != null && (
              <span className="bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-zinc-400">
                {ticket.story_points}
              </span>
            )}
          </div>

          {/* Assignee avatar */}
          {ticket.assignee && (
            <div
              className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
              title={ticket.assignee.full_name}
            >
              {ticket.assignee.full_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/tickets/
git commit -m "feat: add TicketCard, TicketTypeIcon, TicketStatusBadge, TicketPriorityBadge components"
```

---

## Task 9: Kanban Board Components

**Files:**
- Create: `frontend/src/components/board/KanbanColumn.tsx`
- Create: `frontend/src/components/board/KanbanBoard.tsx`

- [ ] **Step 1: KanbanColumn**

```tsx
// frontend/src/components/board/KanbanColumn.tsx
import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus } from 'lucide-react'
import { Ticket } from '../../hooks/useTickets'
import { TicketCard } from '../tickets/TicketCard'
import { TicketStatusBadge } from '../tickets/TicketStatusBadge'

const COLUMN_LABELS: Record<string, string> = {
  backlog: 'Backlog', todo: 'Todo', in_progress: 'In Progress',
  in_review: 'In Review', done: 'Done',
}

function SortableTicketCard({ ticket, onClick }: { ticket: Ticket; onClick: (t: Ticket) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticket.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TicketCard ticket={ticket} onClick={onClick} />
    </div>
  )
}

interface Props {
  status: string
  tickets: Ticket[]
  onTicketClick: (ticket: Ticket) => void
  onAddTicket: (status: string) => void
}

export function KanbanColumn({ status, tickets, onTicketClick, onAddTicket }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <TicketStatusBadge status={status} />
          <span className="text-xs text-zinc-500 font-medium">{tickets.length}</span>
        </div>
        <button
          onClick={() => onAddTicket(status)}
          className="p-1 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Drop area */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-24 rounded-xl p-2 transition-colors ${
          isOver ? 'bg-indigo-500/10 border border-indigo-500/30' : 'bg-zinc-950/50'
        }`}
      >
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tickets.map(ticket => (
              <SortableTicketCard key={ticket.id} ticket={ticket} onClick={onTicketClick} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: KanbanBoard**

```tsx
// frontend/src/components/board/KanbanBoard.tsx
import React, { useState } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, PointerSensor,
  useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { useBoardStore } from '../../store/boardStore'
import { KanbanColumn } from './KanbanColumn'
import { TicketCard } from '../tickets/TicketCard'
import { Ticket } from '../../hooks/useTickets'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const BOARD_STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done']

interface Props {
  projectId: string
  onTicketClick: (ticket: Ticket) => void
  onAddTicket: (status: string) => void
}

export function KanbanBoard({ projectId, onTicketClick, onAddTicket }: Props) {
  const columns = useBoardStore(s => s.columns)
  const moveTicket = useBoardStore(s => s.moveTicket)
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const findTicket = (id: string): Ticket | undefined => {
    for (const col of columns) {
      const t = col.tickets.find(t => t.id === id)
      if (t) return t
    }
  }

  const findStatus = (id: string): string | undefined => {
    for (const col of columns) {
      if (col.status === id) return col.status
      if (col.tickets.find(t => t.id === id)) return col.status
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTicket(null)
    if (!over) return

    const ticket = findTicket(active.id as string)
    if (!ticket) return

    const fromStatus = findStatus(active.id as string)
    const toStatus = findStatus(over.id as string) ?? (over.id as string)
    if (!fromStatus || !toStatus) return

    const toCol = columns.find(c => c.status === toStatus)
    if (!toCol) return

    // Compute new position via fractional indexing
    const overTicket = toCol.tickets.find(t => t.id === over.id)
    const overIdx = overTicket ? toCol.tickets.indexOf(overTicket) : toCol.tickets.length
    const prev = toCol.tickets[overIdx - 1]?.position ?? 0
    const next = toCol.tickets[overIdx]?.position ?? (prev + 2)
    const newPosition = (prev + next) / 2

    // Optimistic update
    moveTicket(ticket.id, fromStatus, toStatus, newPosition)

    try {
      await api.patch(
        `/api/v1/projects/${projectId}/tickets/${ticket.ticket_number}`,
        { status: toStatus, position: newPosition }
      )
    } catch {
      // Revert not implemented for MVP — just show error and refetch will correct
      toast.error('Failed to move ticket. Refreshing board…')
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}
      onDragStart={e => setActiveTicket(findTicket(e.active.id as string) ?? null)}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-0">
        {BOARD_STATUSES.map(status => {
          const col = columns.find(c => c.status === status)
          return (
            <KanbanColumn
              key={status}
              status={status}
              tickets={col?.tickets ?? []}
              onTicketClick={onTicketClick}
              onAddTicket={onAddTicket}
            />
          )
        })}
      </div>

      <DragOverlay>
        {activeTicket && <TicketCard ticket={activeTicket} onClick={() => {}} />}
      </DragOverlay>
    </DndContext>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/board/
git commit -m "feat: add KanbanBoard and KanbanColumn with dnd-kit drag-and-drop"
```

---

## Task 10: Ticket Form & Detail Drawer

**Files:**
- Create: `frontend/src/components/tickets/TicketForm.tsx`
- Create: `frontend/src/components/tickets/TicketDetailDrawer.tsx`

- [ ] **Step 1: TicketForm**

```tsx
// frontend/src/components/tickets/TicketForm.tsx
import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateTicket } from '../../hooks/useTickets'
import toast from 'react-hot-toast'

const TICKET_TYPES = ['bug', 'task', 'todo', 'epic', 'sprint'] as const
const PRIORITIES   = ['critical', 'high', 'medium', 'low'] as const
const STATUSES     = ['backlog', 'todo', 'in_progress', 'in_review', 'done'] as const

interface Props {
  projectId: string
  defaultStatus?: string
  onClose: () => void
}

export function TicketForm({ projectId, defaultStatus = 'backlog', onClose }: Props) {
  const [title, setTitle]       = useState('')
  const [type, setType]         = useState<string>('task')
  const [priority, setPriority] = useState<string>('medium')
  const [status, setStatus]     = useState(defaultStatus)

  const create = useCreateTicket(projectId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    try {
      await create.mutateAsync({ title: title.trim(), type, priority, status })
      toast.success('Ticket created')
      onClose()
    } catch {
      toast.error('Failed to create ticket')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="font-semibold text-white">New Ticket</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ticket title…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                {TICKET_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!title.trim() || create.isPending}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {create.isPending ? 'Creating…' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TicketDetailDrawer (shell — full detail added in Phase 4)**

```tsx
// frontend/src/components/tickets/TicketDetailDrawer.tsx
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTicket, useUpdateTicket } from '../../hooks/useTickets'
import { TicketTypeIcon } from './TicketTypeIcon'
import { TicketStatusBadge } from './TicketStatusBadge'
import { TicketPriorityBadge } from './TicketPriorityBadge'

interface Props {
  projectId: string
  ticketNumber: number | null
  onClose: () => void
}

export function TicketDetailDrawer({ projectId, ticketNumber, onClose }: Props) {
  const { data: ticket } = useTicket(projectId, ticketNumber ?? 0)

  return (
    <AnimatePresence>
      {ticketNumber != null && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col overflow-hidden"
          >
            {ticket ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-zinc-800 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <TicketTypeIcon type={ticket.type} />
                    <span className="text-sm font-mono text-zinc-400">
                      {projectId.slice(0,8).toUpperCase()}-{ticket.ticket_number}
                    </span>
                    <TicketStatusBadge status={ticket.status} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <h1 className="text-xl font-bold text-white">{ticket.title}</h1>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-500 mb-1 text-xs">Priority</p>
                      <TicketPriorityBadge priority={ticket.priority} showLabel />
                    </div>
                    <div>
                      <p className="text-zinc-500 mb-1 text-xs">Assignee</p>
                      <p className="text-zinc-200">{ticket.assignee?.full_name ?? 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 mb-1 text-xs">Reporter</p>
                      <p className="text-zinc-200">{ticket.reporter?.full_name}</p>
                    </div>
                    {ticket.story_points != null && (
                      <div>
                        <p className="text-zinc-500 mb-1 text-xs">Story Points</p>
                        <p className="text-zinc-200 font-mono">{ticket.story_points}</p>
                      </div>
                    )}
                  </div>

                  {/* Description placeholder — Tiptap editor added in Phase 4 */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 min-h-32 text-zinc-500 text-sm">
                    {ticket.description ? 'Description (rich text renderer added in Phase 4)' : 'No description yet.'}
                  </div>

                  {/* Comments placeholder — added in Phase 4 */}
                  <div className="text-zinc-600 text-sm text-center py-8 border border-dashed border-zinc-800 rounded-xl">
                    Comments & activity coming in Phase 4
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/tickets/TicketForm.tsx frontend/src/components/tickets/TicketDetailDrawer.tsx
git commit -m "feat: add TicketForm modal and TicketDetailDrawer shell"
```

---

## Task 11: Board, List, Backlog & Parking Lot Pages

**Files:**
- Create: `frontend/src/pages/ProjectManagement/BoardPage.tsx`
- Create: `frontend/src/pages/ProjectManagement/ListPage.tsx`
- Create: `frontend/src/pages/ProjectManagement/BacklogPage.tsx`
- Create: `frontend/src/pages/ProjectManagement/ParkingLotPage.tsx`

- [ ] **Step 1: BoardPage**

```tsx
// frontend/src/pages/ProjectManagement/BoardPage.tsx
import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { LayoutGrid, List } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBoard } from '../../hooks/useBoard'
import { KanbanBoard } from '../../components/board/KanbanBoard'
import { TicketForm } from '../../components/tickets/TicketForm'
import { TicketDetailDrawer } from '../../components/tickets/TicketDetailDrawer'
import { Ticket } from '../../hooks/useTickets'

export function BoardPage() {
  const { slug } = useParams<{ slug: string }>()
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null)
  const [addingToStatus, setAddingToStatus] = useState<string | null>(null)
  const { isLoading } = useBoard(slug!)  // populates boardStore as side-effect

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 rounded-md text-white text-sm font-medium">
            <LayoutGrid className="w-4 h-4" /> Board
          </button>
          <Link to={`/projects/${slug}/list`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-400 hover:text-white rounded-md text-sm transition-colors">
            <List className="w-4 h-4" /> List
          </Link>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <KanbanBoard
          projectId={slug!}
          onTicketClick={(t: Ticket) => setSelectedTicket(t.ticket_number)}
          onAddTicket={(status) => setAddingToStatus(status)}
        />
      </div>

      {addingToStatus && (
        <TicketForm
          projectId={slug!}
          defaultStatus={addingToStatus}
          onClose={() => setAddingToStatus(null)}
        />
      )}

      <TicketDetailDrawer
        projectId={slug!}
        ticketNumber={selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: ListPage**

```tsx
// frontend/src/pages/ProjectManagement/ListPage.tsx
import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { LayoutGrid, List, Plus } from 'lucide-react'
import { useTickets } from '../../hooks/useTickets'
import { TicketTypeIcon } from '../../components/tickets/TicketTypeIcon'
import { TicketStatusBadge } from '../../components/tickets/TicketStatusBadge'
import { TicketPriorityBadge } from '../../components/tickets/TicketPriorityBadge'
import { TicketDetailDrawer } from '../../components/tickets/TicketDetailDrawer'
import { TicketForm } from '../../components/tickets/TicketForm'

export function ListPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: tickets = [], isLoading } = useTickets(slug!)
  const [selected, setSelected] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <Link to={`/projects/${slug}/board`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-400 hover:text-white rounded-md text-sm transition-colors">
            <LayoutGrid className="w-4 h-4" /> Board
          </Link>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 rounded-md text-white text-sm font-medium">
            <List className="w-4 h-4" /> List
          </button>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Ticket
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-800">
            <tr>
              <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 w-24">ID</th>
              <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3">Title</th>
              <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 w-36">Status</th>
              <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 w-24">Priority</th>
              <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 w-36">Assignee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {tickets.map(ticket => (
              <tr key={ticket.id} onClick={() => setSelected(ticket.ticket_number)}
                className="hover:bg-zinc-900/50 cursor-pointer transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <TicketTypeIcon type={ticket.type} size="sm" />
                    <span className="text-xs font-mono text-zinc-500">{slug?.toUpperCase()}-{ticket.ticket_number}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-zinc-200 font-medium">{ticket.title}</span>
                </td>
                <td className="px-4 py-3"><TicketStatusBadge status={ticket.status} /></td>
                <td className="px-4 py-3"><TicketPriorityBadge priority={ticket.priority} showLabel /></td>
                <td className="px-4 py-3 text-sm text-zinc-400">{ticket.assignee?.full_name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && tickets.length === 0 && (
          <div className="text-center py-20 text-zinc-600 text-sm">No tickets yet</div>
        )}
      </div>

      {showForm && <TicketForm projectId={slug!} onClose={() => setShowForm(false)} />}
      <TicketDetailDrawer projectId={slug!} ticketNumber={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
```

- [ ] **Step 3: ParkingLotPage**

```tsx
// frontend/src/pages/ProjectManagement/ParkingLotPage.tsx
import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ParkingCircle } from 'lucide-react'
import api from '../../lib/api'
import { Ticket } from '../../hooks/useTickets'
import { TicketTypeIcon } from '../../components/tickets/TicketTypeIcon'
import { TicketStatusBadge } from '../../components/tickets/TicketStatusBadge'
import { TicketDetailDrawer } from '../../components/tickets/TicketDetailDrawer'

export function ParkingLotPage() {
  const { slug } = useParams<{ slug: string }>()
  const [selected, setSelected] = useState<number | null>(null)

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['projects', slug, 'parking-lot'],
    queryFn: () => api.get<Ticket[]>(`/api/v1/projects/${slug}/parking-lot`).then(r => r.data),
  })

  const onHold = tickets.filter(t => t.status === 'on_hold')
  const waiting = tickets.filter(t => t.status === 'waiting_for_client')

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <ParkingCircle className="w-6 h-6 text-amber-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Parking Lot</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Blocked tickets and items waiting for client input</p>
        </div>
      </div>

      {[{ label: 'On Hold', items: onHold, color: 'text-amber-400' },
        { label: 'Waiting for Client', items: waiting, color: 'text-orange-400' }]
        .map(({ label, items, color }) => (
          <section key={label} className="mb-8">
            <h2 className={`text-sm font-semibold ${color} mb-3 flex items-center gap-2`}>
              {label}
              <span className="text-zinc-500 font-normal">({items.length})</span>
            </h2>
            {items.length === 0 ? (
              <p className="text-zinc-600 text-sm py-4 text-center border border-dashed border-zinc-800 rounded-xl">None</p>
            ) : (
              <div className="space-y-2">
                {items.map(t => (
                  <div key={t.id} onClick={() => setSelected(t.ticket_number)}
                    className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-600 cursor-pointer transition-all">
                    <TicketTypeIcon type={t.type} />
                    <span className="text-xs font-mono text-zinc-500">{slug?.toUpperCase()}-{t.ticket_number}</span>
                    <span className="flex-1 text-sm font-medium text-zinc-200">{t.title}</span>
                    <TicketStatusBadge status={t.status} />
                    <span className="text-xs text-zinc-500">{t.assignee?.full_name ?? 'Unassigned'}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

      <TicketDetailDrawer projectId={slug!} ticketNumber={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
```

- [ ] **Step 4: BacklogPage**

```tsx
// frontend/src/pages/ProjectManagement/BacklogPage.tsx
import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Layers, Plus } from 'lucide-react'
import api from '../../lib/api'
import { Ticket } from '../../hooks/useTickets'
import { TicketTypeIcon } from '../../components/tickets/TicketTypeIcon'
import { TicketPriorityBadge } from '../../components/tickets/TicketPriorityBadge'
import { TicketDetailDrawer } from '../../components/tickets/TicketDetailDrawer'
import { TicketForm } from '../../components/tickets/TicketForm'

export function BacklogPage() {
  const { slug } = useParams<{ slug: string }>()
  const [selected, setSelected] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data: tickets = [] } = useQuery({
    queryKey: ['projects', slug, 'backlog'],
    queryFn: () => api.get<Ticket[]>(`/api/v1/projects/${slug}/backlog`).then(r => r.data),
  })

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Backlog</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Tickets not assigned to any sprint</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add to Backlog
        </button>
      </div>

      <div className="space-y-2">
        {tickets.map(t => (
          <div key={t.id} onClick={() => setSelected(t.ticket_number)}
            className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-600 cursor-pointer transition-all">
            <TicketTypeIcon type={t.type} />
            <span className="text-xs font-mono text-zinc-500">{slug?.toUpperCase()}-{t.ticket_number}</span>
            <span className="flex-1 text-sm font-medium text-zinc-200">{t.title}</span>
            <TicketPriorityBadge priority={t.priority} showLabel />
            {t.story_points != null && (
              <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">{t.story_points}</span>
            )}
            <span className="text-xs text-zinc-500">{t.assignee?.full_name ?? 'Unassigned'}</span>
          </div>
        ))}
        {tickets.length === 0 && (
          <div className="text-center py-20 text-zinc-600 text-sm border border-dashed border-zinc-800 rounded-xl">
            Backlog is empty
          </div>
        )}
      </div>

      {showForm && <TicketForm projectId={slug!} defaultStatus="backlog" onClose={() => setShowForm(false)} />}
      <TicketDetailDrawer projectId={slug!} ticketNumber={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
```

- [ ] **Step 5: Add routes and sidebar nav**

Open `frontend/src/App.tsx` and add inside project routes:

```tsx
import { BoardPage }      from './pages/ProjectManagement/BoardPage'
import { ListPage }       from './pages/ProjectManagement/ListPage'
import { BacklogPage }    from './pages/ProjectManagement/BacklogPage'
import { ParkingLotPage } from './pages/ProjectManagement/ParkingLotPage'

// Add:
<Route path="/projects/:slug/board"       element={<BoardPage />} />
<Route path="/projects/:slug/list"        element={<ListPage />} />
<Route path="/projects/:slug/backlog"     element={<BacklogPage />} />
<Route path="/projects/:slug/parking-lot" element={<ParkingLotPage />} />
```

In `Sidebar.tsx`, add PM nav links for the active project (read current project slug from the URL):

```tsx
import { LayoutGrid, List, Layers, ParkingCircle } from 'lucide-react'
// Inside the sidebar, when a project is selected:
<NavLink to={`/projects/${slug}/board`}       icon={<LayoutGrid />}     label="Board" />
<NavLink to={`/projects/${slug}/list`}         icon={<List />}           label="List" />
<NavLink to={`/projects/${slug}/backlog`}      icon={<Layers />}         label="Backlog" />
<NavLink to={`/projects/${slug}/parking-lot`}  icon={<ParkingCircle />}  label="Parking Lot" />
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat: add BoardPage, ListPage, BacklogPage, ParkingLotPage with routing"
```

---

## Task 12: End-to-End Verification

- [ ] **Step 1: Start backend and confirm all routes registered**

```bash
cd backend && uvicorn app.main:app --reload
curl http://localhost:8000/openapi.json | python -m json.tool | grep '"path"' | grep -E "(board|ticket|parking|backlog)"
```

Expected: board, tickets, parking-lot, backlog endpoints visible.

- [ ] **Step 2: Start frontend**

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Verify Kanban board**
  - Open a project → navigate to `/projects/{slug}/board`
  - Confirm 5 columns render (Backlog, Todo, In Progress, In Review, Done)
  - Click `+` on any column → TicketForm opens → fill title → create → card appears in column
  - Drag card to another column → card moves optimistically → PATCH fires in network tab

- [ ] **Step 4: Verify list view**
  - Click "List" toggle → rows render with correct columns
  - Click a row → TicketDetailDrawer slides in from the right

- [ ] **Step 5: Verify Parking Lot**
  - Create a ticket → change status to "On Hold" via detail drawer → navigate to Parking Lot → ticket appears in "On Hold" section

- [ ] **Step 6: Verify Backlog**
  - Create ticket without sprint → appears in Backlog page

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "feat(phase-2): complete ticket system with Kanban board, list view, parking lot, backlog"
```
