#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║          Key Guard — Dev Server           ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Backend ──────────────────────────────────────
start_backend() {
  cd "$ROOT/backend"

  if [ ! -d ".venv" ]; then
    echo "→ Creating Python virtual environment…"
    python3 -m venv .venv
  fi

  source .venv/bin/activate

  echo "→ Installing backend dependencies…"
  pip install -q -r requirements.txt

  if [ ! -f ".env" ] || [ -z "$(grep -v '^#' .env | grep CREDENTIAL_MASTER_KEY | cut -d= -f2)" ]; then
    echo ""
    echo "⚠️  CREDENTIAL_MASTER_KEY is not set."
    echo "   Generating one now and writing to .env …"
    KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
    JWT=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    sed -i.bak "s|CREDENTIAL_MASTER_KEY=.*|CREDENTIAL_MASTER_KEY=$KEY|" .env
    sed -i.bak "s|JWT_SECRET_KEY=.*|JWT_SECRET_KEY=$JWT|" .env
    rm -f .env.bak
    echo "   ✅  Keys written to backend/.env"
    echo ""
  fi

  echo "→ Starting FastAPI on http://localhost:8000 …"
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
  BACKEND_PID=$!
  echo "   Backend PID: $BACKEND_PID"
}

# ── Frontend ─────────────────────────────────────
start_frontend() {
  cd "$ROOT/frontend"

  if [ ! -d "node_modules" ]; then
    echo "→ Installing frontend dependencies (npm install)…"
    npm install
  fi

  echo "→ Starting Vite dev server on http://localhost:5173 …"
  npm run dev &
  FRONTEND_PID=$!
  echo "   Frontend PID: $FRONTEND_PID"
}

start_backend
start_frontend

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Frontend  →  http://localhost:5173"
echo "  Backend   →  http://localhost:8000"
echo "  API Docs  →  http://localhost:8000/docs"
echo ""
echo "  Default login:"
echo "    Email    admin@keyguard.local"
echo "    Password Admin1234!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo ""

# Wait for either process to exit
wait
