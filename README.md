# Multi-Tenant RBAC SaaS Frontend

Production-style React, TypeScript, Vite, MUI, Zustand, React Router, React Hook Form, and Zod implementation for a multi-tenant RBAC console.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Demo Login

Use any profile from `src/mock/data/auth.json`. The same email can exist in multiple organizations because authentication is scoped by `org_code`.

## Architecture

- `src/mock/data`: JSON-backed mock backend
- `src/features/auth`: login, JWT simulation, auth store, form schema
- `src/shared/utils/rbac.ts`: permission engine using `can(resource, action)`
- `src/shared/components/guards`: `AuthGuard` and `PermissionGuard`
- `src/shared/components/layout`: tenant-aware application shell and dynamic sidebar
- `src/shared/theme`: persisted `light1`, `light2`, and `dark` themes
- `src/features/*`: dashboard, users, roles, permissions matrix, tickets, reports, settings

## Git Workflow

Recommended branch model:

- `main`: stable release branch
- `develop`: integration branch
- `feature/*`: feature work

Commit convention: Conventional Commits, for example `feat: build multi-tenant rbac frontend`.
