# STAGE 17 — Clinic Module Technical Specification

**Subject:** Architectural file specifications for the Clinic & Tenant Module.
**Constraint:** No implementation code. Declarative specifications only.

---

## 1. Folder Structure Specification

The module uses strict Domain-Driven boundaries inside `apps/api/src/modules/clinics/`.

```text
src/
├── modules/
│   ├── clinics/
│   │   ├── clinics.controller.ts
│   │   ├── clinics.service.ts
│   │   ├── clinics.module.ts
│   │   ├── events/
│   │   │   └── tenant-suspended.event.ts
│   │   └── dto/
│   │       ├── create-clinic.dto.ts
│   │       ├── update-clinic.dto.ts
│   │       ├── suspend-tenant.dto.ts
│   │       └── reactivate-tenant.dto.ts
│   └── onboarding/
│       ├── onboarding.controller.ts
│       └── onboarding.service.ts
```
*(Note: Onboarding is separated from Clinics to prevent public, unauthenticated traffic from interacting with the protected Clinic domain).*

---

## 2. Controllers

### 2.1. `clinics.controller.ts`
*   **Responsibilities:** Handles all physical branch management for an authenticated Tenant.
*   **Guards:** `JwtAuthGuard`, `TenantStatusGuard`, `PermissionsGuard`.
*   **Routes & Request Flow:**
    *   `POST /clinics` -> Validates `CreateClinicDto` -> Extracts `tenantId` from `@CurrentUser()` -> Calls `ClinicsService.createClinic`. Requires `CREATE:CLINIC` permission.
    *   `GET /clinics/:id` -> Extracts `tenantId` -> Calls `ClinicsService.getClinicById`. (If the clinic belongs to another tenant, the service returns 404, not 403, preventing enumeration).
    *   `PATCH /clinics/:id` -> Validates `UpdateClinicDto` -> Calls `ClinicsService.updateClinic`. Requires `UPDATE:CLINIC` permission.

### 2.2. `onboarding.controller.ts`
*   **Responsibilities:** Public facing entry point for new founders.
*   **Routes & Request Flow:**
    *   `POST /onboarding` -> Parses Payload -> Verifies reCAPTCHA -> Calls `OnboardingService.onboardNewTenant`. Protected by explicit IP Rate-Limiting.

---

## 3. Services

### 3.1. `clinics.service.ts`
*   **Responsibilities:** Handles CRUD operations for physical clinic locations. Enforces that all operations are bound to the `tenantId`.
*   **Business Rules:** A tenant can have a maximum of 5 clinics on a standard tier. Soft-deletes are used if a clinic closes.

### 3.2. `onboarding.service.ts`
*   **Responsibilities:** Orchestrator for Tenant creation.
*   **Business Rules:** Must create the Supabase Identity *first*. Wraps the Prisma `Tenant` and `Clinic` creation in a strict `$transaction`. If the transaction fails, executes compensatory rollback deleting the Supabase user.

---

## 4. DTOs & 5. Validation Rules

### 4.1. `create-clinic.dto.ts`
*   **Fields:** `name`, `address`, `phone`, `email`, `taxId`.
*   **Validation Rules:** `@IsString()`, `@IsNotEmpty()` for name. `@IsEmail()` for email. `@IsPhoneNumber()` for phone. No `tenantId` is allowed in the payload.

### 4.2. `update-clinic.dto.ts`
*   **Fields:** Same as Create, but uses `@IsOptional()` on all fields (Partial type).

### 4.3. `suspend-tenant.dto.ts` & `reactivate-tenant.dto.ts`
*   **Fields:** `reason` (String), `razorpaySubId` (String).
*   **Validation Rules:** Triggered internally via Razorpay Webhooks. Requires `@IsString()` and verification against the external webhook cryptographic signature.

---

## 6. Prisma Models

```prisma
model Tenant {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  status    TenantStatus @default(ACTIVE) // ACTIVE, SUSPENDED, CANCELLED
  createdAt DateTime @default(now())
  clinics   Clinic[]
  users     User[]
}

model Clinic {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId  String   @db.Uuid
  name      String
  address   String
  phone     String
  email     String
  taxId     String?
  status    ClinicStatus @default(ACTIVE) // ACTIVE, CLOSED
  
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  @@index([tenantId])
}
```

---

## 7. Prisma Query Patterns

*   **Tenant Isolation via Extension:** Prisma is extended with an `$allOperations` hook. Before any query executes on the `Clinic` table, it extracts the `tenantId` from `AsyncLocalStorage`.
*   **Query Transformation:** `prisma.clinic.findMany()` automatically transforms into `SELECT * FROM "Clinic" WHERE "tenantId" = 'als-context-id'`.
*   **Manual Override:** If the system explicitly needs cross-tenant access (e.g., global admin billing dashboard), a special bypass flag must be explicitly passed into the query context.

---

## 8. Events

### `tenant-suspended.event.ts`
*   **Specification:** A Domain Event dispatched by the Webhook handler when a `Tenant` is suspended. 
*   **Listeners:** Other modules listen to this. For example, the `CommunicationModule` listens to this event to halt all outgoing WhatsApp reminders for that clinic.

---

## 9. Guards

### `tenant-status.guard.ts`
*   **Responsibility:** A global Guard running after `JwtAuthGuard`. 
*   **Logic:** Reads the `tenantId` from the JWT. Queries the database (or a fast Redis cache) for `Tenant.status`. If the status is `SUSPENDED` or `CANCELLED`, it throws a `402 Payment Required` exception.
*   **Exemptions:** Excludes the `/api/billing/checkout` endpoint so users can actually log in and pay their bill.

---

## 10. Tenant Security Enforcement

1.  **JWT as Source of Truth:** Controllers completely ignore any `tenantId` query parameters or body fields. 
2.  **No Enumeration:** If a user tries to access `/clinics/uuid-belonging-to-someone-else`, the system returns `404 Not Found` rather than `403 Forbidden` to prevent attackers from discovering valid clinic IDs.

---

## 11. Unit Test Plan

1.  **Onboarding Orchestrator:** Mock the Prisma transaction to artificially fail. Assert that the compensatory `SupabaseService.deleteUser` is called.
2.  **DTO Validation:** Feed a `CreateClinicDto` containing a malicious `tenantId` payload. Assert that the `ValidationPipe(whitelist: true)` completely strips it before hitting the controller.
3.  **TenantStatusGuard:** Mock the Redis cache to return `SUSPENDED`. Assert the Guard throws `Payment Required` for clinical routes, but allows access to the billing upgrade route.

---

## 12. Integration Test Plan

1.  **Test Database Isolation:** Spin up a Dockerized PostgreSQL. Seed it with `Tenant A` and `Tenant B`. Log in as `Tenant A`. Run `GET /clinics`. Assert that `Tenant B` data is physically absent from the response.
2.  **Webhook Simulation:** Fire a simulated Razorpay POST payload with a valid cryptographic signature indicating billing failure. Assert that the database `Tenant.status` changes, and the `tenant-suspended.event` fires and halts a mock WhatsApp BullMQ worker.
