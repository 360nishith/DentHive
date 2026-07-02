# Week 3: Communication Engine (WhatsApp)

**Goal:** Implement the asynchronous BullMQ architecture to handle sending Meta templates and processing inbound delivery webhooks to track the TCR metric.

## 1. Tasks
*   Set up a managed Redis instance.
*   Configure BullMQ in NestJS with `outbound_messages` and `webhook_ingestion` queues.
*   Implement the Meta Cloud API connector service.
*   Build the `POST /webhooks/whatsapp` ingestion endpoint.
*   Implement the `InboundRoutingService` to process button clicks and trigger NestJS EventEmitters.
*   Setup a daily Cron Job (`@nestjs/schedule`) to process the `RecallList` and enqueue reminders.

## 2. Files to Create/Modify
*   `apps/api/src/communication/bullmq.config.ts`
*   `apps/api/src/communication/workers/outbound.worker.ts`
*   `apps/api/src/communication/workers/webhook.worker.ts`
*   `apps/api/src/communication/services/meta-api.service.ts`
*   `apps/api/src/communication/controllers/webhook.controller.ts`
*   `apps/api/src/communication/services/inbound-routing.service.ts`

## 3. APIs to Build
*   `POST /webhooks/whatsapp` - Public, unauthenticated (verified via Meta's `X-Hub-Signature`).

## 4. Database Tables Touched
*   `WhatsAppMessage` (Insert outbound, update status on inbound).
*   `RecallList` (Query via Cron, update `lastContactedAt`).
*   `FollowUp` (Create records when nudges fail).

## 5. Frontend Pages
*   No pages yet. Focus on verifying the backend processes using ngrok to tunnel Meta Webhooks to your local dev environment.

## 6. Testing Requirements
*   **Unit:** Test the exponential backoff configuration in the outbound worker.
*   **Integration:** Use a Meta test number. Send a template, verify the database records `SENT`. Open the message on a test phone, verify the webhook worker updates the DB to `READ`.
