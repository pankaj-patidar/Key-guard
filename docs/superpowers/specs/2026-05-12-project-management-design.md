# Project Management Module — Design Spec
**Date:** 2026-05-12
**Project:** Key Guard
**Status:** Approved

---

## Overview

Key Guard is a FastAPI + React/TypeScript credential vault. This spec covers adding a full Project Management module: a ticket system (Epics, Sprints, sub-tickets), a Kanban + list board, a Parking Lot for blocked work, a configurable RBAC system with custom roles, in-app notifications, file attachments, rich text editing, and an Admin settings page.

**Architecture chosen:** Modular Feature Domains — one FastAPI app, one PostgreSQL database, code organized into vertical domain slices under `backend/app/domains/`.

---

## Decisions Made

| Topic | Decision |
|---|---|
| Ticket hierarchy | Option B — Epic (theme) and Sprint (time-box) are orthogonal; a ticket can link to both independently |
| Description format | Rich text via Tiptap (ProseMirror JSON stored in JSONB) |
| Role system | Hybrid — built-in system roles + custom role creation + per-project overrides |
| Hold/Waiting section | Dedicated "Parking Lot" page, separate from the Kanban board |
| Collaboration | Comments (rich text, threaded) + automatic activity log + file attachments |
| Board views | Kanban + List, user-switchable |
| Notifications | In-app only (30-second poll) |
| Architecture | Modular Feature Domains (Approach B) |

---

## Section 1 — Database Schema

### Roles & Permissions

```sql
roles
  id            UUID PRIMARY KEY
  name          VARCHAR(100)
  slug          VARCHAR(100) UNIQUE
  is_system     BOOLEAN               -- true = built-in, cannot delete
  color         VARCHAR(7)            -- hex color for UI badge
  description   TEXT
  created_at    TIMESTAMP

permissions
  id            UUID PRIMARY KEY
  key           VARCHAR(100) UNIQUE   -- e.g. "ticket:create", "sprint:manage"
  description   TEXT
  module        VARCHAR(50)           -- tickets | sprints | epics | roles | projects | attachments

role_permissions
  role_id       FK → roles
  permission_id FK → permissions
  PRIMARY KEY (role_id, permission_id)

user_project_roles
  id            UUID PRIMARY KEY
  user_id       FK → users
  project_id    FK → projects         -- NULL = system-wide role assignment
  role_id       FK → roles
  assigned_by   FK → users
  assigned_at   TIMESTAMP
  UNIQUE (user_id, project_id)
```

### Tickets

```sql
tickets
  id             UUID PRIMARY KEY
  ticket_number  INTEGER               -- sequential per project (e.g. 42 → displayed as KG-42)
  project_id     FK → projects
  title          VARCHAR(500)
  type           ENUM(epic, sprint, bug, task, todo)
  status         ENUM(backlog, todo, in_progress, in_review, on_hold, waiting_for_client, done, cancelled)
  priority       ENUM(critical, high, medium, low)
  description    JSONB                 -- Tiptap/ProseMirror JSON
  epic_id        FK → tickets          -- nullable; links bug/task/todo to an Epic
  sprint_id      FK → tickets          -- nullable; links bug/task/todo to a Sprint
  assignee_id    FK → users            -- nullable
  owner_id       FK → users            -- nullable
  reporter_id    FK → users
  story_points   SMALLINT              -- nullable
  due_date       DATE                  -- nullable
  position       FLOAT8                -- fractional index for ordering within a Kanban column
  is_archived    BOOLEAN DEFAULT false
  created_at     TIMESTAMP
  updated_at     TIMESTAMP

sprint_details                         -- 1:1 extension for Sprint-type tickets only
  ticket_id      FK → tickets PRIMARY KEY
  start_date     DATE
  end_date       DATE
  goal           TEXT
  is_active      BOOLEAN               -- only one active sprint per project allowed

labels
  id             UUID PRIMARY KEY
  project_id     FK → projects
  name           VARCHAR(50)
  color          VARCHAR(7)

ticket_labels
  ticket_id      FK → tickets
  label_id       FK → labels
  PRIMARY KEY (ticket_id, label_id)

project_ticket_counter                 -- one row per project, for sequential ticket IDs
  project_id     FK → projects PRIMARY KEY
  last_number    INTEGER DEFAULT 0
```

