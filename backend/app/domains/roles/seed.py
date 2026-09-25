from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.domains.roles.models import Role, Permission, role_permissions_table
from app.domains.roles.permissions import (
    ALL_PERMISSIONS, ADMIN_PERMISSIONS, PM_PERMISSIONS, TL_PERMISSIONS,
    DEVELOPER_PERMISSIONS, TESTER_PERMISSIONS, VIEWER_PERMISSIONS, DEVOPS_PERMISSIONS,
)

SYSTEM_ROLES = [
    {"name": "Admin",           "slug": "admin",     "color": "#ef4444", "description": "Full system access",             "perms": ADMIN_PERMISSIONS},
    {"name": "Project Manager", "slug": "pm",        "color": "#8b5cf6", "description": "Manages projects and sprints",   "perms": PM_PERMISSIONS},
    {"name": "Tech Lead",       "slug": "tl",        "color": "#3b82f6", "description": "Technical leadership",           "perms": TL_PERMISSIONS},
    {"name": "Developer",       "slug": "developer", "color": "#10b981", "description": "Builds features",                "perms": DEVELOPER_PERMISSIONS},
    {"name": "Tester",          "slug": "tester",    "color": "#f59e0b", "description": "QA and bug reporting",           "perms": TESTER_PERMISSIONS},
    {"name": "Viewer",          "slug": "viewer",    "color": "#6b7280", "description": "Read-only access",               "perms": VIEWER_PERMISSIONS},
    {"name": "DevOps",          "slug": "devops",    "color": "#06b6d4", "description": "Infrastructure and deployment",  "perms": DEVOPS_PERMISSIONS},
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
