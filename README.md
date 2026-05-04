# RBAC Project

This repository is split into two application folders:

- `frontend/` - React, TypeScript, Vite UI
- `backend/` - FastAPI, SQLAlchemy, Alembic API service

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

## Run Backend

```bash
cd backend
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --reload --port 8000
```

## Root Convenience Scripts

```bash
npm run dev:frontend
npm run build:frontend
npm run lint:frontend
npm run dev:backend
```
