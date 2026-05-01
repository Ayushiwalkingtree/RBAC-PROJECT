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
| Platform Super Admin | `PLATFORM` | `platform.super@platform.com` | `Password@123` |
| Organization Admin | `ACME_BANK` | `admin@acme.com` | `Password@123` |
| Maker | `ACME_BANK` | `maker@acme.com` | `Password@123` |
| Checker | `ACME_BANK` | `checker@acme.com` | `Password@123` |
| Auditor | `ACME_BANK` | `auditor@acme.com` | `Password@123` |

## Mock RBAC Workflow

The browser seeds `localStorage` from `src/mock/data` on first use. Mutations persist locally until Settings -> Reset Mock Data is clicked.

Acceptance flow:

1. Login as `PLATFORM` / `platform.super@platform.com`.
2. Go to Resource Registry and create `TICKET_MENU` with `VIEW`, `CREATE`, `READ`, `UPDATE`, `DELETE`.
3. Create API resources `TICKET_LIST_API`, `TICKET_CREATE_API`, `TICKET_UPDATE_API`, and `TICKET_DELETE_API`.
4. Logout, then login as `ACME_BANK` / `admin@acme.com`.
5. Go to Roles and create role `TICKET_MANAGER`.
6. Go to Permission Matrix and grant `TICKET_MENU` `VIEW`, `CREATE`, `READ`; `TICKET_LIST_API` `READ`; `TICKET_CREATE_API` `EXECUTE`; `DASH_MENU` `VIEW`; `DASH_MAIN` `VIEW`.
7. Go to Users and create `ticket.manager@acme.com` with `TestPass123!` and role `TICKET_MANAGER`.
8. Login as the new user and verify Dashboard and Tickets are visible while Users, Roles, Permission Matrix, and Resource Registry are hidden. Create Ticket is visible; edit/delete ticket controls are hidden.

Role and permission edits refresh the current Zustand auth session when the logged-in user is affected.

## Architecture

- `src/mock/data`: JSON-backed mock backend
- `src/mock/services/mockDb.service.ts`: localStorage mock database seeded from JSON
- `src/features/auth`: login, JWT simulation, auth store, form schema
- `src/features/*/*.service.ts`: mutation/query services with small async delays
- `src/features/resources`: global resource registry for MENU/API/BUTTON/ACTION/REPORT/DASHBOARD
- `src/features/navPreview`: user navigation and API-access preview
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
