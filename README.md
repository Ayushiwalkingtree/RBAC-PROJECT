# RBAC Project

This repository is split into a frontend app and backend services:

- `frontend/` - React, TypeScript, Vite UI
- `services/core-service/` - FastAPI, SQLAlchemy, Alembic RBAC API service

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend development API base URL is configured in `frontend/.env.development`:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/core/api/v1
VITE_WORKFLOW_API_BASE_URL=http://127.0.0.1:8000/workflow/api/v1
```

## Run Core Service

```bash
cd services/core-service
alembic upgrade head
python scripts/seed.py
python -m uvicorn app.main:app --reload --port 3000
```

## Run All Backend Services

Open three terminals from the repository root:

```bash
npm run dev:core
npm run dev:notification
npm run dev:workflow
```

The direct service URLs are:

- Core: `http://127.0.0.1:3000`
- Notification: `http://127.0.0.1:3001`
- Workflow: `http://127.0.0.1:3002`

## Run Kong Gateway

Kong runs through Docker Desktop in DB-less mode and forwards gateway routes to the three local services:

```bash
npm run dev:kong
```

Gateway URLs:

- Core via Kong: `http://127.0.0.1:8000/core`
- Notification via Kong: `http://127.0.0.1:8000/notification`
- Workflow via Kong: `http://127.0.0.1:8000/workflow`
- Kong admin API: `http://127.0.0.1:8001`

Useful checks:

```bash
curl http://127.0.0.1:8000/core/health
curl http://127.0.0.1:8000/notification/api/v1/health
curl http://127.0.0.1:8000/workflow/health
npm run kong:validate
npm run kong:down
```

## API Swagger

After starting the core service, open:

- Core Swagger UI: `http://127.0.0.1:8000/core/docs`
- Notification Swagger UI: `http://127.0.0.1:8000/notification/docs`
- Workflow Swagger UI: `http://127.0.0.1:8000/workflow/docs`

## Root Convenience Scripts

```bash
npm run dev:frontend
npm run build:frontend
npm run lint:frontend
npm run dev:core
npm run dev:notification
npm run dev:workflow
npm run seed:core
npm run dev:kong
```
