# Database Schema Definitions

This document details the PostgreSQL table schemas, data types, constraints, and relationships for DentalFlow. 

**Note on Multi-Tenancy:** Every operational table contains a `tenant_id` column with a `NOT NULL` constraint and a Foreign Key linking to the `tenants` table. This is the foundation for the Row-Level Security (RLS) policies.

---

## 1. Identity & Access Module

### `tenants`
The root entity representing a dental clinic.
*   `id` (UUID, Primary Key, Default `uuid_generate_v4()`)
*   `name` (VARCHAR 255, NOT NULL)
*   `subdomain` (VARCHAR 100, UNIQUE, NOT NULL)
*   `upi_vpa` (VARCHAR 255, NULL) - *For dynamic QR payments.*
*   `created_at` (TIMESTAMPTZ, Default `NOW()`)

### `roles`
System-defined roles (e.g., Dentist, Assistant).
*   `id` (UUID, Primary Key)
*   `name` (VARCHAR 50, UNIQUE, NOT NULL) - *CHECK (name IN ('DENTIST', 'ASSISTANT'))*

### `users`
Staff members who log into the SaaS.
*   `id` (UUID, Primary Key)
*   `tenant_id` (UUID, NOT NULL, FK to `tenants(id)`)
*   `role_id` (UUID, NOT NULL, FK to `roles(id)`)
*   `email` (VARCHAR 255, UNIQUE, NULL)
*   `phone_number` (VARCHAR 20, UNIQUE, NOT NULL)
*   `password_hash` (VARCHAR 255, NOT NULL)
*   `is_active` (BOOLEAN, Default `TRUE`)

---

## 2. Patient Management Module

### `patients`
*   `id` (UUID, Primary Key)
*   `tenant_id` (UUID, NOT NULL, FK to `tenants(id)`)
*   `name` (VARCHAR 255, NOT NULL)
*   `phone_number` (VARCHAR 20, NOT NULL) - *MUST include country code for WhatsApp API.*
*   `whatsapp_opt_in` (BOOLEAN, Default `FALSE`)
*   `gender` (VARCHAR 20, NULL)
*   `date_of_birth` (DATE, NULL)
*   `preferred_language` (VARCHAR 10, Default `'en'`) - *e.g., 'en', 'kn', 'ml'*
*   **Constraint:** `UNIQUE(tenant_id, phone_number)` - A patient is unique per clinic.

### `files`
*   `id` (UUID, Primary Key)
*   `tenant_id` (UUID, NOT NULL, FK to `tenants(id)`)
*   `patient_id` (UUID, NOT NULL, FK to `patients(id)`)
*   `file_url` (VARCHAR 1024, NOT NULL)
*   `file_type` (VARCHAR 50, NOT NULL) - *CHECK (file_type IN ('IMAGE', 'PDF'))*
*   `uploaded_at` (TIMESTAMPTZ, Default `NOW()`)

---

## 3. Clinical Configuration Module

### `treatment_templates`
Blueprints defined by the clinic (e.g., "RCT + Crown").
*   `id` (UUID, Primary Key)
*   `tenant_id` (UUID, NOT NULL, FK to `tenants(id)`)
*   `name` (VARCHAR 255, NOT NULL)
*   `estimated_cost` (INTEGER, Default 0) - *Stored in smallest currency unit (paise).*

### `template_stages`
The ordered milestones within a template.
*   `id` (UUID, Primary Key)
*   `template_id` (UUID, NOT NULL, FK to `treatment_templates(id)`)
*   `sequence_order` (INTEGER, NOT NULL)
*   `name` (VARCHAR 255, NOT NULL)
*   `default_interval_days` (INTEGER, Default 0) - *Expected gap before this stage.*
*   **Constraint:** `UNIQUE(template_id, sequence_order)`

---

## 4. Journey & Stage Execution Module

### `treatment_journeys`
An active instance of a treatment for a specific patient.
*   `id` (UUID, Primary Key)
*   `tenant_id` (UUID, NOT NULL, FK to `tenants(id)`)
*   `patient_id` (UUID, NOT NULL, FK to `patients(id)`)
*   `template_id` (UUID, NOT NULL, FK to `treatment_templates(id)`)
*   `current_stage_id` (UUID, NULL, FK to `treatment_stages(id)`) - *Allows fast lookup of current state.*
*   `status` (VARCHAR 50, NOT NULL) - *CHECK (status IN ('ACTIVE', 'STALLED', 'COMPLETED', 'SUSPENDED'))*
*   `total_cost` (INTEGER, NOT NULL)
*   `started_at` (TIMESTAMPTZ, Default `NOW()`)
*   `completed_at` (TIMESTAMPTZ, NULL)

