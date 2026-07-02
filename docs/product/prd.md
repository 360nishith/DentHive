# Product Requirements Document (PRD) - DentalFlow

**Document Version:** 1.0.0  
**Status:** Draft  
**Target Market:** India (focus on Mangalore solo dentists and small clinics)

---

## 1. Executive Summary

DentalFlow is a multi-tenant SaaS platform tailored to the Indian dental ecosystem, specifically optimized for solo practitioners and small clinics with minimal administrative support. Unlike traditional Practice Management Software (PMS) which is appointment-centric (focusing on booking calendars and billing transactions), DentalFlow is **treatment-centric**. 

The platform is designed to track a patient's transition through multi-step clinical workflows (e.g., Root Canal Treatment to Crown, Implants, Orthodontics) and use automated WhatsApp communication to maximize the **Treatment Completion Rate (TCR)**.

---

## 2. Core Philosophy & Data Model

The platform enforces a strict hierarchical data structure:

$$\text{Patient} \longrightarrow \text{Treatment Journey} \longrightarrow \text{Treatment Stage} \longrightarrow \text{Appointment}$$

### Core Invariants:
1. An **Appointment** cannot exist in a vacuum; it must always be linked to a specific **Treatment Stage** of an active **Treatment Journey**.
2. If an appointment is cancelled or missed, the **Treatment Journey** remains "Active" and enters a "Stalled" state. This triggers automated follow-up pathways until the stage is completed, preventing the patient from falling through the cracks.
3. Success is not measured by the number of bookings, but by the ratio of completed journeys to initiated journeys.

---

## 3. Product Scope & Functional Modules

### 3.1. Authentication
* **Roles:** 
  * `Dentist` (Full admin access, billing, analytics, settings).
  * `Assistant / Receptionist` (Patient registry, appointment scheduling, updating stage completion, recording payments, leave mode toggle).
* **Multi-Factor Login:** OTP-based login via WhatsApp/SMS to avoid password fatigue for clinic staff.

### 3.2. Multi-Tenant SaaS Architecture
* **Tenant Isolation:** Each clinic represents a tenant. Data isolation must be enforced at the database level (e.g., tenant_id column-level or schema-level partitioning).
* **Custom Subdomains:** Access via `tenantname.dentalflow.in`.
* **SaaS Subscription:** Integration with Razorpay/Stripe to handle SaaS tier billing (Basic, Pro, Enterprise) and auto-suspend accounts on payment failure.

### 3.3. Patients
* **Profile Fields:** Name, Phone Number (must be WhatsApp-enabled), WhatsApp Opt-In Status, Gender, Age, Secondary Contact, and Preferred Language.
* **Language Support:** Localization of patient communications (WhatsApp notifications) into English, Kannada, Tulu, and Malayalam.
* **Patient History:** Chronological feed of all completed journeys, stages, and communication logs.

### 3.4. Treatment Templates
* **Definition:** Blueprints for clinical pathways.
* **Structure:** A template consists of an ordered sequence of stages.
* **Example (RCT + Crown Template):**
  * Stage 1: Pulpectomy & Access Cavity Prep
  * Stage 2: Obturation & Post-Space Prep
  * Stage 3: Crown Tooth Prep & Impression
  * Stage 4: Crown Cementation & Final Occlusion Check
* **Configurable Defaults:** Each stage in a template has:
  * Default gap/interval (e.g., Stage 4 must happen 7-10 days after Stage 3).
  * Default WhatsApp nudge sequences.

### 3.5. Treatment Journeys
* **Instantiation:** When a patient begins a treatment, a `Treatment Journey` is instantiated from a `Treatment Template`.
* **State Machine:**
  ```mermaid
state-diagram
    [*] --> Active
    Active --> Stalled : Stage Deadline Missed
    Stalled --> Active : Appointment Scheduled
    Active --> Completed : Final Stage Verified
    Active --> Suspended : Manual Intervention / Opt-Out
```mermaid
state-diagram
    [*] --> Active
    Active --> Stalled : Stage Deadline Missed
    Stalled --> Active : Appointment Scheduled
    Active --> Completed : Final Stage Verified
    
