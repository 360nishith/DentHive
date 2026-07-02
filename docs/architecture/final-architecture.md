# Final System Architecture

**Version:** 2.0 (Post-Audit Consolidation)
**Subject:** High-Level Architecture for DentalFlow SaaS

---

## 1. Core Paradigm & Philosophy

DentalFlow is a multi-tenant, event-driven SaaS platform built for solo dental practitioners. 
*   **Philosophy:** "WhatsApp First" - The platform prioritizes automated patient communication to drive the core metric: **Treatment Completion Rate (TCR)**.
*   **Domain-Driven Design:** Strict boundaries between `Identity`, `Clinical (Treatments)`, `Scheduling`, `Billing`, and `Communication`.

---

## 2. Monorepo Infrastructure (Turborepo)

The application is structured as a TypeScript monorepo to share types between the frontend and backend.

### 2.1. Frontend App (`apps/web`)
*   **Framework:** Next.js (App Router)
*   **Styling:** Tailwind CSS + Shadcn UI
*   **State Management:** React Query (Server State) + Zustand (Client State)
*   **Routing:** Custom Next.js Middleware maps `tenant-subdomain.dentalflow.co` to the correct internal route.
*   **Authentication:** Supabase Auth (JWTs).

### 2.2. Backend App (`apps/api`)
*   **Framework:** NestJS
*   **Architecture:** Modular, Event-Driven
*   **Database ORM:** Prisma (with strict Row-Level Security extensions)
*   **Queue System:** BullMQ for asynchronous workloads

---

## 3. Communication Engine (BullMQ + Meta Cloud API)

To prevent the Node.js event loop from blocking during slow external API calls, all WhatsApp communication is decoupled.

### 3.1. Dual-Redis Strategy
*   **`redis-cache`**: Used by NestJS for rate limiting and standard API caching.
*   **`redis-bullmq`**: A dedicated instance strictly handling job queues. This ensures queue processing doesn't degrade basic API response times.

### 3.2. Outbound Queues
*   When a stage is completed or an appointment booked, a Domain Event is fired.
*   The `CommunicationModule` listens to this event and pushes a job to the `outbound_messages` queue.
*   The worker uses **Exponential Backoff** to retry failed requests to the Meta Cloud API.

### 3.3. Inbound Queues (Priority Webhooks)
*   The `POST /webhooks/whatsapp` endpoint pushes incoming payloads to the `webhook_ingestion` queue.
*   **Priority Routing:** To prevent queue flooding during bulk sends, the controller inspects the payload:
    *   `messages` (Patient replies/button clicks) -> **Priority 1** (High)
    *   `statuses` (Read/Delivered receipts) -> **Priority 5** (Low)

---

## 4. Storage Architecture

### 4.1. Relational Data
*   **PostgreSQL:** Handles all structured data (Patients, Appointments, Journeys).

### 4.2. Binary Data (X-Rays & Documents)
*   **AWS S3:** To prevent Node.js memory exhaustion, binary files are *never* uploaded through the NestJS API.
*   **Pre-Signed URLs:** The Next.js frontend requests a short-lived, pre-signed URL from NestJS, and uploads the file directly to S3. NestJS only stores the resulting string URL in PostgreSQL.
