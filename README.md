# Multi-Tenant RBAC SaaS Frontend

Production-style React, TypeScript, Vite, MUI, Zustand, React Router, React Hook Form, and Zod implementation for a multi-tenant RBAC console.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Signup And Verification

Open the app logged out and choose **Create a new organization** from the login page.

Signup collects organization name/code, first admin name/email/password, timezone, and plan. The mock backend validates that `org_code` is globally unique, creates the organization, creates an `ORG_ADMIN` role, creates the first admin user, grants core admin permissions, stores a verification token, and writes `ORG_CREATED`.

After signup the app redirects to **Verify Email** and shows the generated mock token/link. Click **Verify Email** to set `isEmailVerified=true` and write `EMAIL_VERIFIED`. Login rejects unverified, inactive, locked, and invalid credential cases with these mock error codes:

- `EMAIL_NOT_VERIFIED`
- `USER_INACTIVE`
- `ACCOUNT_LOCKED`
- `INVALID_CREDENTIALS`

## Demo Login

Use any profile from `src/mock/data/auth.json`. The same email can exist in multiple organizations because authentication is scoped by `org_code`.

| Persona | Org Code | Email | Password |
| --- | --- | --- | --- |
| Platform Super Admin | `PLATFORM` | `platform.super@platform.com` | `Password@123` |
| Organization Admin | `ACME_BANK` | `admin@acme.com` | `Password@123` |
| Maker | `ACME_BANK` | `maker@acme.com` | `Password@123` |
| Checker | `ACME_BANK` | `checker@acme.com` | `Password@123` |
| Auditor | `ACME_BANK` | `auditor@acme.com` | `Password@123` |

Platform super admin credentials:

```text
Org code: PLATFORM
Email: platform.super@platform.com
Password: Password@123
```

Organization admin credentials:

```text
Org code: ACME_BANK
Email: admin@acme.com
Password: Password@123
```

## Mock RBAC Workflow

The browser seeds `localStorage` from `src/mock/data` on first use. Mutations persist locally until Settings -> Reset Mock Data is clicked.

The normalized mock DB includes:

- `organizations`
- `resources`
- `resourcePermissions`
- `roles`
- `rolePermissions`
- `users`
- `userRoles`
- `refreshTokens`
- `auditLogs`
- `verificationTokens`

Existing local mock data is migrated on read, so older localStorage records continue to open.

Acceptance flow:

1. Open the app logged out.
2. Signup a new organization such as `TEST_ORG`.
3. Verify the admin email on the mock Verify Email page.
4. Login with `TEST_ORG`, the admin email, and password.
5. Create roles and users inside `TEST_ORG`.
6. Verify `TEST_ORG` users only see their own tenant data.
7. Confirm the org admin cannot create/edit/delete Resource Registry resources.
8. Login as `PLATFORM` super admin.
9. Manage global resources from Resource Registry.
10. Open Audit Logs to see signup, email verification, login/logout, user, role, permission, resource, and org settings events.
11. Enter the wrong password 5 times to lock an account for 30 minutes.
12. Logout and confirm the refresh session is revoked.

Role and permission edits refresh the current Zustand auth session when the logged-in user is affected. Otherwise they apply on next login/token refresh.

## Tenant Isolation

Login always requires `org_code + email + password`. The mock backend finds the organization by code and then finds the user by `orgId + email`, so the same email address can exist in different organizations.

Organization admins can manage users, roles, permissions, audit logs, and settings only for their own organization. They cannot create/edit/delete Resource Registry entries. Platform super admin is seeded in the `PLATFORM` organization and can manage global resource definitions.

## Reset Mock DB

Use **Settings -> Reset Mock Data** to clear the localStorage mock DB and reseed from JSON. You can also remove the `rbac.mock.database.v3` localStorage key in browser devtools.

## Architecture

- `src/mock/data`: JSON-backed mock backend
- `src/mock/services/mockDb.service.ts`: localStorage mock database seeded from JSON
- `src/features/auth`: login, signup, email verification, JWT/refresh simulation, auth store, form schemas
- `src/features/*/*.service.ts`: mutation/query services with small async delays
- `src/features/resources`: global resource registry for MENU/API/BUTTON/ACTION/REPORT/DASHBOARD
- `src/features/navPreview`: user navigation and API-access preview
- `src/shared/utils/rbac.ts`: permission engine using `can(resource, action)`
- `src/shared/components`: reusable app buttons, dialogs, confirmations, toasts, role select, permission chips, empty states
- `src/shared/components/guards`: `AuthGuard` and `PermissionGuard`
- `src/shared/components/layout`: tenant-aware application shell and dynamic sidebar
- `src/shared/theme`: persisted `light1`, `light2`, and `dark` themes
- `src/features/*`: dashboard, users, roles, permissions matrix, tickets, reports, audit logs, settings

## Git Workflow

Recommended branch model:

- `main`: stable release branch
- `develop`: integration branch
- `feature/*`: feature work

Commit convention: Conventional Commits, for example `feat: build multi-tenant rbac frontend`.
