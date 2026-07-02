# Week 1: Foundation & Architecture

**Goal:** Establish the monorepo, configure the database, implement multi-tenancy, and secure the Identity/Auth boundaries.

## 1. Tasks
*   Initialize Turborepo/Nx monorepo workspace.
*   Setup NestJS backend and Next.js frontend applications.
*   Configure PostgreSQL and apply the Prisma schema.
*   Implement Row-Level Security (RLS) via Prisma Client Extensions.
*   Integrate Supabase/Auth0 for JWT authentication.
*   Setup custom Next.js Middleware for subdomain extraction (`tenantId`).

## 2. Files to Create/Modify
*   `package.json` (Monorepo root)
*   `apps/api/src/main.ts` (NestJS bootstrap)
*   `apps/api/src/common/middleware/tenant.middleware.ts`
*   `apps/api/src/prisma/prisma.service.ts` (RLS injection)
*   `apps/web/middleware.ts` (Next.js subdomain routing)
*   `packages/database/prisma/schema.prisma`

## 3. APIs to Build
*   `POST /auth/login` - Handled primarily by Identity Provider, backend verifies JWT.
*   `POST /tenants` - Internal endpoint to provision a new clinic.
*   `GET /users/me` - Fetch the current `DENTIST` or `STAFF` profile.

## 4. Database Tables Touched
*   `Tenant`
*   `User`
*   `Role`

## 5. Frontend Pages
*   `apps/web/src/app/(auth)/login/page.tsx`
*   `apps/web/src/app/(dashboard)/layout.tsx` (Protected route shell)

## 6. Testing Requirements
*   **Unit:** Verify `tenant.middleware.ts` correctly throws `401` on missing tenant headers.
*   **Integration:** Write a script to ensure User A in Tenant 1 cannot query Users in Tenant 2 via Prisma.
