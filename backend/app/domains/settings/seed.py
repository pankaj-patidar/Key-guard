from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.domains.settings.models import SystemSetting

DEFAULTS: list[dict] = [
    # General
    {"key": "app_name",                      "value": "Key Guard",                             "value_type": "string",  "label": "Application Name",              "description": "Displayed in the browser tab and header",                "module": "general",       "is_sensitive": False},
    {"key": "app_logo_url",                  "value": "",                                      "value_type": "string",  "label": "Logo URL",                       "description": "URL to a custom logo image",                             "module": "general",       "is_sensitive": False},
    {"key": "default_timezone",              "value": "UTC",                                   "value_type": "string",  "label": "Default Timezone",               "description": "Used for date display across the app",                   "module": "general",       "is_sensitive": False},
    # Tickets
    {"key": "default_ticket_priority",       "value": "medium",                                "value_type": "string",  "label": "Default Priority",               "description": "Priority assigned to new tickets by default",            "module": "tickets",       "is_sensitive": False},
    {"key": "story_points_enabled",          "value": "true",                                  "value_type": "boolean", "label": "Enable Story Points",            "description": "Show story points field on tickets",                     "module": "tickets",       "is_sensitive": False},
    {"key": "story_points_scale",            "value": "1,2,3,5,8,13,21",                      "value_type": "string",  "label": "Story Points Scale",             "description": "Comma-separated allowed values",                         "module": "tickets",       "is_sensitive": False},
    {"key": "allow_viewers_to_comment",      "value": "false",                                 "value_type": "boolean", "label": "Allow Viewers to Comment",       "description": "Let viewer-role users post comments",                    "module": "tickets",       "is_sensitive": False},
    # Sprints
    {"key": "default_sprint_duration_days",  "value": "14",                                    "value_type": "integer", "label": "Default Sprint Duration (days)", "description": "Pre-filled end date when creating a sprint",             "module": "sprints",       "is_sensitive": False},
    {"key": "sprint_naming_pattern",         "value": "Sprint {n}",                            "value_type": "string",  "label": "Sprint Naming Pattern",          "description": "Auto-generated name template. {n} = sprint number",     "module": "sprints",       "is_sensitive": False},
    {"key": "auto_move_incomplete_on_close", "value": "true",                                  "value_type": "boolean", "label": "Auto-move incomplete on close",  "description": "Move unfinished tickets to backlog when sprint closes",   "module": "sprints",       "is_sensitive": False},
    # Uploads
    {"key": "max_upload_size_mb",            "value": "25",                                    "value_type": "integer", "label": "Max Upload Size (MB)",           "description": "Maximum file size for ticket attachments",               "module": "uploads",       "is_sensitive": False},
    {"key": "allowed_mime_types",            "value": "image/*,application/pdf,text/*,application/zip", "value_type": "string", "label": "Allowed File Types",  "description": "Comma-separated MIME type prefixes",                    "module": "uploads",       "is_sensitive": False},
    # Notifications
    {"key": "notification_retention_days",   "value": "90",                                    "value_type": "integer", "label": "Notification Retention (days)",  "description": "Delete read notifications older than this",              "module": "notifications", "is_sensitive": False},
    {"key": "notify_on_assignment",          "value": "true",                                  "value_type": "boolean", "label": "Notify on assignment",           "description": "Send notification when a ticket is assigned",            "module": "notifications", "is_sensitive": False},
    {"key": "notify_on_mention",             "value": "true",                                  "value_type": "boolean", "label": "Notify on @mention",             "description": "Send notification when mentioned in a comment",          "module": "notifications", "is_sensitive": False},
    {"key": "notify_on_sprint_end_days",     "value": "2",                                     "value_type": "integer", "label": "Sprint end warning (days)",       "description": "Notify team X days before sprint ends",                  "module": "notifications", "is_sensitive": False},
    # Access
    {"key": "who_can_create_project",        "value": "admin,pm",                              "value_type": "string",  "label": "Who can create projects",        "description": "Comma-separated role slugs allowed to create projects",  "module": "access",        "is_sensitive": False},
    {"key": "default_project_member_role",   "value": "developer",                             "value_type": "string",  "label": "Default member role",            "description": "Role assigned to new project members by default",        "module": "access",        "is_sensitive": False},
    {"key": "allow_self_assign",             "value": "true",                                  "value_type": "boolean", "label": "Allow self-assignment",          "description": "Let users assign tickets to themselves",                 "module": "access",        "is_sensitive": False},
]


async def seed_settings(db: AsyncSession) -> None:
    """Idempotent — inserts only missing settings, never overwrites existing values."""
    for s in DEFAULTS:
        result = await db.execute(select(SystemSetting).where(SystemSetting.key == s["key"]))
        if not result.scalar_one_or_none():
            db.add(SystemSetting(**s))
    await db.commit()
