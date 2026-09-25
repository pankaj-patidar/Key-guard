# Phase 1: Foundation & RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the modular domain folder structure and deliver a fully working role-based access control system — custom roles, granular permissions, per-project role overrides, and a frontend role management UI.

**Architecture:** New code lives in `backend/app/domains/roles/`. Existing flat `routers/`, `models/`, `schemas/` stay untouched. The RBAC engine is a single `require_permission()` dependency all new routers will call. Frontend role management lives at `/settings/roles`.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2, PostgreSQL, React 18, TanStack Query v5, Zustand, TailwindCSS, TypeScript.

---

## File Map

**Create:**
- `backend/app/domains/__init__.py`
- `backend/app/domains/roles/__init__.py`
- `backend/app/domains/roles/models.py`
- `backend/app/domains/roles/schemas.py`
- `backend/app/domains/roles/service.py`
- `backend/app/domains/roles/router.py`
- `backend/app/domains/roles/rbac.py`
- `backend/app/domains/roles/permissions.py`
- `backend/app/domains/roles/seed.py`
- `backend/alembic/versions/0002_roles_permissions.py`
- `backend/tests/__init__.py`
- `backend/tests/conftest.py`
- `backend/tests/domains/__init__.py`
- `backend/tests/domains/roles/__init__.py`
- `backend/tests/domains/roles/test_rbac.py`
- `backend/tests/domains/roles/test_roles_api.py`
- `frontend/src/hooks/useRoles.ts`
- `frontend/src/hooks/usePermissions.ts`
- `frontend/src/components/roles/RoleCard.tsx`
- `frontend/src/components/roles/PermissionMatrix.tsx`
- `frontend/src/components/roles/RoleForm.tsx`
- `frontend/src/pages/Settings/RolesPage.tsx`
- `frontend/src/pages/Settings/RoleDetailPage.tsx`

**Modify:**
- `backend/app/main.py` — register roles router
- `backend/alembic/env.py` — import new domain models
- `frontend/src/App.tsx` — add settings routes
- `frontend/src/layouts/Sidebar.tsx` — add Settings nav section

---

## Task 1: Domain Directory Structure

**Files:**
- Create: `backend/app/domains/__init__.py`
- Create: `backend/app/domains/roles/__init__.py`

- [ ] **Step 1: Create the domain directories and empty init files**

```bash
cd "backend"
mkdir -p app/domains/roles
touch app/domains/__init__.py
touch app/domains/roles/__init__.py
```

Expected: no output, directories created.

- [ ] **Step 2: Verify structure**

```bash
find app/domains -type f
```

Expected:
```
app/domains/__init__.py
app/domains/roles/__init__.py
```

- [ ] **Step 3: Commit**

```bash
git add app/domains/
git commit -m "feat: scaffold domains directory structure"
```

---

## Task 2: Permission Constants

**Files:**
- Create: `backend/app/domains/roles/permissions.py`

- [ ] **Step 1: Write failing test**

Create `backend/tests/domains/roles/test_permissions.py`:

```python
from app.domains.roles.permissions import ALL_PERMISSIONS, PERMISSION_MODULES

def test_all_permissions_have_module():
    for perm in ALL_PERMISSIONS:
        assert perm["module"] in PERMISSION_MODULES, f"{perm['key']} has unknown module"

def test_no_duplicate_keys():
    keys = [p["key"] for p in ALL_PERMISSIONS]
    assert len(keys) == len(set(keys))
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend
python -m pytest tests/domains/roles/test_permissions.py -v
```

Expected: `ModuleNotFoundError` or `ImportError`.

- [ ] **Step 3: Implement permissions.py**

```python
# backend/app/domains/roles/permissions.py

PERMISSION_MODULES = ["projects", "tickets", "sprints", "epics", "roles", "attachments", "notifications"]

ALL_PERMISSIONS: list[dict] = [
    # Projects
    {"key": "project:create",         "module": "projects",      "description": "Create new projects"},
    {"key": "project:edit",           "module": "projects",      "description": "Edit project details"},
    {"key": "project:delete",         "module": "projects",      "description": "Delete projects"},
    {"key": "project:manage_members", "module": "projects",      "description": "Add/remove project members and set their roles"},
    {"key": "project:view_all",       "module": "projects",      "description": "View all projects regardless of membership"},
    # Tickets
    {"key": "ticket:create_epic",     "module": "tickets",       "description": "Create Epic tickets"},
    {"key": "ticket:create_sprint",   "module": "tickets",       "description": "Create Sprint tickets"},
    {"key": "ticket:create_sub",      "module": "tickets",       "description": "Create sub-tickets (Bug, Task, Todo)"},
    {"key": "ticket:edit",            "module": "tickets",       "description": "Edit any ticket in the project"},
    {"key": "ticket:edit_own",        "module": "tickets",       "description": "Edit tickets owned or assigned to self"},
    {"key": "ticket:delete",          "module": "tickets",       "description": "Delete tickets"},
    {"key": "ticket:assign",          "module": "tickets",       "description": "Assign tickets to other users"},
    {"key": "ticket:change_status",   "module": "tickets",       "description": "Change ticket status"},
    {"key": "ticket:move_sprint",     "module": "tickets",       "description": "Move tickets between sprints"},
    {"key": "ticket:archive",         "module": "tickets",       "description": "Archive tickets"},
    # Sprints
    {"key": "sprint:create",          "module": "sprints",       "description": "Create sprints"},
    {"key": "sprint:activate",        "module": "sprints",       "description": "Activate a sprint"},
    {"key": "sprint:close",           "module": "sprints",       "description": "Close/end a sprint"},
    {"key": "sprint:edit",            "module": "sprints",       "description": "Edit sprint details"},
    {"key": "sprint:delete",          "module": "sprints",       "description": "Delete sprints"},
    # Epics
    {"key": "epic:create",            "module": "epics",         "description": "Create epics"},
    {"key": "epic:edit",              "module": "epics",         "description": "Edit epics"},
    {"key": "epic:delete",            "module": "epics",         "description": "Delete epics"},
    # Roles
    {"key": "role:create",            "module": "roles",         "description": "Create custom roles"},
    {"key": "role:edit",              "module": "roles",         "description": "Edit role permission sets"},
    {"key": "role:delete",            "module": "roles",         "description": "Delete custom roles"},
    {"key": "role:assign_system",     "module": "roles",         "description": "Assign system-wide roles to users"},
    {"key": "role:assign_project",    "module": "roles",         "description": "Assign project-level roles to members"},
    # Attachments
    {"key": "attachment:upload",      "module": "attachments",   "description": "Upload files to tickets"},
    {"key": "attachment:delete_own",  "module": "attachments",   "description": "Delete own uploads"},
    {"key": "attachment:delete_any",  "module": "attachments",   "description": "Delete any attachment"},
    # Notifications
    {"key": "notification:view",      "module": "notifications", "description": "View own notifications"},
]

# Convenience sets used by seed.py
ADMIN_PERMISSIONS     = {p["key"] for p in ALL_PERMISSIONS}
PM_PERMISSIONS        = {
    "project:create", "project:edit", "project:manage_members",
    "ticket:create_epic", "ticket:create_sprint", "ticket:create_sub",
    "ticket:edit", "ticket:edit_own", "ticket:delete", "ticket:assign",
    "ticket:change_status", "ticket:move_sprint", "ticket:archive",
    "sprint:create", "sprint:activate", "sprint:close", "sprint:edit", "sprint:delete",
    "epic:create", "epic:edit", "epic:delete",
    "role:assign_project",
    "attachment:upload", "attachment:delete_own", "attachment:delete_any",
    "notification:view",
}
TL_PERMISSIONS        = {
    "ticket:create_epic", "ticket:create_sprint", "ticket:create_sub",
    "ticket:edit", "ticket:edit_own", "ticket:assign",
    "ticket:change_status", "ticket:move_sprint", "ticket:archive",
    "sprint:create", "sprint:activate", "sprint:close", "sprint:edit",
    "epic:create", "epic:edit",
    "attachment:upload", "attachment:delete_own",
    "notification:view",
}
DEVELOPER_PERMISSIONS = {
    "ticket:create_sub", "ticket:edit_own", "ticket:change_status",
    "ticket:move_sprint",
    "attachment:upload", "attachment:delete_own",
    "notification:view",
}
TESTER_PERMISSIONS    = {
    "ticket:create_sub", "ticket:edit_own", "ticket:change_status",
    "attachment:upload", "attachment:delete_own",
    "notification:view",
}
VIEWER_PERMISSIONS    = {"notification:view"}
DEVOPS_PERMISSIONS    = TL_PERMISSIONS  # devops maps to TL-level for PM purposes
```

