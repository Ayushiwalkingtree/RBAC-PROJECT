# Core RBAC FastAPI Service

FastAPI core service for tenant-scoped RBAC with PostgreSQL, SQLAlchemy 2 async, Alembic, JWT auth, bcrypt passwords, refresh token rotation, and audit logging.

This service lives at `services/core-service/` and should be run from that directory so Alembic and seed paths resolve correctly.

## Setup

1. Create PostgreSQL database:

```bash
createdb rbac_core
```

2. Copy environment file:

```bash
cp .env.example .env
```

3. Install dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
```

4. Run migrations:

```bash
alembic upgrade head
```

5. Seed data:

```bash
python scripts/seed.py
```

6. Start server:

```bash
python -m uvicorn app.main:app --reload --port 3000
```

## API Swagger

With the server running, all core-service API docs are available at:

- Direct Swagger UI: `http://127.0.0.1:3000/docs`
- Direct OpenAPI JSON: `http://127.0.0.1:3000/openapi.json`
- Kong Swagger UI: `http://127.0.0.1:8000/core/docs`

## Developer Commands

```bash
alembic revision --autogenerate -m "change description"
alembic upgrade head
python scripts/seed.py
pytest
ruff check .
mypy app
```

## Test Credentials

Platform super admin:

- Org code: `PLATFORM`
- Email: `platform.super@platform.com`
- Password: `SecurePass123!`

ACME organization admin:

- Org code: `ACME_BANK`
- Email: `admin@acme.com`
- Password: `SecurePass123!`

Sample users use password `SecurePass123!`: `maker@acme.com`, `checker@acme.com`, `auditor@acme.com`.

## Response Envelope

All routes return:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "request_id": "...",
    "timestamp": "..."
  }
}
```
