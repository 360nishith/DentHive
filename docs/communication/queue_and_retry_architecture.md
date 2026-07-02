# Queue & Retry Architecture (WhatsApp Engine)

DentalFlow relies on the official Meta Cloud API to send and receive WhatsApp messages. Because HTTP calls to third-party APIs can be slow, rate-limited, or fail entirely, all communication is decoupled from the main thread using **Redis** and **BullMQ**.

---

## 1. BullMQ Queue Design

We implement two distinct queues to separate the traffic of outbound messages from inbound webhook processing.

### 1.1. `outbound_messages` Queue
Handles sending API requests *to* Meta.
*   **Producers:** NestJS Services (e.g., `TreatmentJourneyService` after a stage is completed, or a daily Cron Job for Recall Reminders).
*   **Consumers:** BullMQ Worker pulling jobs, formatting the JSON payload for the Meta API, and executing the HTTP POST request.
*   **Concurrency:** Limited to 10-20 concurrent jobs to avoid hitting Meta's aggressive rate limits for unverified Business Accounts.

### 1.2. `webhook_ingestion` Queue
Handles payloads received *from* Meta (inbound messages, read receipts).
*   **Producers:** The `POST /webhooks/whatsapp` API endpoint. This endpoint simply verifies the signature, pushes the raw JSON payload to this queue, and immediately returns `200 OK`.
*   **Consumers:** BullMQ Worker parsing the webhook. 
    *   If it's a delivery status update (`read`, `delivered`), it updates the `WhatsAppMessage` row in the database.
    *   If it's an inbound message from a patient, it routes it to the Inbound Routing service.

---

## 2. Retry Logic & Error Handling

Meta API requests can fail due to temporary network issues, rate limiting (`429 Too Many Requests`), or invalid phone numbers.

### 2.1. Exponential Backoff Strategy
For the `outbound_messages` queue, we configure BullMQ with a strict exponential backoff strategy:

```typescript
// BullMQ Job Configuration Concept
const jobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000, // 2s, 4s, 8s, 16s, 32s
  },
  removeOnComplete: true, // Keep Redis memory clean
  removeOnFail: false,    // Retain failed jobs for manual inspection
};
```

### 2.2. Handling Permanent Failures
If a message fails all 5 attempts (e.g., the patient blocked the clinic's number), the worker must:
1. Update the `WhatsAppMessage.status` in the database to `FAILED`.
2. Optionally, log an alert in the `FollowUp` table so the clinic knows the nudge was not delivered.

---

## 3. Delivery Tracking Architecture

A core feature of DentalFlow is knowing if a patient actually read their Next Visit Reminder.

1. **Initial Send:** Worker sends the message via Meta API. Meta responds with a `message_id` (e.g., `wamid.HBg...`).
2. **Database Record:** The worker inserts a row into the `WhatsAppMessage` table with `status = 'SENT'` and the `message_id`.
3. **Webhook Updates:** Meta fires asynchronous webhooks to `/webhooks/whatsapp` when the message is delivered to the device, and again when the user opens WhatsApp and reads it.
4. **Resolution:** The `webhook_ingestion` worker parses the `message_id` from the payload, finds the corresponding row in `WhatsAppMessage`, and updates the status to `DELIVERED` or `READ`. The frontend React Query cache polling updates the UI to show a "Double Blue Tick".