- [ ] **Step 4: Run tests**

```bash
python -m pytest tests/domains/roles/test_permissions.py -v
```

Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add app/domains/roles/permissions.py tests/domains/roles/test_permissions.py
git commit -m "feat: add permission key constants and module groupings"
```

---

## Task 3: Role & Permission DB Models

**Files:**
- Create: `backend/app/domains/roles/models.py`

- [ ] **Step 1: Write failing import test**

Add to `backend/tests/domains/roles/test_rbac.py`:

```python
def test_models_importable():
    from app.domains.roles.models import Role, Permission, UserProjectRole
    assert Role.__tablename__ == "roles"
    assert Permission.__tablename__ == "permissions"
    assert UserProjectRole.__tablename__ == "user_project_roles"
```

- [ ] **Step 2: Run to confirm failure**

```bash
python -m pytest tests/domains/roles/test_rbac.py::test_models_importable -v
```

Expected: `ImportError`.

- [ ] **Step 3: Implement models**

```python
# backend/app/domains/roles/models.py
import uuid
from datetime import datetime
from sqlalchemy import (Column, String, Boolean, Text, DateTime,
                        ForeignKey, Table, UniqueConstraint)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

# M2M association table — no ORM class needed
role_permissions_table = Table(
    "role_permissions", Base.metadata,
    Column("role_id",       UUID(as_uuid=True),
           ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", UUID(as_uuid=True),
           ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class Role(Base):
    __tablename__ = "roles"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String(100), nullable=False)
    slug        = Column(String(100), unique=True, nullable=False, index=True)
    is_system   = Column(Boolean, default=False, nullable=False)
    color       = Column(String(7), default="#6366f1")
    description = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)

    permissions        = relationship("Permission", secondary=role_permissions_table,
                                      back_populates="roles", lazy="selectin")
    user_project_roles = relationship("UserProjectRole", back_populates="role",
                                      cascade="all, delete-orphan")


class Permission(Base):
    __tablename__ = "permissions"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key         = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    module      = Column(String(50), nullable=False)

    roles = relationship("Role", secondary=role_permissions_table, back_populates="permissions")


class UserProjectRole(Base):
    __tablename__ = "user_project_roles"
    __table_args__ = (UniqueConstraint("user_id", "project_id", name="uq_user_project_role"),)

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id  = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    role_id     = Column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)

    user     = relationship("User", foreign_keys=[user_id])
    project  = relationship("Project")
    role     = relationship("Role", back_populates="user_project_roles")
    assigner = relationship("User", foreign_keys=[assigned_by])
```

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/domains/roles/test_rbac.py::test_models_importable -v
```

Expected: `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add app/domains/roles/models.py tests/domains/roles/test_rbac.py
git commit -m "feat: add Role, Permission, UserProjectRole SQLAlchemy models"
```

---

## Task 4: Alembic Migration

**Files:**
- Modify: `backend/alembic/env.py`
- Create: `backend/alembic/versions/0002_roles_permissions.py`

- [ ] **Step 1: Import new models in env.py**

Open `backend/alembic/env.py`. Find the line that imports models and add:

```python
# Add after existing model imports:
from app.domains.roles import models as roles_models  # noqa: F401 — registers tables with metadata
```

- [ ] **Step 2: Generate migration**

```bash
cd backend
alembic revision --autogenerate -m "roles_permissions"
```

Expected: creates a new file in `alembic/versions/`. Copy the generated filename.

- [ ] **Step 3: Verify the migration content**

Open the generated file. It should contain `create_table` calls for `roles`, `permissions`, `role_permissions`, and `user_project_roles`. If autogenerate missed anything, add manually:

```python
def upgrade() -> None:
    op.create_table('roles',
        sa.Column('id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('color', sa.String(7), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_roles_slug', 'roles', ['slug'], unique=True)

    op.create_table('permissions',
        sa.Column('id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('key', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('module', sa.String(50), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_permissions_key', 'permissions', ['key'], unique=True)

    op.create_table('role_permissions',
        sa.Column('role_id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('permission_id', sa.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('role_id', 'permission_id'),
    )

    op.create_table('user_project_roles',
        sa.Column('id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', sa.UUID(as_uuid=True), nullable=True),
        sa.Column('role_id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('assigned_by', sa.UUID(as_uuid=True), nullable=True),
        sa.Column('assigned_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'project_id', name='uq_user_project_role'),
    )

def downgrade() -> None:
    op.drop_table('user_project_roles')
    op.drop_table('role_permissions')
    op.drop_index('ix_permissions_key', 'permissions')
    op.drop_table('permissions')
    op.drop_index('ix_roles_slug', 'roles')
    op.drop_table('roles')
```

- [ ] **Step 4: Apply migration**

```bash
alembic upgrade head
```

Expected: `Running upgrade ... -> <rev>, roles_permissions`.

- [ ] **Step 5: Commit**

```bash
git add alembic/ app/domains/roles/models.py
git commit -m "feat: add roles/permissions migration (0002)"
```

---

## Task 5: Seed System Roles

**Files:**
- Create: `backend/app/domains/roles/seed.py`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/domains/roles/test_rbac.py  (add to file)
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.roles.seed import seed_roles_and_permissions
from app.domains.roles.models import Role, Permission

@pytest.mark.asyncio
async def test_seed_creates_system_roles(db: AsyncSession):
    await seed_roles_and_permissions(db)
    from sqlalchemy import select
    result = await db.execute(select(Role).where(Role.is_system == True))
    roles = result.scalars().all()
    slugs = {r.slug for r in roles}
    assert {"admin", "pm", "tl", "developer", "tester", "viewer", "devops"} <= slugs

@pytest.mark.asyncio
async def test_seed_is_idempotent(db: AsyncSession):
    await seed_roles_and_permissions(db)
    await seed_roles_and_permissions(db)  # second call must not raise or duplicate
    from sqlalchemy import select, func
    result = await db.execute(select(func.count()).select_from(Role).where(Role.slug == "admin"))
    count = result.scalar()
    assert count == 1
```

- [ ] **Step 2: Run to confirm failure (no conftest.py yet — set it up first)**

Create `backend/tests/conftest.py`:

```python
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.main import app
from app.database import Base, get_db

TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost/keyguard_test"

@pytest.fixture(scope="session")
def event_loop():
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="session")
async def engine():
    _engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield _engine
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await _engine.dispose()

@pytest_asyncio.fixture
async def db(engine):
    Session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with Session() as session:
        yield session
        await session.rollback()

@pytest_asyncio.fixture
async def client(db: AsyncSession):
    async def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
```

Also install test dependencies:

```bash
pip install pytest pytest-asyncio httpx
```

- [ ] **Step 3: Implement seed.py**

```python
# backend/app/domains/roles/seed.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.domains.roles.models import Role, Permission, role_permissions_table
from app.domains.roles.permissions import (
    ALL_PERMISSIONS, ADMIN_PERMISSIONS, PM_PERMISSIONS, TL_PERMISSIONS,
    DEVELOPER_PERMISSIONS, TESTER_PERMISSIONS, VIEWER_PERMISSIONS, DEVOPS_PERMISSIONS,
)

SYSTEM_ROLES = [
    {"name": "Admin",            "slug": "admin",     "color": "#ef4444", "description": "Full system access", "perms": ADMIN_PERMISSIONS},
    {"name": "Project Manager",  "slug": "pm",        "color": "#8b5cf6", "description": "Manages projects and sprints", "perms": PM_PERMISSIONS},
    {"name": "Tech Lead",        "slug": "tl",        "color": "#3b82f6", "description": "Technical leadership", "perms": TL_PERMISSIONS},
    {"name": "Developer",        "slug": "developer", "color": "#10b981", "description": "Builds features", "perms": DEVELOPER_PERMISSIONS},
    {"name": "Tester",           "slug": "tester",    "color": "#f59e0b", "description": "QA and bug reporting", "perms": TESTER_PERMISSIONS},
    {"name": "Viewer",           "slug": "viewer",    "color": "#6b7280", "description": "Read-only access", "perms": VIEWER_PERMISSIONS},
    {"name": "DevOps",           "slug": "devops",    "color": "#06b6d4", "description": "Infrastructure and deployment", "perms": DEVOPS_PERMISSIONS},
]


async def seed_roles_and_permissions(db: AsyncSession) -> None:
    """Idempotent — safe to call on every startup."""
    # 1. Upsert permissions
    perm_map: dict[str, Permission] = {}
    for p_def in ALL_PERMISSIONS:
        result = await db.execute(select(Permission).where(Permission.key == p_def["key"]))
        perm = result.scalar_one_or_none()
        if not perm:
            perm = Permission(key=p_def["key"], description=p_def["description"], module=p_def["module"])
            db.add(perm)
            await db.flush()
        perm_map[perm.key] = perm

    # 2. Upsert system roles with their permissions
    for role_def in SYSTEM_ROLES:
        result = await db.execute(select(Role).where(Role.slug == role_def["slug"]))
        role = result.scalar_one_or_none()
        if not role:
            role = Role(
                name=role_def["name"],
                slug=role_def["slug"],
                color=role_def["color"],
                description=role_def["description"],
                is_system=True,
            )
            db.add(role)
            await db.flush()

        # Sync permissions (replace entire set)
        await db.execute(
            role_permissions_table.delete().where(
                role_permissions_table.c.role_id == role.id
            )
        )
        for key in role_def["perms"]:
            if key in perm_map:
                await db.execute(
                    role_permissions_table.insert().values(
                        role_id=role.id,
                        permission_id=perm_map[key].id,
                    )
                )

    await db.commit()
```

- [ ] **Step 4: Call seed at startup in main.py**

Open `backend/app/main.py` and add the startup event:

```python
from app.database import AsyncSessionLocal
from app.domains.roles.seed import seed_roles_and_permissions