**Epic ↔ Sprint independence:** `epic_id` and `sprint_id` on a ticket are fully independent. A bug can belong to Epic "Auth Overhaul" AND Sprint 3 simultaneously — exactly like Jira's model.

### Ticket Watchers

```sql
ticket_watchers
  ticket_id   FK → tickets
  user_id     FK → users
  PRIMARY KEY (ticket_id, user_id)
  -- reporter and assignee are auto-added as watchers on ticket creation
```

### Comments, Activity & Attachments

```sql
ticket_comments
  id          UUID PRIMARY KEY
  ticket_id   FK → tickets
  author_id   FK → users
  content     JSONB                    -- Tiptap JSON (supports @mentions)
  parent_id   FK → ticket_comments    -- nullable; threaded replies
  is_edited   BOOLEAN DEFAULT false
  created_at  TIMESTAMP
  updated_at  TIMESTAMP

ticket_activity                        -- written automatically by service layer, never by the user
  id          UUID PRIMARY KEY
  ticket_id   FK → tickets
  actor_id    FK → users
  action      VARCHAR(60)              -- e.g. "status_changed" | "assignee_changed" | "moved_to_sprint"
  old_value   JSONB
  new_value   JSONB
  created_at  TIMESTAMP

ticket_attachments
  id            UUID PRIMARY KEY
  ticket_id     FK → tickets
  uploaded_by   FK → users
  filename      VARCHAR(255)           -- original name, shown in UI
  file_path     VARCHAR(512)           -- /uploads/{project_id}/{ticket_id}/{uuid}-{filename}
  file_size     BIGINT                 -- bytes
  mime_type     VARCHAR(100)
  created_at    TIMESTAMP
```

### Notifications

```sql
notifications
  id            UUID PRIMARY KEY
  recipient_id  FK → users
  actor_id      FK → users            -- nullable; NULL = system-generated
  type          ENUM(assigned, mentioned, sprint_ending, status_changed, commented, sprint_closed)
  ticket_id     FK → tickets          -- nullable
  project_id    FK → projects         -- nullable
  message       TEXT
  is_read       BOOLEAN DEFAULT false
  created_at    TIMESTAMP
```

### Admin Settings

```sql
system_settings
  key           VARCHAR(100) PRIMARY KEY  -- e.g. "max_upload_size_mb"
  value         TEXT
  value_type    ENUM(string, integer, boolean, json)
  label         VARCHAR(200)
  description   TEXT
  module        VARCHAR(50)               -- general | tickets | sprints | uploads | notifications | access
  is_sensitive  BOOLEAN DEFAULT false
  updated_by    FK → users
  updated_at    TIMESTAMP
```

---

## Section 2 — Backend Architecture

### Folder Structure

