# Notification Service

JWT-scoped multi-tenant email notification microservice.

## Quick Start

```bash
# 1. Copy and edit config
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 2. Run setup (creates DB, schema, seeds data, starts server)
bash scripts/setup.sh

# 3. Open Swagger UI
open http://localhost:3001/docs
```

## Manual Start

```bash
# Install dependencies
pip install -r requirements.txt

# Start dev server
uvicorn app.main:app --reload --port 3001
```

## Testing

```bash
# All tests (unit + integration)
python3 -m pytest tests/ -v

# Unit tests only (no DB required)
python3 -m pytest tests/unit/ -v

# Integration tests (uses in-memory SQLite)
python3 -m pytest tests/integration/ -v
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Liveness probe |
| GET | `/api/v1/email-configs` | List SMTP configs |
| POST | `/api/v1/email-configs` | Create SMTP config |
| GET | `/api/v1/email-templates` | List templates |
| POST | `/api/v1/email-templates` | Create template |
| POST | `/api/v1/email-templates/{id}/preview` | Preview render |
| GET | `/api/v1/email-links` | List entity links |
| POST | `/api/v1/email-links` | Create entity link |
| POST | `/api/v1/emails/send` | Send template email |
| POST | `/api/v1/emails/send-raw` | Send raw email |
| GET | `/api/v1/emails/jobs` | List send log |
| POST | `/api/v1/emails/jobs/{id}/requeue` | Re-queue failed job |

## Authentication

All endpoints require a **Bearer JWT** with `org` and `sub` claims:

```bash
curl -H "Authorization: Bearer <your-jwt>" \
     http://localhost:8000/notification/api/v1/email-configs
```

Or inject Kong headers directly (dev mode):

```bash
curl -H "X-Org-Id: 1" -H "X-User-Id: 42" \
     http://localhost:8000/notification/api/v1/email-configs
```

## Project Structure

```
app/
├── main.py                    # FastAPI app
├── api/v1/endpoints/          # Route handlers
├── core/                      # Config, DB, security, logging
├── models/models.py           # SQLAlchemy ORM (8 tables)
├── schemas/schemas.py         # Pydantic v2 schemas
├── repositories/              # Async DB layer (always org-scoped)
├── services/send_service.py   # Send business logic
└── template_engine/renderer.py# Jinja2 sandbox + filters
tests/
├── unit/                      # 62 unit tests (no DB)
└── integration/               # 36 integration tests (SQLite)
```