@app.on_event("startup")
async def on_startup():
    async with AsyncSessionLocal() as db:
        await seed_roles_and_permissions(db)
```

- [ ] **Step 5: Run tests**

```bash
python -m pytest tests/domains/roles/test_rbac.py -v -k "seed"
```

Expected: `2 passed`.

- [ ] **Step 6: Commit**

```bash
git add app/domains/roles/seed.py app/main.py tests/conftest.py
git commit -m "feat: seed system roles and permissions on startup"
```

---

## Task 6: RBAC Engine

**Files:**
- Create: `backend/app/domains/roles/rbac.py`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/domains/roles/test_rbac.py  (add to file)
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi import HTTPException
from app.domains.roles.rbac import require_permission
from app.models.user import User, UserRole

def make_user(role: UserRole = UserRole.DEV) -> User:
    u = User()
    u.id = uuid4()
    u.role = role
    return u

@pytest.mark.asyncio
async def test_admin_always_passes(db):
    user = make_user(UserRole.ADMIN)
    # Should not raise even with a nonexistent permission key
    await require_permission("ticket:delete", user, db, project_id=None)

@pytest.mark.asyncio
async def test_viewer_denied_create_epic(db):
    from app.domains.roles.seed import seed_roles_and_permissions
    await seed_roles_and_permissions(db)
    user = make_user(UserRole.VIEWER)
    with pytest.raises(HTTPException) as exc_info:
        await require_permission("ticket:create_epic", user, db)
    assert exc_info.value.status_code == 403

@pytest.mark.asyncio
async def test_developer_can_create_sub(db):
    from app.domains.roles.seed import seed_roles_and_permissions
    await seed_roles_and_permissions(db)
    user = make_user(UserRole.DEV)
    # Should not raise
    await require_permission("ticket:create_sub", user, db)
```

- [ ] **Step 2: Run to confirm failure**

```bash
python -m pytest tests/domains/roles/test_rbac.py -v -k "rbac or admin or viewer or developer"
```

Expected: `ImportError` or `3 failed`.

- [ ] **Step 3: Implement rbac.py**

```python
# backend/app/domains/roles/rbac.py
from uuid import UUID
from fastapi import HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User, UserRole
from app.domains.roles.models import Role, Permission, UserProjectRole, role_permissions_table
from app.security.dependencies import get_current_user

# Maps UserRole enum values to system role slugs in the roles table
_ROLE_SLUG_MAP: dict[UserRole, str] = {
    UserRole.ADMIN:  "admin",
    UserRole.PM:     "pm",
    UserRole.DEVOPS: "devops",
    UserRole.DEV:    "developer",
    UserRole.VIEWER: "viewer",
}


async def _resolve_role(user: User, db: AsyncSession, project_id: UUID | None) -> Role | None:
    """Returns the most specific role for the user: project-level override first, then system role."""
    if project_id:
        stmt = (
            select(Role)
            .join(UserProjectRole, UserProjectRole.role_id == Role.id)
            .where(
                UserProjectRole.user_id == user.id,
                UserProjectRole.project_id == project_id,
            )
        )
        result = await db.execute(stmt)
        role = result.scalar_one_or_none()
        if role:
            return role

    # System-wide override (project_id = NULL row)
    stmt = (
        select(Role)
        .join(UserProjectRole, UserProjectRole.role_id == Role.id)
        .where(
            UserProjectRole.user_id == user.id,
            UserProjectRole.project_id.is_(None),
        )
    )
    result = await db.execute(stmt)
    role = result.scalar_one_or_none()
    if role:
        return role

    # Fall back: find the system role matching the user's UserRole enum
    slug = _ROLE_SLUG_MAP.get(user.role)
    if slug:
        stmt = select(Role).where(Role.slug == slug, Role.is_system == True)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    return None


async def _role_has_permission(role: Role, permission_key: str, db: AsyncSession) -> bool:
    stmt = (
        select(Permission)
        .join(role_permissions_table, role_permissions_table.c.permission_id == Permission.id)
        .where(
            role_permissions_table.c.role_id == role.id,
            Permission.key == permission_key,
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


async def require_permission(
    permission_key: str,
    user: User,
    db: AsyncSession,
    project_id: UUID | None = None,
) -> None:
    """Raises HTTP 403 if the user lacks the given permission. Call from route dependencies."""
    # Superuser bypass — system Admin is never blocked
    if user.role == UserRole.ADMIN:
        return

    role = await _resolve_role(user, db, project_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No role assigned")

    has_perm = await _role_has_permission(role, permission_key, db)
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to perform this action",
        )


def permission_required(permission_key: str, get_project_id=None):
    """
    FastAPI dependency factory.

    Usage:
        @router.post("/")
        async def create(
            project_id: UUID,
            _: None = Depends(permission_required("ticket:create_sub", lambda p: p)),
            ...
        ):
    """
    async def _dep(
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        p_id = None
        await require_permission(permission_key, user, db, project_id=p_id)
    return _dep
```

- [ ] **Step 4: Run tests**

```bash
python -m pytest tests/domains/roles/test_rbac.py -v
```

Expected: `all passed`.

- [ ] **Step 5: Commit**

```bash
git add app/domains/roles/rbac.py tests/domains/roles/test_rbac.py
git commit -m "feat: implement RBAC permission evaluation engine"
```

---

## Task 7: Role Schemas

**Files:**
- Create: `backend/app/domains/roles/schemas.py`

- [ ] **Step 1: Implement schemas (no separate test needed — validated by API tests in Task 9)**

```python
# backend/app/domains/roles/schemas.py
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class PermissionOut(BaseModel):
    id: UUID
    key: str
    description: str | None
    module: str

    model_config = {"from_attributes": True}


class RoleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")
    description: str | None = None


class RoleCreate(RoleBase):
    permission_keys: list[str] = Field(default_factory=list)


class RoleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    description: str | None = None


class RoleOut(RoleBase):
    id: UUID
    slug: str
    is_system: bool
    created_at: datetime
    permissions: list[PermissionOut] = []

    model_config = {"from_attributes": True}


class PermissionSetUpdate(BaseModel):
    permission_keys: list[str]


class UserProjectRoleCreate(BaseModel):
    role_id: UUID


class UserProjectRoleOut(BaseModel):
    id: UUID
    user_id: UUID
    project_id: UUID | None
    role_id: UUID
    assigned_at: datetime

    model_config = {"from_attributes": True}


class MyPermissionsOut(BaseModel):
    project_id: UUID | None
    role_slug: str
    permissions: list[str]
```