```
backend/app/
  core/                              -- refactored from existing flat layout
    database.py
    config.py
    security/
      jwt.py  crypto.py  password.py  dependencies.py

  domains/
    tickets/
      models.py                      -- Ticket, SprintDetail, Label, TicketLabel, ProjectTicketCounter
      schemas.py                     -- TicketCreate, TicketUpdate, TicketOut, TicketDetail
      router.py
      service.py                     -- all business logic
      filters.py                     -- reusable query builders (board, list, parking lot views)

    sprints/
      router.py                      -- activate, close, add/remove tickets
      service.py                     -- sprint lifecycle logic

    epics/
      router.py                      -- epic overview, link/unlink tickets
      service.py

    comments/
      models.py                      -- TicketComment, TicketActivity
      schemas.py
      router.py
      service.py                     -- writes activity log automatically on every ticket mutation

    attachments/
      models.py                      -- TicketAttachment
      router.py                      -- multipart upload, auth-gated download, delete
      service.py                     -- file I/O, path resolution, MIME validation

    roles/
      models.py                      -- Role, Permission, RolePermission, UserProjectRole
      schemas.py
      router.py
      service.py
      permissions.py                 -- all permission key constants in one place
      rbac.py                        -- permission evaluation engine
      seed.py                        -- seeds system roles + permissions at startup

    notifications/
      models.py                      -- Notification
      schemas.py
      router.py                      -- list, mark-read, mark-all-read, unread-count
      service.py                     -- called by other services, never by routers directly

    settings/
      models.py                      -- SystemSetting
      schemas.py                     -- SettingOut, SettingUpdate
      router.py                      -- GET/PATCH /admin/settings, GET /settings/public
      service.py                     -- get_setting(key), update_setting(key, value)
      cache.py                       -- in-memory TTL cache (60s), invalidated on write
      seed.py                        -- inserts defaults on first startup

  routers/                           -- existing (auth, users, credentials, projects, audit)
  models/                            -- existing
  schemas/                           -- existing
  services/                          -- existing
  main.py                            -- registers all domain routers
```

### API Routes

```
-- Tickets
GET  POST   /api/v1/projects/{project_id}/tickets
GET  PATCH  DELETE  /api/v1/projects/{project_id}/tickets/{id}
GET  POST   /api/v1/projects/{project_id}/tickets/{id}/comments
GET         /api/v1/projects/{project_id}/tickets/{id}/activity
POST DELETE /api/v1/projects/{project_id}/tickets/{id}/attachments
POST DELETE /api/v1/projects/{project_id}/tickets/{id}/watchers

-- Board & special views
GET  /api/v1/projects/{project_id}/board          -- all Kanban columns in one call
GET  /api/v1/projects/{project_id}/parking-lot    -- on_hold + waiting_for_client tickets
GET  /api/v1/projects/{project_id}/backlog        -- tickets not in any sprint

-- Sprints
GET  POST        /api/v1/projects/{project_id}/sprints
GET  PATCH DELETE /api/v1/projects/{project_id}/sprints/{id}
POST             /api/v1/projects/{project_id}/sprints/{id}/activate
POST             /api/v1/projects/{project_id}/sprints/{id}/close
POST DELETE      /api/v1/projects/{project_id}/sprints/{id}/tickets

-- Epics
GET  POST        /api/v1/projects/{project_id}/epics
GET  PATCH DELETE /api/v1/projects/{project_id}/epics/{id}
GET              /api/v1/projects/{project_id}/epics/{id}/tickets

-- Labels
GET  POST  PATCH  DELETE  /api/v1/projects/{project_id}/labels

-- Roles
GET  POST        /api/v1/roles
GET  PATCH DELETE /api/v1/roles/{id}
GET  PUT         /api/v1/roles/{id}/permissions
PUT              /api/v1/projects/{project_id}/members/{user_id}/role

-- Permissions (for current user in a project)
GET  /api/v1/projects/{project_id}/my-permissions

-- Notifications
GET  /api/v1/notifications
GET  /api/v1/notifications/unread-count
PATCH /api/v1/notifications/{id}/read
POST  /api/v1/notifications/read-all

-- Attachments
GET  DELETE  /api/v1/attachments/{id}

-- Settings
GET   /api/v1/settings/public                     -- non-sensitive UI config, no auth required
GET   /api/v1/admin/settings                      -- full list, admin only
PATCH /api/v1/admin/settings/{key}                -- update one setting
POST  /api/v1/admin/settings/reset-defaults       -- reset module to defaults
```

### RBAC Evaluation Engine (`roles/rbac.py`)

```python
async def require_permission(
    permission: str,          # e.g. "ticket:create"
    project_id: UUID | None,  # None = system-level check
    user: User,
    db: AsyncSession,
) -> None:
    """Raises HTTP 403 if user lacks permission. Used as a FastAPI dependency."""
```

