# STAGE 14 — Authentication Technical Specification

**Subject:** Architectural file specifications for the Authentication Module.
**Constraint:** No implementation code. Declarative specifications only.

---

## 1. Folder Structure Specification

The module is broken down into Domain-Driven boundaries inside the NestJS `apps/api/src/` directory.

```text
src/
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── require-permissions.decorator.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── permissions.guard.ts
│   │   └── tenant-status.guard.ts
│   ├── interceptors/
│   │   └── audit-logger.interceptor.ts
│   └── middleware/
│       └── tenant-context.middleware.ts
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── dto/
│   │   │   ├── invite-user.dto.ts
│   │   │   └── update-status.dto.ts
│   │   └── strategies/
│   │       └── jwt.strategy.ts
│   └── supabase/
│       ├── supabase.service.ts
│       └── supabase.module.ts
```

---

## 2. File Specifications

### 2.1. Prisma Models (`schema.prisma`)
*   **User Model:** Contains `id` (UUID), `authId` (String, mapped to Supabase sub), `tenantId` (UUID), `roleId` (UUID), `firstName`, `lastName`, `status` (Enum: ACTIVE, PENDING, INACTIVE).
*   **Role Model:** Contains `id` (UUID), `tenantId` (UUID, to allow custom clinic roles), `name` (String, e.g., 'ADMIN', 'STAFF').
*   **Permission Model:** Contains `id` (UUID), `roleId` (UUID), `action` (String, e.g., 'CREATE'), `subject` (String, e.g., 'PATIENT').
*   **AuditLog Model:** Contains `id` (UUID), `tenantId` (UUID), `authId` (String), `action` (String), `resource` (String), `timestamp` (DateTime).

### 2.2. Supabase Integration Service
*   **File:** `supabase.service.ts`
*   **Responsibility:** Acts as a wrapper around the `@supabase/supabase-js` Admin SDK. Isolates third-party logic so the main `AuthService` can be easily unit-tested via mocking.
*   **Methods:** 
    *   `inviteUser(email: string): Promise<string>` -> Returns new Auth UUID.
    *   `updateUserMetadata(authId: string, metadata: object): Promise<void>` -> Patches `app_metadata`.
    *   `banUser(authId: string): Promise<void>` -> Suspends user session globally.

### 2.3. Services
*   **File:** `auth.service.ts`
*   **Responsibility:** Business logic orchestrator for user lifecycle events.
*   **Dependencies:** `PrismaService`, `SupabaseService`.
*   **Methods:**
    *   `inviteStaff(tenantId, inviteDto)`: Verifies role exists in DB -> Calls `SupabaseService.inviteUser` -> Calls `SupabaseService.updateUserMetadata` -> Creates Prisma `User`.
    *   `deactivateStaff(tenantId, userId)`: Updates Prisma `User` status to INACTIVE -> Calls `SupabaseService.banUser`.

### 2.4. Controllers
*   **File:** `auth.controller.ts`
*   **Responsibility:** Exposes REST API endpoints for user management. Parses HTTP requests and delegates to `AuthService`.
*   **Endpoints:**
    *   `POST /auth/invite`: Accepts `InviteUserDto`. Requires `CREATE:USER` permission.
    *   `PATCH /auth/:id/deactivate`: Accepts `UpdateStatusDto`. Requires `UPDATE:USER` permission.
    *   `GET /auth/me`: Returns current user's profile from the DB using the Auth UUID from the token.

### 2.5. Data Transfer Objects (DTOs) & Validation Rules
*   **File:** `invite-user.dto.ts`
*   **Validation Rules:**
    *   `email`: Must be a valid email format (`@IsEmail`).
    *   `firstName` / `lastName`: Must be non-empty strings (`@IsString`, `@IsNotEmpty`).
    *   `roleName`: Must be a string. Must match an existing Role in the database (enforced by Service, not DTO).
*   **File:** `update-status.dto.ts`
*   **Validation Rules:**
    *   `status`: Must be a valid Enum value (e.g., INACTIVE, ACTIVE).

### 2.6. Strategies
*   **File:** `jwt.strategy.ts`
*   **Responsibility:** Integrates with `@nestjs/passport`. Configured to read the `Authorization` header as a Bearer token.
*   **Specification:** Loads `SUPABASE_JWT_SECRET`. Validates the token mathematically. Rejects if expired. Returns an object mapping the payload: `{ authId: payload.sub, tenantId: payload.app_metadata.tenantId, role: payload.app_metadata.role }`.

### 2.7. Guards
*   **File:** `jwt-auth.guard.ts` -> Wrapper for Passport JWT strategy. Rejects missing or invalid tokens with `401 Unauthorized`.
*   **File:** `permissions.guard.ts` -> Runs after JWT guard. Reads the required permissions from reflection metadata. Queries the database (or cache) to ensure the user's `roleId` possesses the specific `action` and `subject`. Rejects with `403 Forbidden` if denied.
*   **File:** `tenant-status.guard.ts` -> Checks if the `tenantId` is currently `SUSPENDED` due to billing failure. Rejects all requests with `402 Payment Required` if suspended.

### 2.8. Decorators
*   **File:** `current-user.decorator.ts` -> Extracts the verified `req.user` object so controllers can easily access `tenantId` and `authId` without parsing `req` manually.
*   **File:** `require-permissions.decorator.ts` -> Allows developers to annotate controller routes (e.g., `@RequirePermissions({ action: 'DELETE', subject: 'PATIENT' })`). Stores this data using NestJS `SetMetadata`.

### 2.9. Interceptors (Audit Logging)
*   **File:** `audit-logger.interceptor.ts`
*   **Responsibility:** Provides compliance and security tracking by logging every write operation (POST, PUT, PATCH, DELETE).
*   **Specification:** Intercepts the HTTP request. Extracts the `tenantId` and `authId` from the verified user. Extracts the HTTP Method and URL (Resource). When the request successfully completes, it triggers a background task (or asynchronous database write) to log the event into the Prisma `AuditLog` table. 

### 2.10. Error Handling
*   **Specification:** Handled globally via a custom NestJS `ExceptionFilter`.
*   **Mapping Rules:**
    *   Supabase API Errors (e.g., Email already exists) -> Mapped to `409 Conflict`.
    *   Prisma Foreign Key Failures (e.g., assigning a non-existent role) -> Mapped to `400 Bad Request`.
    *   Missing `tenantId` in JWT -> Mapped to `401 Unauthorized`.
    *   Insufficient Permissions -> Mapped to `403 Forbidden`.