- [ ] **Step 2: Commit**

```bash
git add app/domains/roles/schemas.py
git commit -m "feat: add role and permission Pydantic v2 schemas"
```

---

## Task 8: Role Service

**Files:**
- Create: `backend/app/domains/roles/service.py`

- [ ] **Step 1: Implement service**

```python
# backend/app/domains/roles/service.py
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from fastapi import HTTPException, status
from app.domains.roles.models import Role, Permission, UserProjectRole, role_permissions_table
from app.domains.roles.schemas import RoleCreate, RoleUpdate
from app.domains.roles.rbac import _resolve_role


def _slugify(name: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


async def list_roles(db: AsyncSession) -> list[Role]:
    result = await db.execute(select(Role).order_by(Role.is_system.desc(), Role.name))
    return list(result.scalars().all())


async def get_role(role_id: UUID, db: AsyncSession) -> Role:
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return role


async def create_role(data: RoleCreate, db: AsyncSession) -> Role:
    slug = _slugify(data.name)
    existing = await db.execute(select(Role).where(Role.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Role slug '{slug}' already exists")

    role = Role(name=data.name, slug=slug, color=data.color, description=data.description, is_system=False)
    db.add(role)
    await db.flush()

    if data.permission_keys:
        await _set_permissions(role.id, data.permission_keys, db)

    await db.commit()
    await db.refresh(role)
    return role


async def update_role(role_id: UUID, data: RoleUpdate, db: AsyncSession) -> Role:
    role = await get_role(role_id, db)
    if data.name is not None:
        role.name = data.name
    if data.color is not None:
        role.color = data.color
    if data.description is not None:
        role.description = data.description
    await db.commit()
    await db.refresh(role)
    return role


async def delete_role(role_id: UUID, db: AsyncSession) -> None:
    role = await get_role(role_id, db)
    if role.is_system:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="System roles cannot be deleted")
    await db.delete(role)
    await db.commit()


async def _set_permissions(role_id: UUID, permission_keys: list[str], db: AsyncSession) -> None:
    """Replace the entire permission set for a role."""
    await db.execute(
        role_permissions_table.delete().where(role_permissions_table.c.role_id == role_id)
    )
    if not permission_keys:
        return
    result = await db.execute(select(Permission).where(Permission.key.in_(permission_keys)))
    perms = result.scalars().all()
    for perm in perms:
        await db.execute(
            role_permissions_table.insert().values(role_id=role_id, permission_id=perm.id)
        )


async def set_role_permissions(role_id: UUID, permission_keys: list[str], db: AsyncSession) -> Role:
    role = await get_role(role_id, db)
    if role.is_system and role.slug == "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin permissions are locked")
    await _set_permissions(role_id, permission_keys, db)
    await db.commit()
    await db.refresh(role)
    return role


async def set_project_member_role(
    user_id: UUID, project_id: UUID | None, role_id: UUID, assigner_id: UUID, db: AsyncSession
) -> UserProjectRole:
    result = await db.execute(
        select(UserProjectRole).where(
            UserProjectRole.user_id == user_id,
            UserProjectRole.project_id == project_id,
        )
    )
    upr = result.scalar_one_or_none()
    if upr:
        upr.role_id = role_id
        upr.assigned_by = assigner_id
    else:
        upr = UserProjectRole(
            user_id=user_id, project_id=project_id, role_id=role_id, assigned_by=assigner_id
        )
        db.add(upr)
    await db.commit()
    await db.refresh(upr)
    return upr


async def get_my_permissions(user_id: UUID, project_id: UUID | None, db: AsyncSession) -> dict:
    from app.models.user import User
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = await _resolve_role(user, db, project_id)
    if not role:
        return {"project_id": project_id, "role_slug": "none", "permissions": []}

    return {
        "project_id": project_id,
        "role_slug": role.slug,
        "permissions": [p.key for p in role.permissions],
    }
```

- [ ] **Step 2: Commit**

```bash
git add app/domains/roles/service.py
git commit -m "feat: add role service with CRUD and permission management"
```

---

## Task 9: Role Router + API Tests

**Files:**
- Create: `backend/app/domains/roles/router.py`
- Create: `backend/tests/domains/roles/test_roles_api.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write failing API tests**

```python
# backend/tests/domains/roles/test_roles_api.py
import pytest
from httpx import AsyncClient
from app.domains.roles.seed import seed_roles_and_permissions

@pytest.fixture(autouse=True)
async def seed(db):
    await seed_roles_and_permissions(db)


