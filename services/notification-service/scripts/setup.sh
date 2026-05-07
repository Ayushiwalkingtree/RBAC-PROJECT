#!/usr/bin/env bash
# =============================================================================
# Notification Service — Setup Script
# Usage: ./scripts/setup.sh
#
# What this does:
#   1. Check PostgreSQL is reachable
#   2. Create the database if it does not already exist
#   3. Run Alembic migrations (creates tables and seeds providers)
#   4. Verify the app imports cleanly
#   5. Start the server with Uvicorn (Swagger at http://localhost:8000/docs)
# =============================================================================
set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${BLUE}[SETUP]${NC} $*"; }
ok()   { echo -e "${GREEN}[  OK ]${NC} $*"; }
warn() { echo -e "${YELLOW}[ WARN]${NC} $*"; }
fail() { echo -e "${RED}[FAIL ]${NC} $*"; exit 1; }

# ── Load .env if present ─────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

if [[ -f .env ]]; then
    log "Loading .env"
    set -a; source .env; set +a
fi

# ── Config with defaults ──────────────────────────────────────────────────────
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-notification_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
HOST="${APP_HOST:-0.0.0.0}"
PORT="${APP_PORT:-8000}"
WORKERS="${APP_WORKERS:-1}"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║      Notification Service — Setup & Start        ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Check Python ──────────────────────────────────────────────────────
log "Checking Python..."
python3 --version &>/dev/null || fail "Python 3 not found"
ok "Python $(python3 --version 2>&1 | cut -d' ' -f2)"

# ── Step 2: Install dependencies ─────────────────────────────────────────────
if [[ -f requirements.txt ]]; then
    log "Installing Python dependencies..."
    pip install -r requirements.txt --quiet 2>&1 | tail -1
    ok "Dependencies installed"
fi

# ── Step 3: Check PostgreSQL connection ───────────────────────────────────────
log "Checking PostgreSQL connection at ${DB_HOST}:${DB_PORT}..."
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c '\q' &>/dev/null; then
    fail "Cannot connect to PostgreSQL at ${DB_HOST}:${DB_PORT} as ${DB_USER}. Check your settings."
fi
ok "PostgreSQL is reachable"

# ── Step 4: Create database if it doesn't exist ───────────────────────────────
log "Checking if database '${DB_NAME}' exists..."
DB_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
    -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null || echo "0")

if [[ "$DB_EXISTS" == "1" ]]; then
    ok "Database '${DB_NAME}' already exists — skipping creation"
else
    log "Creating database '${DB_NAME}'..."
    PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    ok "Database '${DB_NAME}' created"
fi

# ── Step 5: Create schema (Alembic or direct SQLAlchemy) ─────────────────────
log "Creating/verifying database schema..."
if [[ -f migrations/env.py ]] && [[ -d migrations/versions ]]; then
    log "Running Alembic migrations..."
    alembic upgrade head
    ok "Alembic migrations applied"
else
    log "No Alembic migrations found — using AUTO_CREATE_TABLES (SQLAlchemy create_all)"
    warn "For production, set up Alembic migrations in migrations/"
fi

# ── Step 6: Seed SMTP providers ───────────────────────────────────────────────
log "Seeding SMTP provider lookup table..."
python3 - << 'PYEOF'
import asyncio, sys, os
sys.path.insert(0, os.getcwd())

async def seed():
    try:
        from app.core.database import AsyncSessionLocal, engine, Base
        from app.models.models import SmtpProvider
        from sqlalchemy import select

        # Ensure tables exist
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        providers = [
            ("SMTP",       "Standard SMTP server",              "PASSWORD", True),
            ("GMAIL_OAUTH2","Gmail via OAuth2 refresh token",   "OAUTH2",   True),
            ("SENDGRID",   "SendGrid HTTP Mail Send API v3",    "API_KEY",  True),
            ("AWS_SES",    "Amazon Simple Email Service",       "IAM_ROLE", True),
            ("CUSTOM",     "Custom SMTP or API provider",       "PASSWORD", False),
        ]
        async with AsyncSessionLocal() as session:
            for name, desc, auth, tls in providers:
                exists = (await session.execute(
                    select(SmtpProvider).where(SmtpProvider.provider_name == name)
                )).scalar_one_or_none()
                if not exists:
                    session.add(SmtpProvider(
                        provider_name=name, description=desc,
                        auth_type=auth, requires_tls=tls
                    ))
            await session.commit()
        await engine.dispose()
        print("  Providers seeded OK")
    except Exception as e:
        print(f"  Seed warning: {e}")

asyncio.run(seed())
PYEOF
ok "Provider seed complete"

# ── Step 7: Verify app imports ────────────────────────────────────────────────
log "Verifying application imports..."
python3 -c "from app.main import app; print('  App import OK')"
ok "Application verified"

# ── Step 8: Copy .env if missing ─────────────────────────────────────────────
if [[ ! -f .env ]] && [[ -f .env.example ]]; then
    cp .env.example .env
    warn "Copied .env.example → .env  (update with real secrets before production use)"
fi

# ── Step 9: Run tests (optional) ─────────────────────────────────────────────
if [[ "${RUN_TESTS:-false}" == "true" ]]; then
    log "Running test suite..."
    python3 -m pytest tests/ -q --tb=short
    ok "All tests passed"
fi

# ── Step 10: Start the server ─────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Starting Notification Service...${NC}"
echo -e "  ${BLUE}Swagger UI:${NC}  http://${HOST}:${PORT}/docs"
echo -e "  ${BLUE}ReDoc:${NC}       http://${HOST}:${PORT}/redoc"
echo -e "  ${BLUE}OpenAPI JSON:${NC} http://${HOST}:${PORT}/openapi.json"
echo -e "  ${BLUE}Health:${NC}      http://${HOST}:${PORT}/api/v1/health"
echo ""

exec uvicorn app.main:app \
    --host "$HOST" \
    --port "$PORT" \
    --workers "$WORKERS" \
    --reload \
    --log-level info
