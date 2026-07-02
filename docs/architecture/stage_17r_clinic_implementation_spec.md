# STAGE 17R — Clinic Module Technical Specification (Remediated)

**Subject:** Architectural file specifications for the Clinic & Billing Module.
**Constraint:** No implementation code. Declarative specifications only.

---

## 1. Folder Structure Specification

The module utilizes Domain-Driven boundaries, explicitly adding the required Billing domain to handle Razorpay Webhooks and Subscription lifecycles.

```text
src/
├── modules/
│   ├── clinics/
│   │   ├── clinics.controller.ts
│   │   ├── clinics.service.ts
│   │   ├── events/
│   │   │   ├── clinic-created.event.ts
│   │   │   ├── clinic-updated.event.ts
│   │   │   ├── clinic-suspended.event.ts
│   │   │   └── clinic-reactivated.event.ts
│   │   └── dto/
│   │       ├── create-clinic.dto.ts
│   │       ├── update-clinic.dto.ts
│   │       ├── suspend-clinic.dto.ts
│   │       └── reactivate-clinic.dto.ts
│   ├── onboarding/
│   │   ├── onboarding.controller.ts
│   │   └── onboarding.service.ts
│   └── billing/
│       ├── billing.controller.ts
│       ├── webhooks.controller.ts
│       ├── billing.service.ts
│       └── dto/
│           └── cancel-tenant.dto.ts
```

---

## 2. Controllers

### 2.1. `clinics.controller.ts`
*   **Route Definitions:** `POST /clinics`, `GET /clinics/:id`, `PATCH /clinics/:id`.
*   **Request Lifecycle:** Validates JWT -> Validates RBAC -> Strips payload via DTO whitelist -> Calls `ClinicsService`.
*   **Error Handling:** Catches Prisma `RecordNotFound` and maps to `404 Not Found`.

### 2.2. `webhooks.controller.ts`
*   **Route Definitions:** `POST /webhooks/razorpay`
*   **Request Lifecycle:** Bypasses `JwtAuthGuard`. Applies a custom `RazorpaySignatureGuard` to cryptographically verify the incoming payload. 
*   **Response Contracts:** Always returns `200 OK` (to acknowledge receipt to Razorpay), even if internal processing fails.

### 2.3. `billing.controller.ts`
*   **Route Definitions:** `POST /billing/cancel`
*   **Request Lifecycle:** Protected by `JwtAuthGuard` and strict `OWNER` role checks. Accepts `CancelTenantDto`. Calls `BillingService.cancelSubscription`.

---

## 3. Services

### 3.1. `clinics.service.ts`
*   **Business Rules:** Physical locations. Max 5 clinics per standard tenant.
*   **Tenant Ownership Checks:** All Prisma queries must inherently include the `tenantId` extracted from AsyncLocalStorage.

### 3.2. `billing.service.ts`
*   **Business Rules:** Processes Webhooks. If `subscription.halted` fires, updates `Tenant.status = SUSPENDED` and fires `ClinicSuspended` event. If `subscription.charged` fires on a suspended account, updates to `ACTIVE` and fires `ClinicReactivated`.

---

## 4. DTOs & Validation Rules

*   **`CreateClinicDto`:** Enforces `@IsString()`, `@IsNotEmpty()` for `name`. `@IsEmail()` for email. `@IsPhoneNumber()` for phone.
*   **`UpdateClinicDto`:** Same as Create, but uses `@IsOptional()` on all fields (Partial type).
*   **`SuspendClinicDto` & `ReactivateClinicDto`:** Validates webhook payloads. Strict `@IsString()` for Razorpay IDs and `@IsIn(['SUSPENDED', 'ACTIVE'])` for status transitions.
*   **`CancelTenantDto`:** Requires `@IsString()` `reason` for cancellation feedback.
*   **Universal Validation:** All URL parameters (e.g., `:id`) must use `ParseUUIDPipe` (strict UUID v4 validation). Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` prevents parameter injection.

---

## 5. Prisma Models

```prisma
model Tenant {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  status    TenantStatus @default(ACTIVE) // ACTIVE, SUSPENDED, CANCELLED
  clinics   Clinic[]
  subscriptions Subscription[]
}

model Clinic {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId  String   @db.Uuid
  name      String
  address   String
  status    ClinicStatus @default(ACTIVE)
  
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  @@index([tenantId])
}

model Subscription {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId         String   @db.Uuid @unique
  providerSubId    String   @unique
  status           SubStatus @default(TRIAL)
  
  tenant           Tenant   @relation(fields: [tenantId], references: [id])
}
```

---

## 6. Security

*   **Tenant Isolation:** Enforced via Prisma `$allOperations` hook combined with Node's `AsyncLocalStorage`.
*   **Owner-Only Actions:** Cancellation (`/billing/cancel`) requires a specific `OWNER` role check, preventing standard `ADMIN` or `STAFF` from terminating the company SaaS contract.
*   **Suspended Tenant Behavior:** A global `TenantStatusGuard` throws `402 Payment Required` for all clinical API routes if the `Tenant.status === SUSPENDED`.

---

## 7. Events

*   **`ClinicCreated`:** Emitted by `onboarding.service.ts`. Consumed by the Email module to send a welcome email.
*   **`ClinicUpdated`:** Emitted by `clinics.service.ts`.
*   **`ClinicSuspended`:** Emitted by `billing.service.ts` when a webhook halts a subscription. Consumed by the Communications module to halt all outgoing WhatsApp SMS to save Meta API costs.
*   **`ClinicReactivated`:** Emitted when a past-due bill is paid. Re-enables WhatsApp processing.

---

## 8. Testing Strategy

1.  **Unit Tests:** Mock the `RazorpaySignatureGuard` to ensure malicious webhooks are rejected with `401 Unauthorized`.
2.  **Integration Tests:** Assert that firing `ClinicSuspended` successfully triggers the downstream event listener in the Communications module.
3.  **Multi-Tenant Isolation Tests:** Spin up a Dockerized Test DB. Seed `Tenant A` and `Tenant B`. Log in as `Tenant A` and issue `PATCH /clinics/{Tenant B Clinic ID}`. Assert the response is `404 Not Found` (not `403`), proving the Prisma extension fully hid the existence of Tenant B's data.