@pytest.mark.asyncio
async def test_list_roles_requires_auth(client: AsyncClient):
    response = await client.get("/api/v1/roles")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_roles(client: AsyncClient, admin_token: str):
    response = await client.get("/api/v1/roles", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    data = response.json()
    slugs = [r["slug"] for r in data]
    assert "admin" in slugs
    assert "developer" in slugs


@pytest.mark.asyncio
async def test_create_role(client: AsyncClient, admin_token: str):
    payload = {
        "name": "QA Lead",
        "color": "#f59e0b",
        "description": "Quality assurance lead",
        "permission_keys": ["ticket:create_sub", "ticket:change_status"],
    }
    response = await client.post(
        "/api/v1/roles", json=payload, headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["slug"] == "qa-lead"
    assert data["is_system"] is False
    assert "ticket:create_sub" in [p["key"] for p in data["permissions"]]


@pytest.mark.asyncio
async def test_delete_system_role_rejected(client: AsyncClient, admin_token: str):
    # Get admin role ID
    roles_resp = await client.get("/api/v1/roles", headers={"Authorization": f"Bearer {admin_token}"})
    admin_role = next(r for r in roles_resp.json() if r["slug"] == "admin")
    response = await client.delete(
        f"/api/v1/roles/{admin_role['id']}", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_non_admin_cannot_create_role(client: AsyncClient, developer_token: str):
    response = await client.post(
        "/api/v1/roles",
        json={"name": "Hacker", "permission_keys": []},
        headers={"Authorization": f"Bearer {developer_token}"},
    )
    assert response.status_code == 403
```

Add fixtures to `conftest.py`:

```python
# Add to backend/tests/conftest.py
from app.models.user import User, UserRole
from app.security.password import hash_password
from app.security.jwt import create_access_token

@pytest_asyncio.fixture
async def admin_user(db: AsyncSession) -> User:
    user = User(email="admin@test.com", full_name="Admin", hashed_password=hash_password("pass"), role=UserRole.ADMIN)
    db.add(user)
    await db.flush()
    return user

@pytest_asyncio.fixture
async def developer_user(db: AsyncSession) -> User:
    user = User(email="dev@test.com", full_name="Dev", hashed_password=hash_password("pass"), role=UserRole.DEV)
    db.add(user)
    await db.flush()
    return user

@pytest.fixture
def admin_token(admin_user: User) -> str:
    return create_access_token({"sub": str(admin_user.id)})

@pytest.fixture
def developer_token(developer_user: User) -> str:
    return create_access_token({"sub": str(developer_user.id)})
```

- [ ] **Step 2: Run to confirm failure**

```bash
python -m pytest tests/domains/roles/test_roles_api.py -v
```

Expected: `ImportError` — router not created yet.

- [ ] **Step 3: Implement router**

```python
# backend/app/domains/roles/router.py
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.security.dependencies import get_current_user
from app.domains.roles import service
from app.domains.roles.schemas import (
    RoleOut, RoleCreate, RoleUpdate, PermissionOut,
    PermissionSetUpdate, UserProjectRoleCreate, UserProjectRoleOut, MyPermissionsOut,
)
from app.domains.roles.rbac import require_permission
from app.domains.roles.permissions import ALL_PERMISSIONS

router = APIRouter(prefix="/api/v1", tags=["roles"])


@router.get("/roles", response_model=list[RoleOut])
async def list_roles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_roles(db)


@router.get("/roles/{role_id}", response_model=RoleOut)
async def get_role(
    role_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_role(role_id, db)


@router.post("/roles", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
async def create_role(
    data: RoleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("role:create", current_user, db)
    return await service.create_role(data, db)


@router.patch("/roles/{role_id}", response_model=RoleOut)
async def update_role(
    role_id: UUID,
    data: RoleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("role:edit", current_user, db)
    return await service.update_role(role_id, data, db)


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("role:delete", current_user, db)
    await service.delete_role(role_id, db)


@router.get("/permissions", response_model=list[PermissionOut])
async def list_permissions(current_user: User = Depends(get_current_user)):
    """Returns all permission keys (read from constants, not DB)."""
    from app.domains.roles.models import Permission
    return [
        {"id": "00000000-0000-0000-0000-000000000000", **p}
        for p in ALL_PERMISSIONS
    ]


@router.put("/roles/{role_id}/permissions", response_model=RoleOut)
async def set_role_permissions(
    role_id: UUID,
    data: PermissionSetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("role:edit", current_user, db)
    return await service.set_role_permissions(role_id, data.permission_keys, db)


@router.put(
    "/projects/{project_id}/members/{user_id}/role",
    response_model=UserProjectRoleOut,
)
async def set_project_member_role(
    project_id: UUID,
    user_id: UUID,
    data: UserProjectRoleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_permission("role:assign_project", current_user, db, project_id=project_id)
    return await service.set_project_member_role(user_id, project_id, data.role_id, current_user.id, db)


@router.get("/projects/{project_id}/my-permissions", response_model=MyPermissionsOut)
async def get_my_permissions(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await service.get_my_permissions(current_user.id, project_id, db)
    return result
```

- [ ] **Step 4: Register router in main.py**

```python
# In backend/app/main.py, add:
from app.domains.roles.router import router as roles_router
app.include_router(roles_router)
```

- [ ] **Step 5: Run API tests**

```bash
python -m pytest tests/domains/roles/test_roles_api.py -v
```

Expected: `5 passed`.

- [ ] **Step 6: Commit**

```bash
git add app/domains/roles/router.py app/main.py tests/domains/roles/test_roles_api.py tests/conftest.py
git commit -m "feat: add role CRUD API with RBAC permission guards"
```

---

## Task 10: Frontend — Role Hooks

**Files:**
- Create: `frontend/src/hooks/useRoles.ts`
- Create: `frontend/src/hooks/usePermissions.ts`

- [ ] **Step 1: Implement useRoles.ts**

```typescript
// frontend/src/hooks/useRoles.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export interface Permission {
  id: string
  key: string
  description: string
  module: string
}

export interface Role {
  id: string
  name: string
  slug: string
  color: string
  description: string | null
  is_system: boolean
  created_at: string
  permissions: Permission[]
}

export interface RoleCreate {
  name: string
  color?: string
  description?: string
  permission_keys?: string[]
}

const ROLES_KEY = ['roles']

export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => api.get<Role[]>('/api/v1/roles').then(r => r.data),
  })
}

export function useRole(roleId: string) {
  return useQuery({
    queryKey: [...ROLES_KEY, roleId],
    queryFn: () => api.get<Role>(`/api/v1/roles/${roleId}`).then(r => r.data),
    enabled: !!roleId,
  })
}

export function usePermissionKeys() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: () => api.get<Permission[]>('/api/v1/permissions').then(r => r.data),
    staleTime: Infinity, // permission list never changes without a deploy
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RoleCreate) => api.post<Role>('/api/v1/roles', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ROLES_KEY }),
  })
}

export function useUpdateRolePermissions(roleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (permissionKeys: string[]) =>
      api.put<Role>(`/api/v1/roles/${roleId}/permissions`, { permission_keys: permissionKeys }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROLES_KEY })
      qc.invalidateQueries({ queryKey: [...ROLES_KEY, roleId] })
    },
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (roleId: string) => api.delete(`/api/v1/roles/${roleId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ROLES_KEY }),
  })
}

export function useSetProjectMemberRole(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      api.put(`/api/v1/projects/${projectId}/members/${userId}/role`, { role_id: roleId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'members'] }),
  })
}
```

- [ ] **Step 2: Implement usePermissions.ts**

```typescript
// frontend/src/hooks/usePermissions.ts
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

interface MyPermissions {
  project_id: string | null
  role_slug: string
  permissions: string[]
}

export function usePermissions(projectId: string | null) {
  const { data } = useQuery({
    queryKey: ['permissions', 'me', projectId],
    queryFn: () =>
      projectId
        ? api.get<MyPermissions>(`/api/v1/projects/${projectId}/my-permissions`).then(r => r.data)
        : Promise.resolve({ project_id: null, role_slug: 'none', permissions: [] }),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 min cache — permissions don't change mid-session
  })

  const can = (permissionKey: string): boolean => {
    return data?.permissions.includes(permissionKey) ?? false
  }

  return { can, roleSlug: data?.role_slug ?? null, isLoading: !data }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useRoles.ts frontend/src/hooks/usePermissions.ts
git commit -m "feat: add useRoles and usePermissions TanStack Query hooks"
```

---

## Task 11: Frontend — Permission Matrix Component

**Files:**
- Create: `frontend/src/components/roles/PermissionMatrix.tsx`

- [ ] **Step 1: Implement component**

```tsx
// frontend/src/components/roles/PermissionMatrix.tsx
import React from 'react'
import { Permission } from '../../hooks/useRoles'

const MODULE_LABELS: Record<string, string> = {
  projects: 'Projects',
  tickets: 'Tickets',
  sprints: 'Sprints',
  epics: 'Epics',
  roles: 'Roles & Permissions',
  attachments: 'Attachments',
  notifications: 'Notifications',
}

const MODULES = Object.keys(MODULE_LABELS)

interface Props {
  allPermissions: Permission[]
  selectedKeys: Set<string>
  onChange?: (keys: Set<string>) => void
  readOnly?: boolean
}

export function PermissionMatrix({ allPermissions, selectedKeys, onChange, readOnly = false }: Props) {
  const byModule = MODULES.reduce<Record<string, Permission[]>>((acc, mod) => {
    acc[mod] = allPermissions.filter(p => p.module === mod)
    return acc
  }, {})

  const toggle = (key: string) => {
    if (readOnly || !onChange) return
    const next = new Set(selectedKeys)
    next.has(key) ? next.delete(key) : next.add(key)
    onChange(next)
  }

  const toggleModule = (mod: string) => {
    if (readOnly || !onChange) return
    const moduleKeys = byModule[mod].map(p => p.key)
    const allSelected = moduleKeys.every(k => selectedKeys.has(k))
    const next = new Set(selectedKeys)
    moduleKeys.forEach(k => allSelected ? next.delete(k) : next.add(k))
    onChange(next)
  }

  return (
    <div className="space-y-8">
      {MODULES.map(mod => {
        const perms = byModule[mod]
        if (!perms?.length) return null
        const allSelected = perms.every(p => selectedKeys.has(p.key))
        const someSelected = perms.some(p => selectedKeys.has(p.key))

        return (
          <div key={mod}>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                onChange={() => toggleModule(mod)}
                disabled={readOnly}
                className="w-4 h-4 accent-indigo-500 cursor-pointer"
              />
              <h4 className="text-sm font-semibold text-white">{MODULE_LABELS[mod]}</h4>
              <span className="text-xs text-zinc-500 ml-auto">
                {perms.filter(p => selectedKeys.has(p.key)).length}/{perms.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-7">
              {perms.map(perm => (
                <label
                  key={perm.key}
                  className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                    readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-zinc-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(perm.key)}
                    onChange={() => toggle(perm.key)}
                    disabled={readOnly}
                    className="mt-0.5 w-4 h-4 accent-indigo-500"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-zinc-300 truncate">{perm.key}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{perm.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/roles/PermissionMatrix.tsx
git commit -m "feat: add PermissionMatrix component with module grouping and bulk toggle"
```

---

## Task 12: Frontend — Roles Pages

**Files:**
- Create: `frontend/src/components/roles/RoleCard.tsx`
- Create: `frontend/src/components/roles/RoleForm.tsx`
- Create: `frontend/src/pages/Settings/RolesPage.tsx`
- Create: `frontend/src/pages/Settings/RoleDetailPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/layouts/Sidebar.tsx`

- [ ] **Step 1: RoleCard component**

```tsx
// frontend/src/components/roles/RoleCard.tsx
import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, Lock, ChevronRight } from 'lucide-react'
import { Role } from '../../hooks/useRoles'

interface Props {
  role: Role
}

export function RoleCard({ role }: Props) {
  return (
    <Link
      to={`/settings/roles/${role.id}`}
      className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-600 transition-all group"
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${role.color}20`, borderColor: `${role.color}40`, border: '1px solid' }}
      >
        <Shield className="w-5 h-5" style={{ color: role.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">{role.name}</span>
          {role.is_system && (
            <span className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" /> System
            </span>
          )}
        </div>
        {role.description && (
          <p className="text-sm text-zinc-500 truncate mt-0.5">{role.description}</p>
        )}
        <p className="text-xs text-zinc-600 mt-1">{role.permissions.length} permissions</p>
      </div>

      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
    </Link>
  )
}
```

- [ ] **Step 2: RoleForm modal**

```tsx
// frontend/src/components/roles/RoleForm.tsx
import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateRole, usePermissionKeys } from '../../hooks/useRoles'
import { PermissionMatrix } from './PermissionMatrix'
import toast from 'react-hot-toast'

