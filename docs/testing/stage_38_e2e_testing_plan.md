# STAGE 38 — End-to-End Testing Plan

**Subject:** Launch Acceptance Workflows
**Target Audience:** QA Engineers / Product Managers

This document defines the manual End-to-End (E2E) testing workflows required to certify the DentalFlow SaaS for production release. A failure in any of these critical paths blocks the launch.

---

## 1. Authentication

*   **Preconditions**: Test user email does not exist in Supabase.
*   **Steps**:
    1. Navigate to `/register`.
    2. Enter email and secure password.
    3. Click "Sign Up".
    4. Check inbox for confirmation email and click link.
    5. Log in with credentials at `/login`.
*   **Expected Result**: User is successfully authenticated, JWT is issued, and user is redirected to the onboarding/dashboard screen.
*   **Failure Conditions**: Email not received; Login fails with 500 error; JWT lacks `app_metadata` claims.

---

## 2. Clinic Creation (Tenant Provisioning)

*   **Preconditions**: User is logged in but has no associated `Tenant` record.
*   **Steps**:
    1. Navigate through the first-time login onboarding flow.
    2. Enter "Test Dental Clinic", Phone Number, and Address.
    3. Submit form.
*   **Expected Result**: A new `Tenant` record is created in PostgreSQL. The User's role is updated to `ADMIN` and associated with the new `tenantId`. The UI redirects to the main Dashboard.
*   **Failure Conditions**: Clinic creation fails; User is not assigned as Admin; `TenantStatusGuard` throws 403 Forbidden on redirect.

---

## 3. User Creation (RBAC Invitation)

*   **Preconditions**: Clinic exists. Logged in as `ADMIN`.
*   **Steps**:
    1. Navigate to `Settings > Staff`.
    2. Click "Invite Staff".
    3. Enter a secondary email and select the `FRONT_DESK` role.
    4. Click Send Invite.
    5. Accept invite from secondary email.
*   **Expected Result**: Secondary user logs in and can view the calendar, but receives a 403 Forbidden error if they attempt to view the `Settings > Staff` page or Billing page.
*   **Failure Conditions**: Secondary user can access Admin-only pages; Secondary user is attached to the wrong `tenantId`.

---

## 4. Patient Creation

*   **Preconditions**: Logged in as `FRONT_DESK` or `ADMIN`.
*   **Steps**:
    1. Navigate to `Patients > Add New Patient`.
    2. Enter Name, valid Phone Number (with country code), and Email.
    3. Upload a dummy PDF to the "Medical History" section.
    4. Click Save.
*   **Expected Result**: Patient record appears in the list. The PDF is successfully uploaded to MinIO under the `[tenantId]/patients/[patientId]/` prefix.
*   **Failure Conditions**: MinIO pre-signed URL fails to generate; Patient saves but does not appear in the tenant's list.

---

## 5. Appointment Creation & Double Booking

*   **Preconditions**: Patient exists.
*   **Steps**:
    1. Navigate to `Calendar`.
    2. Click 10:00 AM on tomorrow's date.
    3. Select the created Patient. Assign to "Dr. Smith".
    4. Save appointment.
    5. Attempt to create a *second* appointment at 10:15 AM for a different patient with "Dr. Smith".
*   **Expected Result**: The first appointment saves successfully. The second appointment is forcefully rejected by the UI/Backend due to overlapping times (PostgreSQL Exclusion Constraint).
*   **Failure Conditions**: Both appointments save, causing a double-booking schedule conflict.

---

## 6. WhatsApp Reminder

*   **Preconditions**: Appointment exists for tomorrow. Valid WhatsApp phone number is attached to the Patient.
*   **Steps**:
    1. Manually trigger the daily Reminder Cron Job via the Admin backend panel (or wait until 8:00 AM).
*   **Expected Result**: Patient receives a WhatsApp template message: "Reminder: You have an appointment at Test Dental Clinic tomorrow at 10:00 AM."
*   **Failure Conditions**: Message not delivered; BullMQ queue crashes; Meta API returns a 400 Template Mismatch error.

---

## 7. Treatment Journey

*   **Preconditions**: Appointment is marked as "Completed".
*   **Steps**:
    1. Navigate to the Patient's profile.
    2. Create a new Treatment Journey: "Root Canal".
    3. Complete Stage 1 (Consultation).
    4. Move Journey to Stage 2 (Procedure).
*   **Expected Result**: The state machine updates successfully. The UI prompts the user to schedule the Follow-Up appointment for Stage 2.
*   **Failure Conditions**: State transition fails; System allows skipping a mandatory prerequisite stage.

---

## 8. Billing (Razorpay Webhooks)

*   **Preconditions**: Clinic exists. Subscription is `ACTIVE`.
*   **Steps**:
    1. Use Postman to send a dummy `subscription.halted` webhook to the `/webhooks/razorpay` endpoint with a valid HMAC SHA256 signature.
    2. Refresh the Clinic Dashboard in the browser.
*   **Expected Result**: The webhook is processed idempotently. The Redis cache is invalidated. The browser refresh immediately throws a `403 Forbidden: Clinic subscription is suspended` error.
*   **Failure Conditions**: Webhook throws 401 Signature Invalid; Webhook processes but User can still access the dashboard (Cache invalidation failed).

---

## 9. Analytics

*   **Preconditions**: 10 dummy appointments exist.
*   **Steps**:
    1. Manually trigger the `AnalyticsCronProcessor` via the Admin backend panel.
    2. Navigate to the Dashboard.
*   **Expected Result**: The `AnalyticsSnapshot` table is updated. The Dashboard hybrid query correctly displays the total revenue and total appointments across the dummy data.
*   **Failure Conditions**: Dashboard reads 0; Cron job throws a Prisma `UniqueConstraintViolation` upon retry.

---

## Launch Acceptance Checklist

Before routing the primary DNS domain to the production servers, the Lead QA Engineer must sign off on this entire list.

- `[ ]` Authentication Flow Passes
- `[ ]` Clinic Provisioning Flow Passes
- `[ ]` RBAC Enforcement Flow Passes
- `[ ]` Patient MinIO Upload Flow Passes
- `[ ]` Double-Booking Prevention Flow Passes
- `[ ]` WhatsApp API Delivery Flow Passes
- `[ ]` Treatment Journey State Machine Passes
- `[ ]` Razorpay Cache Invalidation Flow Passes
- `[ ]` Analytics Nightly Cron Flow Passes

**Sign-off:** ___________________________  **Date:** _________________
