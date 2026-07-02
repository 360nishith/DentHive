# Risk Report

**Date:** June 2026
**Subject:** Security, Multi-tenancy, and Scalability Risks
**Auditor:** Principal Software Architect

---

## 1. Security Risks

### 1.1. Tenant Id Spoofing (Critical)
*   **The Risk:** As identified in the Audit Report, if the Next.js frontend is solely responsible for extracting the `tenantId` from the subdomain and passing it as an HTTP header (`X-Tenant-Id`), the API is completely unprotected from Cross-Tenant Data Breaches. An attacker can use Postman, log in to their own legitimate account (Tenant A), get a valid JWT, and send requests with `X-Tenant-Id: Tenant-B`.
*   **Impact:** A malicious clinic could scrape the patient database of a competing clinic.

### 1.2. Binary File Uploads through NestJS (High)
*   **The Risk:** Passing large image files (X-Rays) through the NestJS backend API (`POST /files` with `multipart/form-data`) before sending them to AWS S3 exposes the Node.js server to memory exhaustion and DDoS attacks via massive payloads.
*   **Impact:** A malicious user uploading a 5GB file could crash the entire NestJS pod, causing downtime for all clinics.

---

## 2. Multi-Tenant Risks

### 2.1. Prisma Client Extensions & Dependency Injection (Medium)
*   **The Risk:** To implement Row-Level Security (RLS) dynamically per request, the `PrismaService` must be instantiated using NestJS's Request-Scoped injection (`Scope.REQUEST`). In NestJS, request-scoped providers are instantiated *on every single incoming HTTP request*, rather than acting as a Singleton.
*   **Impact:** High memory overhead and garbage collection pauses. Node.js struggles with thousands of object instantiations per second. Under heavy load (e.g., hundreds of clinics operating simultaneously), latency will spike significantly.

---

## 3. Scalability Risks

### 3.1. Webhook Queue Flooding (High)
*   **The Risk:** The architecture routes all Meta webhooks to a single `POST /webhooks/whatsapp` endpoint, dropping them into a single BullMQ queue. Meta sends webhooks for *every* state change (Sent -> Delivered -> Read). If 500 clinics send out 100 Recall Reminders each at 9:00 AM, Meta will fire 150,000+ webhooks within minutes.
*   **Impact:** The `webhook_ingestion` queue will back up. Critical inbound webhooks (like a patient replying "I have severe pain") will be stuck behind 100,000 low-priority "Read Receipt" webhooks.

### 3.2. Single Redis Instance Bottleneck (Medium)
*   **The Risk:** BullMQ relies heavily on Redis Lua scripts. If a single Redis instance is used for caching (React Query), Session Management, AND BullMQ job tracking, it can become CPU-bound.
*   **Impact:** Redis is single-threaded. Queue processing will slow down overall application caching.
