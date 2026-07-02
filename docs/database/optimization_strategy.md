# Database Query Optimization & Indexing Strategy

DentalFlow's database strategy is built on PostgreSQL. Given the Multi-Tenant Row-Level Security (RLS) architecture, our indexing strategy is paramount. Without proper indexing, RLS can lead to sequential scans across the entire table, degrading performance significantly as the SaaS scales.

---

## 1. Multi-Tenant Composite Indexing Rule

Because every operational query automatically appends a `WHERE tenant_id = 'xxx'` clause (via RLS), **almost every index must be a composite index starting with `tenant_id`**.

If we create a standard index on `patient_id` alone, PostgreSQL might still have to filter out the `tenant_id` post-index scan. By starting the index with `tenant_id`, we ensure the database instantly seeks to the specific clinic's data partition within the B-Tree.

### Core Examples:
*   **Patients Table:**
    ```sql
    CREATE INDEX idx_patients_tenant_phone ON patients (tenant_id, phone_number);
    CREATE INDEX idx_patients_tenant_name ON patients (tenant_id, name);
    ```
*   **Journeys Table:**
    ```sql
    CREATE INDEX idx_journeys_tenant_patient ON treatment_journeys (tenant_id, patient_id);
    CREATE INDEX idx_journeys_tenant_status ON treatment_journeys (tenant_id, status);
    ```

---

## 2. Background Worker Optimization

The background cron jobs (e.g., polling for stalled journeys or due follow-ups) query the database constantly. These queries must be heavily optimized to prevent locking and high CPU utilization.

### The "Stalled Journey" Query
The background worker looks for active journeys where the next stage is overdue:
```sql
SELECT id FROM treatment_journeys 
WHERE status = 'ACTIVE' 
AND next_expected_date < NOW(); -- (Abstracted logic based on stages)
```
*   **Optimization:** A Partial Index.
    ```sql
    CREATE INDEX idx_active_journeys 
    ON treatment_journeys (tenant_id) 
    WHERE status = 'ACTIVE';
    ```
    *This ensures the index only holds currently active workflows, keeping it extremely small and fast to scan.*

### The "Follow-Up" Worker Query
The worker polls the `follow_ups` table for nudges that need to be sent immediately.
```sql
SELECT * FROM follow_ups 
WHERE status = 'PENDING' AND trigger_at <= NOW();
```
*   **Optimization:** Composite index covering the exact filtering criteria.
    ```sql
    CREATE INDEX idx_pending_followups 
    ON follow_ups (tenant_id, status, trigger_at);
    ```

---

## 3. JSONB Strategies

For tables storing variable or unstructured data (e.g., `whatsapp_messages`, `audit_logs`), we utilize PostgreSQL's `JSONB` column type.

### WhatsApp Webhook Payloads
When a webhook arrives from Meta, we store the full payload in the `whatsapp_messages.payload` column. We primarily retrieve messages by `patient_id`, so the relational column `patient_id` is indexed. 

If we ever need to search *inside* the payload (e.g., finding all messages containing a specific WhatsApp Message ID `wamid`), we will employ a **GIN (Generalized Inverted Index)**:
```sql
CREATE INDEX idx_whatsapp_payload_gin ON whatsapp_messages USING GIN (payload);
```

---

## 4. Foreign Key Constraints & Cascading

*   **Enforcement:** All relational fields (e.g., `patient_id`, `journey_id`) must have explicit Foreign Key constraints to maintain data integrity.
*   **ON DELETE Restrict vs Cascade:** 
    *   To prevent accidental data loss of clinical records, `ON DELETE RESTRICT` will be the default behavior for entities like `patients` and `journeys`.
    *   A patient cannot be deleted if they have an active journey or payment history. They must be archived (soft-deleted using an `is_active` boolean) instead.

---

## 5. Subdomain Resolution Optimization

When a user accesses `shenoy.dentalflow.in`, the Auth Middleware needs to quickly verify the subdomain against the `tenants` table.
```sql
CREATE UNIQUE INDEX idx_tenants_subdomain ON tenants (subdomain);
```
Since `subdomain` is highly selective and heavily queried at the routing layer, this unique B-Tree index guarantees $O(\log n)$ lookup times before any RLS policies are even instantiated.
