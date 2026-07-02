# STAGE 33 — First Clinic Launch Playbook

**Subject:** Operational Onboarding Guide
**Target Audience:** SaaS Account Executives & Customer Success Managers
**Objective:** Transitioning the first paying clinic from their legacy system into the DentalFlow SaaS environment with zero downtime and maximum adoption.

---

## Phase 1: Technical Initialization (Day 0)

Before the clinic staff even logs in, the SaaS backend must be meticulously configured to prevent Day-1 friction.

### 1. Clinic & Tenant Setup
*   **Action**: Create the `Tenant` record in the super-admin console.
*   **Configuration**: 
    *   Set the clinic's operating hours (e.g., 09:00 - 18:00).
    *   Initialize the physical resources: Create `Chair 1`, `Chair 2`, etc., in the database to allow the Availability Engine to function immediately.

### 2. Staff Setup & RBAC
*   **Action**: Invite staff members via Supabase Auth magic links.
*   **Role Mapping**:
    *   *Clinic Owner*: `ADMIN` role (Access to Analytics & Billing).
    *   *Dentists*: `CLINICIAN` role (Access to Treatment Journeys & Notes).
    *   *Reception*: `FRONT_DESK` role (Access to Appointments & Follow-Up queues).

### 3. Subscription Activation
*   **Action**: Send the Razorpay checkout link to the Clinic Owner.
*   **Validation**: Verify in the SaaS Admin dashboard that the `Tenant.status` has successfully transitioned from `TRIAL` to `ACTIVE`. **Do not proceed to data import until the recurring payment mandate is secured.**

---

## Phase 2: Integration & Migration (Day 1)

### 1. WhatsApp WABA Setup
Because Meta's approval process can take 24 hours, this must be initiated immediately.
*   **Action**: Use the Meta Developer Console to link the clinic's official phone number.
*   **Verification**: Submit the clinic's GST/Business Registration documents to Meta for WABA verification.
*   **Templates**: Submit the 3 core templates for Meta approval:
    *   `appointment_reminder` (Interactive Buttons: Confirm / Reschedule)
    *   `missed_appointment_followup`
    *   `treatment_checkin`

### 2. Historical Data Import
To ensure receptionists aren't staring at an empty dashboard on Day 1.
*   **Action**: Provide the clinic with the `dentalflow_import_template.csv`.
*   **Mapping**: Ensure legacy patient IDs, names, phone numbers, and active balances are mapped.
*   **Execution**: SaaS Admin executes the import script, mapping the patients strictly to the new `tenantId`.

---

## Phase 3: Training Plan & Go-Live (Day 2-3)

Training must be role-specific. Do not force Dentists to learn billing, and do not force Receptionists to learn Analytics.

### Session 1: Front Desk (60 mins)
*   **Core Loop**: How to create a patient, book an appointment, and handle rescheduling.
*   **The Follow-Up Queue**: Teach them that they no longer need to manually call no-shows. Show them the automated queue and how to click "Mark Done."
*   **WhatsApp Magic**: Demonstrate a live WhatsApp reminder going to a phone, replying "1" to confirm, and showing the dashboard magically updating to `CONFIRMED`.

### Session 2: Clinicians (45 mins)
*   **The Treatment Journey**: How to transition a patient from `Consultation` to `Surgery` to `Post-Op`.
*   **Clinical Notes**: How to attach secure notes to a Follow-Up or Appointment.

### Session 3: Clinic Owner (30 mins)
*   **Analytics**: Walk through the Dashboard KPIs (No-Show Rate, Revenue Pipeline).
*   **Settings**: Show them how to update their credit card if the Razorpay subscription fails.

---

## Phase 4: Hypercare & Monitoring (Day 4-7)

The first week of a new SaaS deployment is when churn risk is highest. Staff will naturally want to revert to their old software or pen-and-paper.

### First Week Checklist (Daily Checks by SaaS Admin)
*   `[ ]` Did the clinic log at least 10 new appointments today?
*   `[ ]` Is the Follow-Up queue being cleared, or are tasks piling up?
*   `[ ]` Did the automated WhatsApp reminders trigger successfully at 8:00 AM?
*   `[ ]` Are there any `P2002` (Exclusion Constraint) errors in the backend logs indicating the staff is struggling with double-booking?

### Success Metrics (To present to Owner on Day 7)
*   **Metric 1**: "X hours saved" (Calculated by the number of WhatsApp automated confirmations vs manual phone calls).
*   **Metric 2**: 100% data integrity (No double-bookings occurred).
*   **Metric 3**: Revenue Pipeline visibility established.

---

## Support Process

During the Day 1-7 Hypercare phase, standard ticketing is too slow.
*   **Comms**: Establish a dedicated WhatsApp Group or Slack Connect channel named `DentalFlow <> [Clinic Name] Support`.
*   **SLA**: 15-minute response time during clinic operating hours.
*   **Feedback Loop**: Any UI confusion (e.g., "The 'Add Patient' button is hard to find") must be logged in Linear/Jira for the engineering team to patch in the Week 2 sprint.
