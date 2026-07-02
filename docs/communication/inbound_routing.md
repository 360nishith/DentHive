# Inbound Message Routing

When the Meta Cloud API sends an inbound webhook, the `webhook_ingestion` BullMQ worker pulls the payload and passes it to the `InboundRoutingService`. This service determines the intent of the message and triggers the appropriate domain logic.

---

## 1. Routing Flow

The `InboundRoutingService` evaluates the payload based on two distinct message types: **Interactive Replies** (button clicks) and **Free-form Text**.

### 1.1. Interactive Replies (Button Clicks)
When a user taps a button on a template, Meta sends the predefined payload string (e.g., `CONFIRM_APPT_REQUEST`).

**Routing Logic:**
1.  **Parse Payload:** Extract the `payload` string and the `patientId` (inferred from the WhatsApp ID/phone number).
2.  **Match Intent:**
    *   `CONFIRM_APPT_REQUEST` ➡️ Find the pending `Appointment` for this patient and update `status` to `CONFIRMED`.
    *   `REQUEST_RESCHEDULE` ➡️ Find the pending/confirmed `Appointment`, update `status` to `CANCELLED`, and trigger an internal notification for the clinic staff to call the patient.
    *   `POST_OP_ISSUE` ➡️ Find the active `TreatmentJourney`, flag it with a high-priority alert, and push a real-time WebSocket notification to the Dentist's dashboard.
    *   `SNOOZE_RECALL_1M` ➡️ Find the `RecallList` entry and update the `recallDate` to `now() + 30 days`.

### 1.2. Free-form Text Messages
When a patient types a custom message (e.g., "I am running 10 minutes late").

**Routing Logic:**
1.  **Store Message:** Save the text to the `WhatsAppMessage` table so it appears in the patient's communication history.
2.  **Clinic Hours Check:**
    *   Query the `Tenant` settings to check `operatingHours`.
    *   If `currentTime` is outside operating hours (e.g., 2:00 AM), immediately enqueue the **Clinic Closed Auto Reply** template to the `outbound_messages` queue.
3.  **Staff Notification:** If the clinic is open, flag the message in the dashboard UI so the receptionist/dentist can read and reply manually.

---

## 2. Event-Driven Architecture (Internal)

To maintain strict DDD boundaries, the `InboundRoutingService` does not directly mutate the database tables of other modules. Instead, it fires **Domain Events** via NestJS `EventEmitter2`.

*   **Example Flow:**
    1. Patient clicks `[Confirm Appointment]`.
    2. Meta sends webhook ➡️ BullMQ Worker ➡️ `InboundRoutingService`.
    3. Service fires event: `eventEmitter.emit('whatsapp.interactive.appt_confirmed', { patientId })`
    4. The `TreatmentModule` listens to this event, fetches the appointment, and executes the database `UPDATE` transaction safely within its own bounded context.
