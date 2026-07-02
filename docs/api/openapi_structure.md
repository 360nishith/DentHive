# OpenAPI Structure & Global Configurations

This document outlines the global configurations for the DentalFlow REST API, adhering to the OpenAPI (Swagger) 3.0 specification.

---

## 1. Global API Information

*   **Title:** DentalFlow SaaS API
*   **Version:** `1.0.0`
*   **Description:** Multi-tenant REST API powering the DentalFlow clinical journey and WhatsApp automation engine.
*   **Base URL:** `https://api.dentalflow.in/v1`

---

## 2. Security Schemes

DentalFlow requires strict multi-tenant authorization. Two parameters dictate session state:

### 2.1. JWT Bearer Token (Authentication)
*   **Type:** `http`
*   **Scheme:** `bearer`
*   **Bearer Format:** `JWT`
*   **Usage:** Must be included in the `Authorization` header of every protected request.
    ```http
    Authorization: Bearer eyJhbGciOiJIUzI1...
    ```

### 2.2. Tenant Identification (Multi-Tenancy)
While the JWT contains the `tenantId`, the API gateway and middleware also rely on the subdomain for routing and context matching.
*   **Header / Origin:** The API expects the request `Origin` or `Host` to contain the tenant subdomain.
*   **Example:** If a request comes from `https://shenoy.dentalflow.in`, the middleware resolves `shenoy` to the internal UUID for the Shenoy Clinic and verifies it matches the JWT payload.

---

## 3. Global Response Structures

To ensure frontend consistency, all successful paginated responses and all error responses follow a strict envelope.

### 3.1. Standard Error Envelope (`4xx`, `5xx`)
```json
{
  "statusCode": 409,
  "message": "A patient with this phone number already exists.",
  "error": "Conflict",
  "timestamp": "2024-05-20T10:00:00Z",
  "path": "/v1/patients"
}
```

### 3.2. Paginated Success Envelope (`200 OK`)
Used for endpoints returning arrays of entities (e.g., `GET /patients`).
```json
{
  "data": [
    { /* entity objects */ }
  ],
  "meta": {
    "totalCount": 145,
    "page": 1,
    "limit": 20,
    "hasNextPage": true
  }
}
```

---

## 4. API Tags

Endpoints are grouped into logical tags for Swagger UI rendering:
*   `Identity`: Authentication, User Management, Tenant Config.
*   `Patients`: Patient registry and files.
*   `Treatments`: Templates, Journeys, and Stages.
*   `Scheduling`: Appointments and availability.
*   `Billing`: Payments and SaaS Subscriptions.
*   `Webhooks`: Unauthenticated ingestion endpoints for Meta and Razorpay.