**Resolution order:**
1. If `user.role == "admin"` (system Admin) → always allow, skip all checks
2. Check `user_project_roles` for a project-level role override → get that role's permissions
3. If no project override, fall back to `user.role` (system-wide role)
4. Check if the resolved role has the required permission key in `role_permissions`
5. Raise `HTTP 403` if not

All permission logic lives here. No router ever does its own `if user.role == "admin"` checks.

### Activity Auto-Tracking Pattern

Every mutating operation in service layer calls `comments/service.py::record_activity()` automatically. Routers never call it directly:

```python
# Example from tickets/service.py
async def update_status(ticket, new_status, actor, db):
    old_status = ticket.status
    ticket.status = new_status
    await db.commit()
    await activity_service.record(
        ticket.id, actor.id, "status_changed",
        {"status": old_status}, {"status": new_status}, db
    )
    await notification_service.notify_watchers(ticket, actor, "status_changed", db)
```

### File Upload Security

- MIME type read from file content (not extension) using `python-magic`
- Size limit enforced before writing: configurable `max_upload_size_mb` setting
- Filename on disk: `{uuid4}-{sanitized_original_name}` — prevents path traversal
- Original filename preserved in DB for display only
- Every download checks project membership before streaming

---

## Section 3 — Role & Permission System

### Built-in System Roles (is_system = true, seeded at startup)

| Role | Slug | Purpose |
|---|---|---|
| Admin | `admin` | Full system access, manages roles, users, all projects |
| Project Manager | `pm` | Manages projects, sprints, epics, assigns members |
| Tech Lead | `tl` | Manages sprints, assigns tickets, creates epics |
| Developer | `developer` | Creates and works sub-tickets within assigned sprints |
| Tester | `tester` | Creates bug tickets, updates status of assigned tickets |
| Viewer | `viewer` | Read-only across everything they are a member of |

System roles cannot be deleted. Their permission sets can be edited by Admin, except Admin's own set is locked.

### Permission Keys

```
-- Projects
project:create          project:edit            project:delete
project:manage_members  project:view_all

-- Tickets
ticket:create_epic      ticket:create_sprint
ticket:create_sub       ticket:edit             ticket:edit_own
ticket:delete           ticket:assign           ticket:change_status
ticket:move_sprint      ticket:archive

-- Sprints
sprint:create           sprint:activate         sprint:close
sprint:edit             sprint:delete

-- Epics
epic:create             epic:edit               epic:delete

-- Roles
role:create             role:edit               role:delete
role:assign_system      role:assign_project

-- Attachments
attachment:upload       attachment:delete_own   attachment:delete_any

-- Notifications
notification:view
```

### Default Permission Matrix

| Permission | Admin | PM | TL | Developer | Tester | Viewer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `ticket:create_epic` | ✓ | ✓ | ✓ | | | |
| `ticket:create_sprint` | ✓ | ✓ | ✓ | | | |
| `ticket:create_sub` | ✓ | ✓ | ✓ | ✓ | ✓ | |
| `ticket:edit` | ✓ | ✓ | ✓ | | | |
| `ticket:edit_own` | ✓ | ✓ | ✓ | ✓ | ✓ | |
| `ticket:assign` | ✓ | ✓ | ✓ | | | |
| `ticket:change_status` | ✓ | ✓ | ✓ | ✓ | ✓ | |
| `sprint:create` | ✓ | ✓ | ✓ | | | |
| `sprint:activate` | ✓ | ✓ | ✓ | | | |
| `sprint:close` | ✓ | ✓ | ✓ | | | |
| `role:create` | ✓ | | | | | |
| `role:assign_project` | ✓ | ✓ | | | | |
| `project:manage_members` | ✓ | ✓ | | | | |
| `attachment:upload` | ✓ | ✓ | ✓ | ✓ | ✓ | |
| `attachment:delete_any` | ✓ | ✓ | | | | |

### Custom Role Creation

