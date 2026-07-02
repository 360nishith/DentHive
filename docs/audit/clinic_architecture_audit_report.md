# Clinic Architecture Audit Report (Stage 16A)

**Audit Type:** Architectural Verification
**Target:** Stage 16 Clinic Module Design
**Status:** 🔴 **FAIL**

---

## 1. Multi-Tenant Isolation
**Status: PASS**
*   **Verification:** The architectural decision to make `Tenant` the root entity rather than `Clinic` is robust. It successfully plans for multi-branch clinic expansions.
*   **Security:** Relying strictly on the `tenantId` injected into the Supabase JWT `app_metadata` guarantees airtight data isolation. 

## 2. Tenant Lifecycle Completeness
**Status: FAIL**
*   **Missing Item:** The architecture defines states for `ACTIVE`, `SUSPENDED`, and `CANCELLED`, but **fails to define the Cancellation Lifecycle**. There is no API contract or sequence diagram detailing how a clinic formally cancels their account (e.g., a `POST /api/billing/cancel` endpoint) and how that triggers the transition to the `CANCELLED` status.

## 3. Clinic Onboarding Flow
**Status: FAIL**
*   **Vulnerability (Race Condition):** The onboarding sequence diagram specifies that the NestJS backend creates the `Tenant` and `Clinic` in Prisma *before* calling Supabase to create the Identity. If the Supabase call fails (e.g., weak password, or network timeout), the database is left with an "orphaned" Tenant and Clinic that nobody can log into. 
*   **Required Fix:** The flow must be wrapped in a distributed transaction with compensation logic (if Supabase fails, the DB transaction must roll back).

## 4. Subscription State Handling
**Status: PASS**
*   **Verification:** Using Webhooks to asynchronously drive the `Tenant.status` state machine is the correct approach for a solo founder. It automates revenue protection perfectly. The requirement to verify the `RAZORPAY_WEBHOOK_SECRET` prevents unauthorized suspensions.

## 5. Security Controls & Validation Rules
**Status: PASS (With Minor Warnings)**
*   **Verification:** Validation rules are outlined (`@IsEmail`, etc.) and the `@RequirePermissions` RBAC decorator is correctly applied to the update endpoint. 
*   **Warning:** The `/api/onboarding` endpoint must enforce strict CAPTCHA or aggressive rate-limiting, otherwise malicious actors can spam the endpoint to exhaust your database and Supabase API limits.

## 6. Database Design
**Status: PASS**
*   **Verification:** The ERD accurately maps the relationships (`Tenant` -> `Clinic`, `Tenant` -> `User`, `Tenant` -> `Subscription`). It successfully removes `tenantId` from being redundantly placed on sub-entities if Prisma query extensions are configured correctly.

## 7. API Consistency
**Status: FAIL**
*   **Missing Item (Multi-Clinic Support):** The architectural philosophy explicitly stated: *"we allow a future feature where a single Tenant can manage multiple physical Clinics."* However, there is no `POST /api/clinics` endpoint defined to actually create a second clinic.
*   **Missing Item (Read Single):** There is no `GET /api/clinics/:id` endpoint defined to fetch the details of a specific clinic.

---

### Remediation Requirements (Stage 16B)

To achieve a passing grade, the following updates must be applied to the architectural specification:

1.  **Resolve the Onboarding Race Condition:** Redesign the onboarding sequence to include transaction rollback logic if Supabase creation fails.
2.  **Add the Cancellation Flow:** Document the API and sequence for when a customer actively requests to terminate their SaaS subscription.
3.  **Complete the API Contracts:** Add `POST /api/clinics` (for adding new branches) and `GET /api/clinics/:id`.
4.  **Enforce Onboarding Security:** Explicitly document rate-limiting / spam protection on the public onboarding route.
