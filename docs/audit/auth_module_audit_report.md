# Authentication Module Audit Report

**Audit Type:** Codebase Verification against Technical Specifications
**Target:** `apps/api/src/modules/auth`
**Status:** 🔴 **FAIL**

---

## 1. Folder Structure & Missing Files
**Status: FAIL**

While the core Auth files were created, several critical infrastructure and feature files specified in the Stage 14 Technical Specification were completely missed:
*   **Missing `update-status.dto.ts`:** Used for deactivating staff.
*   **Missing `auth.controller.spec.ts`:** The controller lacks unit tests.
*   **Missing `supabase.service.ts` & `supabase.module.ts`:** `AuthModule` imports `SupabaseModule`, but it does not exist on disk, breaking the build.
*   **Missing `audit-logger.interceptor.ts`:** The audit logging compliance requirement was ignored.

## 2. Missing DTOs & Validation
**Status: FAIL**

*   `InviteUserDto` is present and validates `email`, `firstName`, and `lastName` perfectly.
*   **Vulnerability:** The `roleId` field in `InviteUserDto` uses `@IsString()`. It **must** use `@IsUUID()` to prevent poorly formatted or malicious strings from reaching the database query.
*   The `DeactivateUserDto` (or `UpdateStatusDto`) is completely missing.

## 3. Security Issues
**Status: FAIL**

*   **Rollback Failure (Race Condition):** In `auth.service.ts`, if Supabase successfully creates the user identity and patches the `app_metadata`, but the `prisma.user.create()` fails immediately afterward (e.g., database timeout), the user exists in Supabase with access rights but has no corresponding Prisma record. There is no `try/catch` block wrapping the Prisma call that issues a rollback command to Supabase.
*   **Supabase Service Role Exposure Risk:** Because `SupabaseService` is not fully implemented on disk, the exact handling of the `SERVICE_ROLE_KEY` cannot be audited.

## 4. Production Readiness
**Status: FAIL**

The module is not yet production-ready for the following reasons:
1.  **Broken Imports:** The code will fail to compile (`tsc` error) because `PrismaModule` and `SupabaseModule` are imported but do not exist in the repository.
2.  **Missing Controller Endpoints:** The `PATCH /auth/:id/deactivate` endpoint (which is critical for immediately revoking access from a terminated employee) was not implemented in `auth.controller.ts`.
3.  **No Global Exception Filter:** There is no centralized error handling mapping Supabase/Prisma errors to standard HTTP responses, causing potential leak of database internals.

---

### Recommended Remediation Steps
1. Generate the `supabase` and `prisma` modules to fix imports.
2. Implement `update-status.dto.ts` and the `PATCH /auth/:id/deactivate` endpoint in the controller.
3. Add `@IsUUID()` to `InviteUserDto`.
4. Wrap the `auth.service.ts` Prisma creation block in a `try/catch` that calls `supabase.admin.deleteUser()` if the database write fails.
5. Generate `auth.controller.spec.ts`.
