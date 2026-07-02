# Final API Specification

**Version:** 2.0 (Post-Audit Consolidation)
**Subject:** REST API Contracts for DentalFlow

---

## 1. Authentication & Tenant Routing

*   **Header Removed:** The API no longer accepts or processes the `X-Tenant-Id` header for authorization to prevent spoofing.
*   **JWT Requirement:** Every request to a protected endpoint must include an `Authorization: Bearer <JWT>` header. The JWT must contain `app_metadata.tenantId` injected by the Identity Provider (Supabase).

---

## 2. Updated Endpoints (Post-Audit Additions)

### 2.1. Secure File Uploads (S3 Pre-Signed URLs)

**`GET /files/presigned-url`**
Generates a short-lived URL allowing the frontend to upload a binary file (e.g., a PDF Consent Form or JPEG X-Ray) directly to AWS S3, bypassing the NestJS server.

*   **Request Query:**
    *   `filename` (string)
    *   `contentType` (string) - e.g., `application/pdf`
    *   `entityType` (string) - e.g., `CONSENT`, `XRAY`
*   **Response:**
    *   `200 OK`
    ```json
    {
      "uploadUrl": "https://dentalflow-bucket.s3.amazonaws.com/uuid?X-Amz-Signature=...",
      "fileKey": "tenant-id/patients/patient-id/uuid.pdf",
      "expiresIn": 300
    }
    ```

### 2.2. Invoice Management

**`POST /billing/invoices`**
Creates a formal itemized invoice for a Treatment Journey.

*   **Request Body:**
    *   `patientId` (UUID)
    *   `journeyId` (UUID)
    *   `lineItems` (Array of { description, amount })
*   **Response:** `201 Created` - Returns the `Invoice` object with `status: PENDING`.

### 2.3. WhatsApp Template Sync (Super Admin)

**`POST /admin/whatsapp/templates/sync`**
Restricted to Super Admins. Triggers an API call to Meta to submit or refresh the approval status of the 8 core WhatsApp templates for a specific clinic.

*   **Request Body:**
    *   `targetTenantId` (UUID)
*   **Response:** `200 OK` - Returns the sync job status from BullMQ.

---

## 3. Core Domain APIs (Consolidated)

### 3.1. Patients
*   `GET /patients` - List patients (supports `?search=`).
*   `POST /patients` - Register a new patient.
*   `GET /patients/:id` - Fetch patient profile, active journeys, and file links.

### 3.2. Treatments
*   `GET /treatments/templates` - Fetch available standard templates.
*   `POST /treatments/journeys` - Start a new journey (generates stages).
*   `PATCH /treatments/stages/:id/complete` - Mark stage done, triggers Post-Op WhatsApp Nudge.

### 3.3. Appointments
*   `POST /appointments` - Schedule a visit, triggers Appointment Confirmation WhatsApp template.
*   `PATCH /appointments/:id` - Reschedule or cancel.

### 3.4. Communication (Public Webhooks)
*   `POST /webhooks/whatsapp`
    *   *Note:* This endpoint is unauthenticated but validates the payload against Meta's `X-Hub-Signature` HMAC SHA256 hash. Pushes payloads to BullMQ with dynamic priority (High for messages, Low for receipts).
