# Architecture Audit Report

**Date:** June 2026
**Subject:** DentalFlow SaaS Platform Documentation (Phases 1-11)
**Auditor:** Principal Software Architect

---

## 1. Executive Summary
The overall architecture designed across the 11 phases is robust, leaning on modern, scalable paradigms (DDD, Event-driven Queues, Next.js App Router). The strict adherence to the "WhatsApp-first" philosophy and the tracking of the Treatment Completion Rate (TCR) is well-represented in the database and API design. 

However, a thorough audit reveals several critical contradictions and missing domain requirements that must be addressed before the implementation sprint begins.

---

## 2. Identified Contradictions

### 2.1. Multi-Tenant Resolution Conflict
*   **Phase 7 (Frontend):** States that custom Next.js Middleware extracts the `tenantId` from the Subdomain (`Host` header) and passes it to the backend via an `X-Tenant-Id` header.
*   **Phase 5 (Backend):** States that the Identity Provider (Supabase/Auth0) handles authentication. 
*   **The Conflict:** Relying solely on the `X-Tenant-Id` header sent by the client is a massive vulnerability. A malicious user authenticated in `clinic-a` could simply change their HTTP header to `X-Tenant-Id: clinic-b` and bypass RLS if the backend blindly trusts the header. The backend *must* derive the `tenantId` cryptographically from the JWT claims, not the HTTP header.

### 2.2. Webhook Routing Bottleneck
*   **Phase 10 (Operations):** States a single `POST /webhooks/whatsapp` endpoint handles traffic for *all* clinics, relying on BullMQ to parse the `waba_id` to route it to the correct tenant.
*   **The Conflict:** If Meta sends a burst of thousands of Read Receipts globally, the single webhook controller could become a bottleneck. We need a way to partition webhook queues by `tenantId` or drop low-priority webhooks (like `SENT` receipts) at the API Gateway level to prevent queue flooding.

---

## 3. Missing Requirements & Entities

### 3.1. Clinical Documentation & Consent
*   The `Patient` and `TreatmentJourney` models exist, but we missed a critical medical requirement: **Patient Consent Forms**. 
*   **Missing Entity:** A `ConsentForm` or generic `Document` entity linked to the `TreatmentJourney`. Dentists must collect digital signatures or upload physical consent forms before starting complex procedures like Root Canals.

### 3.2. Financial Granularity (Invoicing)
*   The API spec defined `GET /payments/qr` and `POST /billing/payments`.
*   **Missing Entity:** There is no concept of an `Invoice`. The system tracks `totalCost` on the Journey, and `amountPaid`, but patients often require formal, itemized invoices with invoice numbers for their own records or tax purposes. We need an `Invoice` and `InvoiceLineItem` table.

### 3.3. Granular Role-Based Access Control (RBAC)
*   We defined `User` and `Role` (`DENTIST`, `STAFF`).
*   **Missing Requirement:** What happens if a clinic has multiple dentists, or a receptionist who shouldn't see clinic revenue? We need a `Permission` mapping table, or at least a strict enum definition of what `STAFF` is explicitly denied from viewing (e.g., the Revenue Recovery page).

---

## 4. Missing API Endpoints

1.  **WhatsApp Template Management:** We documented how the operations team submits templates to Meta (Phase 10), but we missed the API endpoints for the Super Admin frontend to actually trigger these submissions (`POST /admin/whatsapp/templates/sync`).
2.  **Pre-Signed URLs for S3:** Phase 10 mentions storing X-Rays in S3, but there is no `GET /files/presigned-url` endpoint defined in the API spec to allow the frontend to securely upload those files directly to S3 without passing binary data through the NestJS backend.
