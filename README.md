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

| Persona | Org Code | Email | Password |
| --- | --- | --- | --- |
| Platform Super Admin | `PLATFORM` | `super.admin@platform.com` | `Password@123` |
| Organization Admin | `ACME_BANK` | `admin@example.com` | `Password@123` |
| Limited User | `ACME_BANK` | `limited@example.com` | `Password@123` |

## Mock RBAC Workflow

The browser seeds `localStorage` from `src/mock/data` on first use. Mutations persist locally until Settings -> Reset Mock Data is clicked.

Acceptance flow:

1. Login with `ACME_BANK`, `admin@example.com`, `Password@123`.
2. Go to Roles and create role `TEST_MANAGER`.
3. Go to Permissions Matrix, select `TEST_MANAGER`, and grant Dashboard view/read, Tickets view/read/create, Reports view/read, and Users read.
4. Go to Users and create `Test Manager` with `test.manager@acme.com`, `TestPass123!`, and the `TEST_MANAGER` role.
5. Logout and login with `ACME_BANK`, `test.manager@acme.com`, `TestPass123!`.
6. Verify Dashboard, Tickets, Reports, and Users are visible; Roles and Permissions Matrix are hidden; Create Ticket works; User create/delete controls are hidden.

Role and permission edits refresh the current Zustand auth session when the logged-in user is affected.

## Architecture

- `src/mock/data`: JSON-backed mock backend
- `src/mock/services/mockDb.service.ts`: localStorage mock database seeded from JSON
- `src/features/auth`: login, JWT simulation, auth store, form schema
- `src/features/*/*.service.ts`: mutation/query services with small async delays
- `src/shared/utils/rbac.ts`: permission engine using `can(resource, action)`
- `src/shared/components`: reusable app buttons, dialogs, confirmations, toasts, role select, permission chips, empty states
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
