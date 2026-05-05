# Ticket FastAPI Service

FastAPI ticket microservice protected by JWT permissions issued by the core RBAC service.

This service lives at `services/ticket-service/` and keeps its imports under `app.*`.

## Setup

```bash
cp .env.example .env
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --port 9000
```

## Configuration

```text
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/rbac_core
JWT_SECRET_KEY=dev-secret-change-me
JWT_ALGORITHM=HS256
CORE_SERVICE_URL=http://127.0.0.1:8000
SERVICE_API_KEY=dev-service-key
```

## Protected Routes

- `GET /api/v1/tickets` requires `TICKET_LIST_API` + `READ`
- `POST /api/v1/tickets` requires `TICKET_CREATE_API` + `EXECUTE`
- `PUT /api/v1/tickets/{id}` requires `TICKET_UPDATE_API` + `EXECUTE`
- `DELETE /api/v1/tickets/{id}` requires `TICKET_DELETE_API` + `EXECUTE`