### `treatment_stages`
The instantiated milestones for a specific journey.
*   `id` (UUID, Primary Key)
*   `tenant_id` (UUID, NOT NULL, FK to `tenants(id)`)
*   `journey_id` (UUID, NOT NULL, FK to `treatment_journeys(id)`)
*   `template_stage_id` (UUID, NOT NULL, FK to `template_stages(id)`)
*   `status` (VARCHAR 50, NOT NULL) - *CHECK (status IN ('PENDING', 'COMPLETED'))*
*   `completed_at` (TIMESTAMPTZ, NULL)

---

## 5. Scheduling & Automation Module

### `appointments`
*   `id` (UUID, Primary Key)
*   `tenant_id` (UUID, NOT NULL, FK to `tenants(id)`)
*   `patient_id` (UUID, NOT NULL, FK to `patients(id)`)
*   `treatment_stage_id` (UUID, NOT NULL, FK to `treatment_stages(id)`)
*   `scheduled_start` (TIMESTAMPTZ, NOT NULL)
*   `scheduled_end` (TIMESTAMPTZ, NOT NULL)
*   `status` (VARCHAR 50, NOT NULL) - *CHECK (status IN ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW', 'CANCELLED'))*

### `follow_ups`
Internal queue for background workers.
*   `id` (UUID, Primary Key)
*   `tenant_id` (UUID, NOT NULL, FK to `tenants(id)`)
*   `stage_id` (UUID, NOT NULL, FK to `treatment_stages(id)`)
*   `trigger_at` (TIMESTAMPTZ, NOT NULL)
*   `nudge_type` (VARCHAR 50, NOT NULL) - *e.g., 'POST_OP', 'MISSED_APPT'*
*   `status` (VARCHAR 50, Default `'PENDING'`) - *CHECK (status IN ('PENDING', 'PROCESSED', 'CANCELLED'))*

### `recall_lists`
*   `id` (UUID, Primary Key)
*   `tenant_id` (UUID, NOT NULL, FK to `tenants(id)`)
*   `patient_id` (UUID, NOT NULL, FK to `patients(id)`)
*   `recall_date` (DATE, NOT NULL)
*   `reason` (VARCHAR 255, NOT NULL)
*   `status` (VARCHAR 50, Default `'PENDING'`)

---

## 6. Financial & Communication Logs

### `payments`
*   `id` (UUID, Primary Key)
*   `tenant_id` (UUID, NOT NULL, FK to `tenants(id)`)
*   `journey_id` (UUID, NOT NULL, FK to `treatment_journeys(id)`)
*   `amount` (INTEGER, NOT NULL)
*   `status` (VARCHAR 50, NOT NULL) - *CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'))*
*   `payment_method` (VARCHAR 50, NOT NULL) - *CHECK (payment_method IN ('UPI', 'CASH', 'CARD'))*
*   `recorded_at` (TIMESTAMPTZ, Default `NOW()`)

### `whatsapp_messages`
*   `id` (UUID, Primary Key)
*   `tenant_id` (UUID, NOT NULL, FK to `tenants(id)`)
*   `patient_id` (UUID, NOT NULL, FK to `patients(id)`)
*   `direction` (VARCHAR 10, NOT NULL) - *CHECK (direction IN ('INBOUND', 'OUTBOUND'))*
*   `status` (VARCHAR 50, NOT NULL) - *CHECK (status IN ('SENT', 'DELIVERED', 'READ', 'FAILED', 'RECEIVED'))*
*   `payload` (JSONB, NOT NULL) - *Stores full Meta API response payload for rendering rich UI.*
*   `created_at` (TIMESTAMPTZ, Default `NOW()`)

---

## 7. SaaS & Security Module

### `subscriptions`
*   `id` (UUID, Primary Key)
*   `tenant_id` (UUID, NOT NULL, FK to `tenants(id)`)
*   `plan_tier` (VARCHAR 50, NOT NULL) - *CHECK (plan_tier IN ('LITE', 'GROWTH', 'ENTERPRISE'))*
*   `razorpay_sub_id` (VARCHAR 255, UNIQUE, NULL)
*   `status` (VARCHAR 50, NOT NULL) - *CHECK (status IN ('ACTIVE', 'PAST_DUE', 'CANCELLED'))*
*   `current_period_end` (TIMESTAMPTZ, NOT NULL)

### `audit_logs`
*   `id` (UUID, Primary Key)
*   `tenant_id` (UUID, NOT NULL, FK to `tenants(id)`)
*   `user_id` (UUID, NOT NULL, FK to `users(id)`)
*   `action` (VARCHAR 100, NOT NULL) - *e.g., 'JOURNEY_CREATED', 'PAYMENT_RECORDED'*
*   `entity_type` (VARCHAR 50, NOT NULL)
*   `entity_id` (UUID, NOT NULL)
*   `changes` (JSONB, NULL) - *Diff of what was altered.*
*   `created_at` (TIMESTAMPTZ, Default `NOW()`)
