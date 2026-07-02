# Feature Prioritization, MVP Scope, & Success Metrics

This document outlines the product roadmap for DentalFlow, detailing feature categorization (MoSCoW matrix), MVP boundaries, future expansion phases, and the key metrics used to evaluate platform success.

---

## 1. Feature Prioritization (MoSCoW Matrix)

To deliver value quickly and prevent scope creep, features are prioritized as follows:

```
+-----------------------------------------------------------------------------------+
|                                 MoSCoW Matrix                                     |
+-------------------------------------+---------------------------------------------+
| MUST HAVE (MVP Scope)               | SHOULD HAVE (Phase 2 - Expansion)           |
| - Clinic Login & Session Mgmt       | - Inbound Appointment Requests Portal       |
| - Patient Registry                  | - Multi-Language WhatsApp Engine            |
| - Treatment Templates & Stages      | - Basic Analytics (TCR, Stalled Rate)       |
| - Stage-Linked Appointment Booking  | - Immutable Audit Logging                   |
| - Next Visit System Dashboard       | - SaaS Subscription Billing Gateways        |
| - Automated Whatsapp Nudge Engine  |                                             |
| - Basic Revenue Balance Tracking    |                                             |
| - Dynamic UPI QR Code Generation    |                                             |
| - Leave Mode Toggles                |                                             |
+-------------------------------------+---------------------------------------------+
| COULD HAVE (Phase 3 - Optimization) | WON'T HAVE (Out of Scope)                   |
| - Preventive Recall Lists           | - Inventory Management                      |
| - Automated UPI Webhook Verification| - General Accounting & GST Invoicing        |
| - Advanced Analytics Dashboards     | - Multi-Branch Operations                   |
| - Clinic Assistant Productivity Logs| - Dental Charting (2D/3D grids)            |
|                                     | - Insurance Claims & TPAs                   |
|                                     | - Native iOS/Android Mobile Apps            |
+-------------------------------------+---------------------------------------------+
```

---

## 2. MVP Scope Definition

The MVP focuses exclusively on **closing the loop for active treatments** through basic stage management and automated WhatsApp follow-ups.

### MVP Feature Specifications:
* **Patient & Journey Profiles:** Basic screens to register a patient, start a journey using a default template, and view progress.
* **Default Templates:** Pre-bundled templates for common high-drop-off treatments in India:
  1. *Root Canal Treatment (RCT) + Crown*
  2. *Crown and Bridge (Prosthodontics)*
  3. *Dental Implant + Crown*
  4. *Multi-stage Deep Scaling & Splinting*
* **Basic Scheduler:** A calendar grid where appointments are scheduled by selecting a patient and linking the appointment to their active treatment stage.
* **Next Visit Feed:** A simple vertical feed listing patients whose current stage is marked "Completed" but who do not have an upcoming appointment.
* **The Automation Engine:** Triggering single-level WhatsApp messages:
  * Appointment Reminder (24 hours before).
  * Post-op care instructions (2 hours after a surgical stage is checked complete).
  * Stalled warning message (3 days after a scheduled next-stage date is missed).
* **UPI QR Codes:** Presenting a static or dynamic UPI QR code on screen using the dentist's UPI ID (VPA) and the due balance amount.
* **Leave Mode:** A simple toggle on the dashboard to immediately pause all automated WhatsApp queue items.

---

## 3. Future Scope & Roadmap

### Phase 2: Engagement & Scale (3-6 Months post-MVP)
* **Interactive Appointment Requests:** Enabling patients to choose proposed slots directly from a WhatsApp message using Meta interactive buttons, which flow back into the clinic's review portal.
* **Vernacular Language Support:** Allowing the clinic to select Kannada, Tulu, or Malayalam template variables for WhatsApp communication, addressing the local demographic preferences in Mangalore.
* **Audit Trail:** Basic logs showing which receptionist user marked a stage complete or altered a payment record, providing clinic owners with transparency.
* **Basic Analytics:** Graphical view of the Treatment Completion Rate and Recovered Revenue on the home dashboard.

### Phase 3: Intelligence & Automation (6-12 Months post-MVP)
* **Preventative Recalls:** Automatically enqueueing patients into periodic scaling, polishing, or implant-check journeys 6-12 months after their active journey ends.
* **Automated Payments Reconciliation:** Integration with business UPI merchant gateways to automatically listen for webhooks and transition payments to "Completed" status without manual staff clicks.
* **Custom Journey Creator:** Allowing clinics to design their own templates, specifying their own custom stages, default intervals, and SMS/WhatsApp copy.

---

## 4. Success Metrics

The core metric of DentalFlow is **clinical and operational completion**, not booking volume.

### Primary Success Metric

#### **Treatment Completion Rate (TCR)**
$$\text{TCR} = \frac{\text{Number of Treatment Journeys Marked "Completed"}}{\text{Number of Treatment Journeys Initiated}} \times 100$$
* **Baseline (Typical Indian Clinic):** $\approx 55\% - 65\%$ (high drop-off in crowns/follow-ups).
* **DentalFlow Target:** $> 85\%$ within 3 months of platform adoption.

---

### Secondary Success Metrics

1. **Revenue Recovery Rate (RRR)**
   * *Definition:* Sum of payments collected from patients who returned *after* their treatment journey entered a "Stalled" state and received a WhatsApp follow-up.
   * *Target:* $\ge \text{₹15,000}$ recovered per month per active clinic.
2. **Stalled Duration (SD)**
   * *Definition:* Average days a patient spends in the "Stalled" state (time between the missed appointment date and the actual rescheduling date).
   * *Target:* Reduce from average of 24 days (manual follow-up) to $< 6 \text{ days}$.
3. **Weekly Active Tenants (WAT) & Daily Active Tenants (DAT)**
   * *Definition:* The percentage of registered clinics that log in and record at least one stage completion or payment event per week/day.
   * *Target:* WAT $> 80\%$, DAT $> 60\%$.
4. **WhatsApp Opt-Out / Block Rate**
   * *Definition:* The percentage of patients who reply with "STOP" or report the clinic's WhatsApp number.
   * *Target:* $< 1.5\%$ (achieved by strict template throttling and highly relevant clinical content over commercial marketing messages).
5. **Net Promoter Score (NPS) - Dentist**
   * *Definition:* Likelihood of solo dentists recommending DentalFlow to other practitioners.
   * *Target:* $\ge +50$.