Any user with `role:create` (Admin by default) can:
1. Create a role with name, slug (auto-generated), color, description
2. Select any combination of permission keys
3. Assign system-wide or scoped to a specific project

Custom roles (`is_system = false`) are identical to built-in roles in the RBAC engine — only difference is they can be deleted.

### Per-Project Role Override

Inside each project's Members tab, any user with `role:assign_project` can set a project-specific role for a member. A dropdown shows "Use system role" (default) or any available role. Stored in `user_project_roles` with `project_id` set.

---

## Section 4 — Frontend Architecture

### New Dependencies

```
@tiptap/react                  -- rich text editor core
@tiptap/starter-kit            -- bold, italic, lists, code blocks, headings
@tiptap/extension-mention      -- @user mentions in descriptions and comments
@tiptap/extension-placeholder  -- placeholder text in empty editor
@dnd-kit/core                  -- drag-and-drop for Kanban board
@dnd-kit/sortable              -- sortable lists within columns
@dnd-kit/utilities             -- helpers for drag sensors
```

No UI kit added. Everything stays in TailwindCSS + Framer Motion for consistency.

### Folder Structure

```
frontend/src/
  pages/
    ProjectManagement/
      BoardPage.tsx            -- Kanban view (default on project open)
      ListPage.tsx             -- Table/list view
      BacklogPage.tsx          -- Tickets not assigned to any sprint
      ParkingLotPage.tsx       -- on_hold + waiting_for_client tickets
      EpicsPage.tsx            -- Epic overview with progress bars
    Settings/
      SystemSettingsPage.tsx   -- Tabbed admin settings
      RolesPage.tsx            -- Role list (Admin only)
      RoleDetailPage.tsx       -- Permission matrix editor

  components/
    tickets/
      TicketCard.tsx           -- Kanban card
      TicketRow.tsx            -- List view row
      TicketDetailDrawer.tsx   -- Right-side drawer for full ticket detail
      TicketForm.tsx           -- Create/edit modal
      TicketStatusBadge.tsx
      TicketPriorityBadge.tsx
      TicketTypeIcon.tsx       -- icon per type: epic/sprint/bug/task/todo

    board/
      KanbanBoard.tsx          -- dnd-kit drop context, renders all columns
      KanbanColumn.tsx         -- single status column, drop target
      KanbanCard.tsx           -- draggable wrapper around TicketCard

    sprints/
      SprintHeader.tsx         -- name, date range, progress bar, activate/close buttons
      SprintSelector.tsx       -- dropdown to link ticket to sprint
      SprintForm.tsx

    epics/
      EpicProgressBar.tsx      -- visual completion percentage
      EpicSelector.tsx         -- dropdown to link ticket to epic
      EpicForm.tsx

    editor/
      RichTextEditor.tsx       -- Tiptap instance, reused for description AND comments
      RichTextViewer.tsx       -- read-only render of ProseMirror JSON

    comments/
      CommentThread.tsx        -- comments and activity entries interleaved chronologically
      CommentItem.tsx
      ActivityItem.tsx         -- "Pankaj moved this to Sprint 3"

    attachments/
      AttachmentList.tsx
      AttachmentUpload.tsx     -- drag-drop file zone + uploaded file list

    notifications/
      NotificationBell.tsx     -- header icon with animated unread badge
      NotificationPanel.tsx    -- slide-down panel, grouped by today/earlier

    roles/
      RoleCard.tsx
      PermissionMatrix.tsx     -- grouped checklist by module
      RoleForm.tsx

    settings/
      tabs/
        GeneralSettingsTab.tsx
        TicketSettingsTab.tsx
        SprintSettingsTab.tsx
        UploadSettingsTab.tsx
        NotificationSettingsTab.tsx
        AccessControlTab.tsx

    shared/                    -- extend existing shared components:
      PriorityIcon.tsx
      UserAvatar.tsx
      DateRangePicker.tsx
      StoryPointsBadge.tsx
      TagInput.tsx             -- for comma-separated setting values

  hooks/
    useTickets.ts
    useSprints.ts
    useEpics.ts
    useBoard.ts                -- fetches /board, manages column state
    useComments.ts
    useActivity.ts
    useAttachments.ts
    useNotifications.ts        -- polls /unread-count every 30s via refetchInterval
    useRoles.ts
    usePermissions.ts          -- resolves what current user can do in a project
    useSystemSettings.ts       -- admin: fetch + PATCH settings
    usePublicSettings.ts       -- non-admin: reads /settings/public

  store/
    notificationStore.ts       -- unread count, panel open/close state
    boardStore.ts              -- optimistic drag state before server confirmation
    settingsStore.ts           -- public settings loaded at app startup
```

