# Playbook: Customer Support Workflows

This document outlines how the internal DentalFlow support team investigates and resolves common issues raised by clinics.

---

## 1. Support Tiers & Escalation

*   **Tier 1 (L1 Support):** Non-technical agents handling basic queries (billing, password resets, basic navigation).
*   **Tier 2 (L2 Support):** Technical agents who can query the database directly to investigate "missing data" or WhatsApp delivery failures.
*   **Tier 3 (DevOps/Engineering):** Escalation point for system-wide outages, API deprecations, or data corruption requiring PITR restores.

---

## 2. Troubleshooting: "My WhatsApp message wasn't delivered"

This is the most common operational query. When a clinic complains that a patient did not receive a reminder:

### Step 1: Check the Database (L2)
1. Query the `WhatsAppMessage` table for the specific `patientId` and `tenantId`.
2. Check the `status` column:
   *   `SENT`: The message left DentalFlow but Meta hasn't confirmed delivery. (Possible network lag or patient's phone is off).
   *   `DELIVERED`: It reached the patient's phone, but they haven't opened it.
   *   `READ`: It was fully consumed.
   *   `FAILED`: The message was rejected.

### Step 2: Investigate Failures
If the status is `FAILED`:
1. Check the `payload` JSON column for Meta's error code.
2. **Common Reasons:**
   *   The phone number is invalid or not registered on WhatsApp.
   *   The patient has blocked the clinic's business number.
   *   Meta rejected the template (e.g., if the dynamic variables were malformed).

### Step 3: Check the BullMQ Queue
If the message isn't in the database at all:
1. Open the BullMQ Dashboard (internal tool).
2. Check the `outbound_messages` failed queue.
3. If the job failed repeatedly, check the stack trace (e.g., perhaps the clinic's Meta API Token expired).

---

## 3. Troubleshooting: "A patient is stuck / Stalled Journey"

If a clinic reports a bug where a patient's Treatment Journey isn't advancing:

1. Query the `TreatmentJourney` and `TreatmentStage` tables for that patient.
2. Verify that the `currentStageId` matches a stage that is actually `PENDING`.
3. If the stage was marked `COMPLETED` but the journey didn't advance:
   *   Check the internal `AuditLog` table to see who triggered the update.
   *   Check the BullMQ event bus to see if the `stage.completed` domain event failed to fire.

---

## 4. Bug Reporting to Engineering (Escalation to L3)

When L2 identifies a reproducible bug that requires a code fix:
1. File a ticket in Jira/GitHub.
2. Include the exact `tenantId`, `userId`, and `journeyId` (do *not* include PII like patient names or phone numbers).
3. Attach the relevant stack trace from BullMQ or the backend application logs.
4. If it's a `P1` (e.g., the WhatsApp webhook endpoint is returning `500 Internal Server Error`), immediately page the on-call engineer.
