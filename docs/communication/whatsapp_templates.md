# WhatsApp Message Templates

DentalFlow utilizes Meta's pre-approved Message Templates to initiate conversations with patients outside the standard 24-hour service window. Each template uses positional variables (`{{1}}`, `{{2}}`) injected dynamically by the backend.

---

## 1. Appointment Management

### 1.1. Appointment Request (Sent by Clinic)
*Triggered manually by the clinic when a patient needs to be seen.*

**Message Body:**
> Hi {{1}}, this is {{2}}. We would like to schedule an appointment for your dental checkup. Are you available on {{3}} at {{4}}?

**Interactive Buttons:**
*   [Confirm Appointment] *(Payload: `CONFIRM_APPT_REQUEST`)*
*   [Reschedule] *(Payload: `REQUEST_RESCHEDULE`)*

### 1.2. Appointment Acceptance
*Triggered automatically when the clinic confirms an appointment on the calendar.*

**Message Body:**
> Hi {{1}}, your appointment at {{2}} is confirmed for {{3}} at {{4}}. Please arrive 5 minutes early. We look forward to seeing you!

**Interactive Buttons:**
*   [Reschedule] *(Payload: `REQUEST_RESCHEDULE`)*

### 1.3. Appointment Rejection / Rescheduling (By Clinic)
*Triggered if the clinic needs to cancel an existing appointment.*

**Message Body:**
> Dear {{1}}, unfortunately, we need to reschedule your appointment at {{2}} on {{3}}. We apologize for the inconvenience. Please tap below to choose a new time.

**Interactive Buttons:**
*   [Request New Time] *(Payload: `REQUEST_RESCHEDULE`)*

---

## 2. Post-Treatment Automation

### 2.1. Post-Op Follow Up Nudge
*Triggered 1-24 hours after a specific `TreatmentStage` is marked `COMPLETED`.*

**Message Body:**
> Hi {{1}}, we hope you are recovering well from your procedure today at {{2}}. Please remember to take your medication as prescribed and avoid hot/spicy food for the next 24 hours. Let us know if you feel any discomfort.

**Interactive Buttons:**
*   [I feel fine] *(Payload: `POST_OP_OK`)*
*   [I have pain/swelling] *(Payload: `POST_OP_ISSUE`)*

### 2.2. Next Visit Reminder
*Triggered 24 hours before the next scheduled stage of an active Treatment Journey.*

**Message Body:**
> Hi {{1}}, this is a reminder for your next visit at {{2}} for your ongoing treatment. Your appointment is tomorrow at {{3}}. 

**Interactive Buttons:**
*   [Confirm] *(Payload: `CONFIRM_NEXT_VISIT`)*
*   [Reschedule] *(Payload: `REQUEST_RESCHEDULE`)*

---

## 3. Patient Retention (Recall)

### 3.1. Long-Term Recall Reminder
*Triggered via Cron Job based on the `RecallList` table (typically 6 months after the last visit).*

**Message Body:**
> Hi {{1}}, it's been a while since your last visit to {{2}}! Regular checkups are key to a healthy smile. Would you like to schedule your routine dental checkup?

**Interactive Buttons:**
*   [Yes, schedule checkup] *(Payload: `REQUEST_RECALL_APPT`)*
*   [Remind me next month] *(Payload: `SNOOZE_RECALL_1M`)*

---

## 4. Operational Notifications

### 4.1. Clinic Closed Auto Reply
*Triggered by the Inbound Routing service when a patient sends a free-form text outside of clinic operating hours.*

**Message Body:**
> Hello, you've reached {{1}}. We are currently closed. Our regular hours are {{2}}. We have received your message and our team will get back to you as soon as we open. If this is a medical emergency, please visit the nearest hospital.
*(No interactive buttons)*