### Routes

```
/projects/:slug/board                   -- default PM view
/projects/:slug/list                    -- list/table view
/projects/:slug/backlog                 -- backlog
/projects/:slug/parking-lot             -- hold & waiting
/projects/:slug/epics                   -- epic overview
/projects/:slug/sprints/:sprintId       -- specific sprint board
/projects/:slug/tickets/:ticketNumber   -- deep link (opens drawer, keeps board visible)

/settings/roles                         -- role list (Admin only)
/settings/roles/:roleId                 -- permission editor
/settings/system                        -- admin settings page (Admin only)
```

Ticket detail always opens as a **right-side drawer** over the current view. The URL updates to `.../tickets/KG-42` for deep linking and browser-back support.

### Kanban Board

```
Columns (fixed order): Backlog → Todo → In Progress → In Review → Done
Parking Lot: separate page, NOT a Kanban column
```

Drag-and-drop uses optimistic updates via `boardStore`. On server rejection (e.g. 403), the card snaps back with a toast error.

### `usePermissions` Hook

```typescript
const { can } = usePermissions(projectId)
can('sprint:create')   // → boolean
can('ticket:assign')   // → boolean
```

Reads from a single cached call to `GET /api/v1/projects/{id}/my-permissions` (server-authoritative, computed by RBAC engine). Never computed client-side.

### UI Design Principles

- **Priority color strips** — left border on Kanban cards: red (critical), orange (high), blue (medium), grey (low)
- **Type icons** — distinct colored icons per ticket type
- **Sprint progress bar** — thin gradient bar on sprint header showing % done + days remaining
- **Status badges** — pill-shaped with background color
- **Smooth animations** — Framer Motion for drawer open/close, card drag, notification panel, column drop highlight
- **Avatar stacks** — assignee + reporter as overlapping circular avatars on cards
- **Notification bell** — animated pulse badge on new notifications
- **Settings fields** — save on blur with inline success checkmark (Linear-style, no global Save button)

---

## Section 5 — Key Engineering Decisions

### Ticket Numbering

Uses a locked row update inside the same transaction as the ticket insert:

```sql
UPDATE project_ticket_counter
SET last_number = last_number + 1
WHERE project_id = :project_id
RETURNING last_number;
```

Concurrent-safe, no gaps, no separate DB sequence. Display format: `{PROJECT_SLUG}-{ticket_number}` e.g. `KG-42`. Stored as integer, formatted in frontend.

### Fractional Indexing for Card Ordering

Position column is `FLOAT8`. Dropping card between positions `a` and `b` → new position = `(a + b) / 2`. Only one row updated per drag. Edge cases:
- Top of column: `position = first.position / 2`
- Bottom: `position = last.position + 1.0`
- Float precision exhausted after many moves: background rebalance renumbers column cleanly

### Sprint Constraint — One Active Sprint Per Project

Enforced in `sprints/service.py`:
- `activate` → reject with `409 Conflict` if another sprint is already active
- `close` → auto-moves all non-`done` tickets to `backlog`, sets `sprint_id = null`, records activity on each

### Notification Polling

`GET /api/v1/notifications/unread-count` polled every 30 seconds via TanStack Query `refetchInterval`. Returns a single integer — one indexed DB read. Full list fetched only when bell is clicked.

