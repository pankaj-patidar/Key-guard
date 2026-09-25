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
DEVOPS_PERMISSIONS    = TL_PERMISSIONS
