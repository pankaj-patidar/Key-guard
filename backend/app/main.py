from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .config import get_settings
from .database import engine, Base, AsyncSessionLocal
from .models import User, UserRole  # noqa: F401 — import all models so Base sees them
from .models.project import Project, ProjectAssignment  # noqa: F401
from .models.credential import Credential, CredentialField  # noqa: F401
from .models.audit import AuditLog  # noqa: F401
from .routers import auth, users, projects, credentials, audit, dashboard
from .security.password import hash_password
from .domains.roles import models as roles_models  # noqa: F401 — registers tables with metadata
from .domains.roles.router import router as roles_router
from .domains.roles.seed import seed_roles_and_permissions
from .domains.tickets import models as tickets_models  # noqa: F401
from .domains.tickets.router import router as tickets_router
from .domains.sprints.router import router as sprints_router
from .domains.epics.router import router as epics_router
from .domains.comments import models as comments_models  # noqa: F401
from .domains.comments.router import router as comments_router
from .domains.attachments import models as attachments_models  # noqa: F401
from .domains.attachments.router import router as attachments_router
from .domains.notifications import models as notifications_models  # noqa: F401
from .domains.notifications.router import router as notifications_router
from .domains.settings import models as settings_models  # noqa: F401
from .domains.settings.router import router as settings_router
from .domains.settings.seed import seed_settings

settings = get_settings()


async def _seed_admin():
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        existing = await db.scalar(select(User).where(User.email == settings.FIRST_ADMIN_EMAIL))
        if not existing:
            admin = User(
                email=settings.FIRST_ADMIN_EMAIL,
                full_name="Administrator",
                hashed_password=hash_password(settings.FIRST_ADMIN_PASSWORD),
                role=UserRole.ADMIN,
            )
            db.add(admin)
            await db.commit()
            print(f"✅  Seeded admin user: {settings.FIRST_ADMIN_EMAIL}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify DB is reachable before doing anything else
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:
        db_url = settings.DATABASE_URL.split("@")[-1]   # hide credentials in log
        print("\n" + "═" * 60)
        print("  ❌  Cannot connect to PostgreSQL")
        print(f"     Host : {db_url}")
        print(f"     Error: {exc}")
        print()
        print("  Quick fix options:")
        print()
        print("  Option A — Docker (no install needed):")
        print("    docker run -d --name keyguard-db \\")
        print("      -e POSTGRES_PASSWORD=password \\")
        print("      -e POSTGRES_DB=keyguard \\")
        print("      -p 5432:5432 postgres:16-alpine")
        print()
        print("  Option B — Homebrew:")
        print("    brew install postgresql@16")
        print("    brew services start postgresql@16")
        print("    createdb keyguard")
        print()
        print("  Then update DATABASE_URL in backend/.env and restart.")
        print("═" * 60 + "\n")
        raise SystemExit(1)

    await _seed_admin()
    async with AsyncSessionLocal() as db:
        await seed_roles_and_permissions(db)
    async with AsyncSessionLocal() as db:
        await seed_settings(db)
    yield
    await engine.dispose()


app = FastAPI(
    title="Key Guard API",
    description="Centralized credential & project management portal",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,        prefix="/api/v1")
app.include_router(users.router,       prefix="/api/v1")
app.include_router(projects.router,    prefix="/api/v1")
app.include_router(credentials.router, prefix="/api/v1")
app.include_router(audit.router,       prefix="/api/v1")
app.include_router(dashboard.router,   prefix="/api/v1")
app.include_router(roles_router,       prefix="/api/v1")
app.include_router(tickets_router)
app.include_router(sprints_router)
app.include_router(epics_router)
app.include_router(comments_router)
app.include_router(attachments_router)
app.include_router(notifications_router)
app.include_router(settings_router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