const PRESET_COLORS = ['#6366f1','#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899']

interface Props {
  onClose: () => void
}

export function RoleForm({ onClose }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [description, setDescription] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  const { data: allPermissions = [] } = usePermissionKeys()
  const createRole = useCreateRole()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await createRole.mutateAsync({
        name: name.trim(),
        color,
        description: description.trim() || undefined,
        permission_keys: Array.from(selectedKeys),
      })
      toast.success('Role created')
      onClose()
    } catch {
      toast.error('Failed to create role')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Create Role</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5 border-b border-zinc-800">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Role Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. QA Lead"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Color</label>
              <div className="flex gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-lg transition-transform ${color === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What does this role do?"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">Permissions</h3>
            <PermissionMatrix
              allPermissions={allPermissions}
              selectedKeys={selectedKeys}
              onChange={setSelectedKeys}
            />
          </div>
        </form>

        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={!name.trim() || createRole.isPending}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {createRole.isPending ? 'Creating…' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: RolesPage**

```tsx
// frontend/src/pages/Settings/RolesPage.tsx
import React, { useState } from 'react'
import { Plus, Shield } from 'lucide-react'
import { useRoles } from '../../hooks/useRoles'
import { RoleCard } from '../../components/roles/RoleCard'
import { RoleForm } from '../../components/roles/RoleForm'
import { useAuthStore } from '../../store/authStore'

export function RolesPage() {
  const { data: roles = [], isLoading } = useRoles()
  const [showForm, setShowForm] = useState(false)
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin'

  const systemRoles = roles.filter(r => r.is_system)
  const customRoles = roles.filter(r => !r.is_system)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="w-6 h-6 text-indigo-400" />
            Roles & Permissions
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Manage what each role can do across the system</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Role
          </button>
        )}
      </div>

      {systemRoles.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">System Roles</h2>
          <div className="space-y-2">
            {systemRoles.map(role => <RoleCard key={role.id} role={role} />)}
          </div>
        </section>
      )}

      {customRoles.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Custom Roles</h2>
          <div className="space-y-2">
            {customRoles.map(role => <RoleCard key={role.id} role={role} />)}
          </div>
        </section>
      )}

      {customRoles.length === 0 && !isLoading && (
        <div className="text-center py-12 text-zinc-600">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No custom roles yet</p>
        </div>
      )}

      {showForm && <RoleForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
```

- [ ] **Step 4: RoleDetailPage**

```tsx
// frontend/src/pages/Settings/RoleDetailPage.tsx
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, Lock } from 'lucide-react'
import { useRole, usePermissionKeys, useUpdateRolePermissions, useDeleteRole } from '../../hooks/useRoles'
import { PermissionMatrix } from '../../components/roles/PermissionMatrix'
import toast from 'react-hot-toast'

export function RoleDetailPage() {
  const { roleId } = useParams<{ roleId: string }>()
  const navigate = useNavigate()
  const { data: role, isLoading } = useRole(roleId!)
  const { data: allPermissions = [] } = usePermissionKeys()
  const updatePerms = useUpdateRolePermissions(roleId!)
  const deleteRole = useDeleteRole()

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (role) {
      setSelectedKeys(new Set(role.permissions.map(p => p.key)))
      setDirty(false)
    }
  }, [role])

  const handleChange = (keys: Set<string>) => {
    setSelectedKeys(keys)
    setDirty(true)
  }

  const handleSave = async () => {
    try {
      await updatePerms.mutateAsync(Array.from(selectedKeys))
      toast.success('Permissions updated')
      setDirty(false)
    } catch {
      toast.error('Failed to update permissions')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete role "${role?.name}"? This cannot be undone.`)) return
    try {
      await deleteRole.mutateAsync(roleId!)
      toast.success('Role deleted')
      navigate('/settings/roles')
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Failed to delete role')
    }
  }

  if (isLoading || !role) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  const isLocked = role.is_system && role.slug === 'admin'

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <button
        onClick={() => navigate('/settings/roles')}
        className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Roles
      </button>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${role.color}20`, border: `1px solid ${role.color}40` }}
          >
            <span className="text-xl" style={{ color: role.color }}>●</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {role.name}
              {role.is_system && <Lock className="w-4 h-4 text-zinc-500" />}
            </h1>
            {role.description && <p className="text-zinc-400 text-sm mt-0.5">{role.description}</p>}
          </div>
        </div>

        <div className="flex gap-2">
          {!role.is_system && (
            <button
              onClick={handleDelete}
              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {!isLocked && dirty && (
            <button
              onClick={handleSave}
              disabled={updatePerms.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {updatePerms.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {isLocked && (
        <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm flex items-center gap-2">
          <Lock className="w-4 h-4" /> Admin permissions are locked and cannot be modified.
        </div>
      )}

      <PermissionMatrix
        allPermissions={allPermissions}
        selectedKeys={selectedKeys}
        onChange={handleChange}
        readOnly={isLocked}
      />
    </div>
  )
}
```

