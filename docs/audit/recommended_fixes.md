# Recommended Architectural Fixes

**Date:** June 2026
**Subject:** Actionable Fixes for Audited Risks
**Auditor:** Principal Software Architect

---

## 1. Security & Multi-Tenant Fixes

### 1.1. Resolve Tenant Spoofing (JWT Integration)
**The Fix:** Abandon the `X-Tenant-Id` header for backend authorization. 
*   **Action:** When a user logs in, Supabase/Auth0 must inject the `tenantId` into the JWT's `app_metadata` during token generation.
*   **Implementation:** In NestJS, the Auth Guard decodes the JWT, extracts `tenantId`, and attaches it directly to the Express `Request` object. The Prisma RLS extension reads the `tenantId` strictly from the validated JWT, guaranteeing cryptographic security. The frontend Subdomain is used purely for UI routing, not backend authorization.

### 1.2. Solve File Upload DDoS (Pre-Signed URLs)
**The Fix:** Offload binary uploads entirely to AWS S3.
*   **Action:** Create a new endpoint `GET /files/presigned-url`. 
*   **Implementation:** The Next.js frontend requests a short-lived S3 pre-signed URL from NestJS. The frontend then uploads the file directly to S3 via a `PUT` request. Once successful, the frontend calls `POST /files` sending only the string URL to save in the PostgreSQL database. This prevents Node.js memory exhaustion.

### 1.3. Optimize Prisma RLS Injection
**The Fix:** Avoid NestJS Request-Scoped providers to prevent garbage collection bottlenecks.
*   **Implementation:** Instead of injecting a request-scoped `PrismaService`, use Node.js `AsyncLocalStorage` (ALS). ALS allows you to set the `tenantId` at the middleware level and access it globally within the execution context of that specific request without requiring request-scoped dependency injection overhead.

---

## 2. Scalability Fixes

### 2.1. Webhook Queue Triage (Priority Lanes)
**The Fix:** Implement BullMQ priority routing to prevent critical inbound messages from getting stuck behind thousands of delivery receipts.
*   **Implementation:** At the `POST /webhooks/whatsapp` controller level, quickly inspect the JSON payload:
    *   If payload type == `messages` (A patient actually replied), push to `webhook_ingestion` with `priority: 1` (High).
    *   If payload type == `statuses` (Read/Delivered receipt), push to `webhook_ingestion` with `priority: 5` (Low).

### 2.2. Redis Separation
**The Fix:** Provision two distinct Redis instances in production.
*   `redis-cache`: Used for standard application caching and rate-limiting.
*   `redis-bullmq`: Dedicated solely to BullMQ for reliable, fast queue processing without competing for CPU cycles with basic GET/SET cache commands.

---

## 3. Database Schema Fixes (Missing Entities)

To resolve the missing clinical and financial granularity, the following models must be added to the Prisma Schema before Week 1 execution:

```prisma
model ConsentForm {
  id                String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId          String           @db.Uuid
  patientId         String           @db.Uuid
  treatmentJourneyId String          @db.Uuid
  documentUrl       String           // S3 Link
  signedAt          DateTime
  createdAt         DateTime         @default(now())
  
  @@index([tenantId, patientId])
}

model Invoice {
  id                String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId          String           @db.Uuid
  patientId         String           @db.Uuid
  journeyId         String           @db.Uuid
  invoiceNumber     String           // e.g., INV-2026-001
  subtotal          Decimal
  tax               Decimal
  totalAmount       Decimal
  amountPaid        Decimal
  status            InvoiceStatus    // PENDING, PARTIALLY_PAID, PAID
  
  lineItems         InvoiceLineItem[]
  payments          Payment[]
}

model InvoiceLineItem {
  id                String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  invoiceId         String           @db.Uuid
  description       String           // e.g., "Root Canal - Stage 1"
  amount            Decimal
}
```
