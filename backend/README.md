# Core RBAC FastAPI Backend

FastAPI backend for tenant-scoped RBAC with PostgreSQL, SQLAlchemy 2 async, Alembic, JWT auth, bcrypt passwords, refresh token rotation, and audit logging.

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
uvicorn app.main:app --reload --port 8000
```

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
