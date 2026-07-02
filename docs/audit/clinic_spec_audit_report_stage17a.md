# Clinic Specification Audit Report (Stage 17A)

**Audit Type:** Technical Specification Verification
**Target:** Stage 17 Clinic Implementation Spec
**Status:** 🔴 **FAIL**

---

## 1. Folder Structure Completeness
**Status: FAIL**
*   **Missing Item:** The folder structure isolated `clinics` and `onboarding`, but completely missed the `billing` or `subscriptions` domain. There is no folder or module defined to house the Razorpay Webhook controller that triggers tenant suspensions.

## 2. DTO & Validation Completeness
**Status: FAIL**
*   **Missing Item:** The Stage 16B architecture clearly defined a `POST /api/billing/cancel` endpoint. However, the Stage 17 specification failed to include a `cancel-tenant.dto.ts` or define its validation rules (e.g., verifying the cancellation reason).

## 3. Service Responsibilities
**Status: FAIL**
*   **Missing Item:** While `clinics.service.ts` and `onboarding.service.ts` were well-defined, the specification lacks a `billing.service.ts` or `subscription.service.ts` to handle the business logic of parsing Webhooks, verifying Razorpay cryptographic signatures, and emitting the `tenant-suspended.event.ts`.

## 4. Controller Responsibilities
**Status: FAIL**
*   **Missing Item:** There is no Webhook Controller defined. The system needs a dedicated controller (e.g., `webhooks.controller.ts`) that accepts external traffic from Razorpay *without* the `JwtAuthGuard` (since Razorpay doesn't log in via Supabase).

## 5. Tenant Isolation & Security Controls
**Status: PASS**
*   **Verification:** The design using Prisma's `$allOperations` hook injected with `AsyncLocalStorage` data from the JWT is flawless. Returning `404 Not Found` instead of `403 Forbidden` for cross-tenant access attempts correctly prevents ID enumeration attacks.

## 6. Testing Strategy
**Status: PASS**
*   **Verification:** The Integration Test Plan specifically demands spinning up Dockerized databases with seeded cross-tenant data to mathematically prove the isolation logic works. The Unit Test plan accurately mocks the compensatory rollback logic for onboarding.

## 7. Prisma Design
**Status: PASS**
*   **Verification:** The `Tenant` and `Clinic` models are correctly related via standard Foreign Keys and utilize B-Tree indexing on `tenantId` to ensure rapid RLS query execution.

---

### Remediation Requirements (Stage 17B)

To achieve a passing grade, the following items must be added to the Stage 17 Technical Specification:

1.  **Add the Billing/Subscription Domain:** Define the folder structure for `apps/api/src/modules/billing/`.
2.  **Define the Webhook Controller:** Specify how it bypasses the `JwtAuthGuard` but enforces Razorpay cryptographic signature verification.
3.  **Define the Billing Service:** Map out the responsibility for translating external webhooks into internal Database state changes and emitting Domain Events.
4.  **Add `cancel-tenant.dto.ts`:** Define the DTO for the manual cancellation flow.
