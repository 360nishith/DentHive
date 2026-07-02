# Billing & Communication API

This module handles the financial tracking for Treatment Journeys and the external webhooks for the automated WhatsApp nudges.

---

## 1. Payments & Revenue Tracking

### `POST /payments`
Records a payment against a specific Treatment Journey.

*   **Security:** Bearer Token.
*   **Request DTO (`RecordPaymentDto`):**
    ```typescript
    {
      @IsUUID() journeyId: string;
      @IsInt() @Min(1) amount: number; // Stored in paise
      @IsEnum(['UPI', 'CASH', 'CARD']) paymentMethod: string;
    }
    ```
*   **Response (`201 Created`):**
    ```json
    {
      "id": "uuid",
      "amount": 500000,
      "status": "SUCCESS",
      "recordedAt": "2024-05-20T10:00:00Z"
    }
    ```
*   **Validation Rules:**
    *   `400 Bad Request` if the payment `amount` exceeds the remaining balance of the `totalCost` of the Journey.

### `GET /payments/qr`
Generates a dynamic UPI QR string for front-end rendering.

*   **Security:** Bearer Token.
*   **Query Parameters:** `?amount=500000`
*   **Response (`200 OK`):**
    ```json
    {
      "upiString": "upi://pay?pa=shenoy@okicici&pn=Shenoy%20Dental&am=5000.00"
    }
    ```

---

## 2. SaaS Subscription Management

### `POST /billing/upgrade`
Generates a Razorpay payment link to upgrade the clinic's SaaS tier.

*   **Security:** Bearer Token. Role: `DENTIST`.
*   **Request DTO (`UpgradePlanDto`):**
    ```typescript
    {
      @IsEnum(['GROWTH', 'ENTERPRISE']) planTier: string;
    }
    ```

---

## 3. Webhooks (External Ingestion)

Webhooks do **not** use the standard Bearer Token authentication. They rely on cryptographic signatures to verify the payload sender.

### `POST /webhooks/whatsapp`
Receives inbound messages and delivery status updates from the Meta Cloud API.

*   **Security:** Cryptographic Signature Verification (`X-Hub-Signature-256`).
*   **Request DTO:** (Implicitly validated against Meta's JSON schema).
    *   No strict class-validator DTO is used here to prevent breaking if Meta adds new fields.
*   **Response (`200 OK`):**
    *   Always responds `200 OK` immediately (or `401` if signature fails) to prevent Meta from retrying.
    *   The payload is offloaded to the Redis Event Bus (`BullMQ`) for asynchronous processing.

### `POST /webhooks/razorpay`
Receives SaaS subscription payment success/failure events.

*   **Security:** Signature Verification (`X-Razorpay-Signature`).
*   **Response (`200 OK`):**
    *   Triggers business logic: If a SaaS payment fails, updates the `Subscription` status to `PAST_DUE` and immediately suspends the `Tenant`.