```
* **Tracking:** Progress percentage (e.g., Stage 2 of 4 = 50% complete).

### 3.6. Treatment Stages
* **Live Progress:** Every active journey has a single "Current Stage".
* **Completion Criteria:** A stage is marked complete when the clinician checks it off in the app, which automatically updates the journey status and initiates the workflow for the next stage.

### 3.7. Appointments
* **Stage-Linked Scheduling:** When scheduling, the user selects the patient, which exposes their active journey and current stage, auto-populating appointment context.
* **Status Tracking:** Scheduled, Confirmed, Checked-In, No-Show, Rescheduled, Cancelled.

### 3.8. Appointment Requests
* **Self-Scheduling Links:** Patients receive a WhatsApp nudge with an interactive button (or link) to request an appointment.
* **Clinic Approval Portal:** Incoming requests appear on the assistant’s dashboard as a pending card. With one click, the assistant approves and schedules it, sending a confirmation back to the patient.

### 3.9. Next Visit System
* **Dashboard Feed:** A dedicated dashboard listing all patients whose current stage is complete but who do not have a future appointment scheduled.
* **Actionable List:** Categorized by risk (e.g., "Critical: No visit scheduled for > 14 days"). Allows one-click trigger of a WhatsApp nudge to book the next visit.

### 3.10. Follow-Ups (Automated Engine)
* **Trigger Rules:** Scheduled background jobs check active journeys.
  * If a patient missed an appointment and has no future appointment: Trigger "Missed Appointment Nudge" within 2 hours.
  * If a stage is due in 3 days: Trigger "Pre-Visit Prep/Reminder Nudge".
  * If a patient has been in a "Stalled" state for 7, 14, or 30 days: Trigger escalation messages.
* **Throttling:** Max 1 automated message every 48 hours to avoid patient annoyance and prevent WhatsApp number blocking.

### 3.11. Revenue Tracking
* **Financial Model:** Cost mapped directly to the Treatment Journey (e.g., Total Journey Cost = ₹15,000).
* **Payment Log:** Every stage transit can capture a payment event (e.g., Paid ₹5,000 at Stage 1, ₹5,000 at Stage 3).
* **Balance Tracking:** Live calculation of outstanding balance:
  $$\text{Balance} = \text{Total Journey Cost} - \sum \text{Payments Received}$$

### 3.12. Payments (UPI Integration)
* **Dynamic QR Codes:** Generation of a UPI QR code on the dashboard incorporating the exact due balance and clinic VPA (Virtual Payment Address).
* **Payment Verification:** Manual confirmation by receptionist or webhooks (if utilizing UPI merchant APIs) to mark the payment transaction as success.

### 3.13. WhatsApp Automation
* **Provider:** Meta Cloud API or Business Solution Provider (BSP) like AISensy/Wati.
* **Templates:** Highly structured templates pre-approved by Meta (variables: Patient Name, Clinic Name, Doctor Name, Appointment Time, Payment Due).
* **Interactive Elements:** Quick Reply buttons (e.g., "Confirm Appointment", "Request Callback", "Reschedule").

### 3.14. Recall Lists
* **Preventative Care:** Automation of long-term retention journeys (e.g., "6-Month Dental Cleaning & Scaling Recall", "12-Month Implant Assessment").
* **Trigger:** Initiates a new micro-journey automatically 6 months after the completion of an active treatment journey.

### 3.15. Subscription Management (SaaS Billing)
* **Tiering:**
  * *Lite:* Up to 100 active journeys/month, manual WhatsApp triggers.
  * *Growth:* Unlimited journeys, fully automated WhatsApp follow-ups, UPI QR code.
  * *Enterprise:* Multi-chair custom setups, custom WhatsApp Business API numbers.

### 3.16. Audit Logs
* **Security & Traceability:** Immutable logs tracking:
  * Who updated a treatment stage.
  * Who recorded a payment.
  * Who updated patient records.
  * Manual WhatsApp notification override events.

### 3.17. Analytics
* **Dashboard Widgets:**
  * **Treatment Completion Rate (TCR):** $\frac{\text{Completed Journeys}}{\text{Initiated Journeys}} \times 100$
  * **Stalled Rate:** Percentage of patients in the "Stalled" state.
  * **Recovered Revenue:** Total payments collected from patients who had previously been in a "Stalled" state.
  * **Average Days to Completion:** Time taken from Journey Start to Journey Completion.

### 3.18. Clinic Leave Mode
* **Scheduler Override:** Toggling "Leave Mode" pauses all outbound automated appointment suggestion messages and changes the automated inbound responder to a customizable "Doctor is out of town / Clinic is closed" message.

---

## 4. Explicit Exclusions

To maintain focus and avoid scope creep, the following modules are **explicitly excluded** from the MVP and future scopes:
* **Inventory Management:** No tracking of gloves, implants, cements, or dental materials.
* **General Accounting & GST:** No complex tax invoicing, ledger balance sheets, or filing returns.
* **Multi-Branch clinic synchronization:** Built solely for single-location clinics.
* **Dental Charting:** No interactive 2D/3D graphical tooth-grid charting.
* **Insurance Claims:** No processing of insurance forms or TPAs (Third Party Administrators).
* **Mobile Apps:** No Native iOS/Android apps. The system will be a responsive PWA (Progressive Web App) optimized for mobile browser screens.

---

## 5. Technical Architecture Outline (Conceptual)

```
[Patient Mobile] <--- (WhatsApp API) ---> [Message Queue / Workers]
                                                 |
[Clinic PWA]     <--- (HTTPS / WS)   ---> [REST API Server (Node/Go/Python)]
                                                 |
                                         [PostgreSQL (Multi-tenant DB)]
                                                 |
                                         [Redis (Cache & Job Queue)]
```

* **Frontend:** Responsive React (Vite or Next.js), styled with CSS Grid/Flexbox and HSL-based Tailwind tokens, optimized for desktop (receptionist) and mobile web browsers (dentist).
* **Backend:** REST API built using Node.js (NestJS/Express) or Python (FastAPI).
* **Database:** PostgreSQL utilizing schema-level multi-tenancy for clean isolation of clinical records.
* **Worker Queue:** Redis-backed queues (e.g., BullMQ) for scheduling delayed WhatsApp templates.