### Alembic Migration Order

```
0001_core_initial.py           -- existing tables (no change)
0002_roles_permissions.py      -- roles domain
0003_tickets_sprints_epics.py  -- tickets domain
0004_comments_activity.py      -- comments domain
0005_attachments.py            -- attachments domain
0006_notifications.py          -- notifications domain
0007_system_settings.py        -- settings domain
```

### Testing Strategy

- **Backend** — `pytest` + async test database (real PostgreSQL, separate schema, reset between runs). No mocks for DB layer.
- **RBAC** — dedicated test matrix: every permission key × every built-in role, both allowed and denied
- **Frontend** — React Testing Library for critical interaction flows
- **E2E** — Playwright for golden paths: create project → sprint → ticket → assign → drag board → close sprint

---

## Section 6 — Admin Settings Page

### Configurable Settings

**General**
| Key | Label | Default |
|---|---|---|
| `app_name` | Application Name | `Key Guard` |
| `app_logo_url` | Logo URL | `` |
| `default_timezone` | Default Timezone | `UTC` |

**Tickets**
| Key | Label | Default |
|---|---|---|
| `ticket_id_prefix_mode` | Ticket ID Prefix | `project_slug` |
| `default_ticket_priority` | Default Priority | `medium` |
| `story_points_enabled` | Enable Story Points | `true` |
| `story_points_scale` | Story Points Scale | `1,2,3,5,8,13,21` |
| `allow_viewers_to_comment` | Allow Viewers to Comment | `false` |

**Sprints**
| Key | Label | Default |
|---|---|---|
| `default_sprint_duration_days` | Default Sprint Duration (days) | `14` |
| `sprint_naming_pattern` | Sprint Naming Pattern | `Sprint {n}` |
| `auto_move_incomplete_on_close` | Auto-move incomplete tickets on sprint close | `true` |

**Uploads**
| Key | Label | Default |
|---|---|---|
| `max_upload_size_mb` | Max File Upload Size (MB) | `25` |
| `allowed_mime_types` | Allowed File Types | `image/*,application/pdf,text/*,application/zip` |

**Notifications**
| Key | Label | Default |
|---|---|---|
| `notification_retention_days` | Keep notifications for (days) | `90` |
| `notify_on_assignment` | Notify on ticket assignment | `true` |
| `notify_on_mention` | Notify on @mention | `true` |
| `notify_on_sprint_end_days` | Notify X days before sprint ends | `2` |

**Access Control**
| Key | Label | Default |
|---|---|---|
| `who_can_create_project` | Who can create projects | `admin,pm` |
| `default_project_member_role` | Default role for new project members | `developer` |
| `allow_self_assign` | Allow users to self-assign tickets | `true` |

### Settings Cache

Settings are cached in memory with a 60-second TTL. Writing a setting invalidates the cache immediately. App reads settings on each request from cache — no restart needed.

### Public Settings Endpoint

`GET /api/v1/settings/public` (no auth required) returns only non-sensitive, UI-relevant keys. Loaded once at app startup into `settingsStore`. Components read from the store to conditionally show/hide UI (e.g. story points field hidden when `story_points_enabled = false`).

### Settings UI

Route: `/settings/system` — Admin only, linked from sidebar settings section.

Layout: tabbed (General | Tickets | Sprints | Uploads | Notifications | Access Control).

Field types per value:
- String → text input
- Integer → number input with min/max
- Boolean → toggle switch
- Comma-separated list → tag input
- Enum → dropdown

Each field saves on blur with an inline success checkmark. "Reset to Defaults" button per tab with confirmation dialog.

---

## Out of Scope (Future Iterations)

- Email notifications (SMTP delivery)
- WebSocket real-time updates
- S3/cloud file storage (local filesystem for MVP)
- Gantt chart view
- Time tracking / time-logged per ticket
- GitHub/GitLab integration (link commits to tickets)
- Two-factor authentication
- Mobile app
