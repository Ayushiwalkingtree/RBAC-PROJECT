# RBAC Project

This repository is split into a frontend app and backend services:

- `frontend/` - React, TypeScript, Vite UI
- `services/core-service/` - FastAPI, SQLAlchemy, Alembic RBAC API service
- `services/ticket-service/` - FastAPI ticket microservice protected by core RBAC JWT permissions

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend development API base URL is configured in `frontend/.env.development`:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

## Run Core Service

```bash
cd services/core-service
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --reload --port 8000
```

## Run Ticket Service

```bash
cd services/ticket-service
uvicorn app.main:app --reload --port 9000
```

## Root Convenience Scripts

```bash
npm run dev:frontend
npm run build:frontend
npm run lint:frontend
npm run dev:core
npm run dev:ticket
npm run seed:core
```