- [ ] **Step 5: Add routes to App.tsx**

Open `frontend/src/App.tsx` and add inside the authenticated routes:

```tsx
import { RolesPage } from './pages/Settings/RolesPage'
import { RoleDetailPage } from './pages/Settings/RoleDetailPage'

// Add inside your route tree:
<Route path="/settings/roles" element={<RolesPage />} />
<Route path="/settings/roles/:roleId" element={<RoleDetailPage />} />
```

- [ ] **Step 6: Add Settings nav to Sidebar**

Open `frontend/src/layouts/Sidebar.tsx` and add a Settings section:

```tsx
import { Settings, Shield } from 'lucide-react'

// Add to nav items (visible to admin only):
{user?.role === 'admin' && (
  <div className="mt-auto border-t border-zinc-800 pt-4">
    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 px-3 mb-2">Settings</p>
    <NavLink to="/settings/roles" icon={<Shield className="w-4 h-4" />} label="Roles" />
    <NavLink to="/settings/system" icon={<Settings className="w-4 h-4" />} label="System" />
  </div>
)}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: add roles management UI — list, detail, permission matrix, create form"
```

---

## Task 13: Start Dev Server and Verify

- [ ] **Step 1: Start backend**

```bash
cd backend
uvicorn app.main:app --reload
```

Expected: `Application startup complete.` with seed log output.

- [ ] **Step 2: Start frontend**

```bash
cd frontend
npm run dev
```

- [ ] **Step 3: Verify in browser**
  - Log in as Admin
  - Navigate to `/settings/roles`
  - Confirm 7 system roles appear with correct colors
  - Click "Admin" → confirm permissions matrix is visible and locked
  - Click "Developer" → uncheck a permission → "Save Changes" appears → save → success toast
  - Click "New Role" → fill in name, pick color, select permissions → Create → new role appears in list
  - Log in as Developer → confirm `/settings/roles` is accessible but system roles cannot be deleted

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat(phase-1): complete foundation and RBAC system"
```
