# Playbook: Infrastructure & Disaster Recovery

This playbook outlines the backup strategies and data restoration procedures for the DentalFlow PostgreSQL database. Because DentalFlow handles sensitive medical histories, data integrity and disaster recovery (DR) are paramount.

---

## 1. Backup Strategy

The production PostgreSQL database runs on a managed service (e.g., AWS RDS or Supabase) with the following automated backup features enabled:

1.  **Daily Snapshots:** A full snapshot of the entire database is taken every day at 02:00 AM IST. These snapshots are retained for 30 days.
2.  **Point-In-Time Recovery (PITR):** Write-Ahead Logs (WAL) are archived continuously. This allows DevOps to restore the entire database to any specific second within the last 7 days.
3.  **Cross-Region Replication:** Read-replicas are maintained in a secondary geographic region. In the event of a total data center failure, the application will automatically failover to the read-replica, promoting it to the primary writer.

---

## 2. Disaster Recovery: Restoring Data

Because DentalFlow is a multi-tenant application using a shared database with Row-Level Security (RLS), **we cannot blindly restore a full database snapshot** if only a single clinic (Tenant) experiences data loss. Doing so would overwrite and revert the data of all other healthy clinics.

### Scenario: Single Tenant Data Corruption
*Example: A clinic accidentally deleted a patient's entire journey history (if soft-deletes failed) and requests a rollback to yesterday.*

**Step 1: Clone the Database from a Snapshot**
1. Do *not* touch the live production database.
2. Use the cloud provider's console to restore the daily snapshot (or PITR) to a **new, temporary database instance** (e.g., `dentalflow-db-recovery-temp`).

**Step 2: Extract the Tenant's Data**
1. Connect to the temporary recovery database via `psql` or `pg_dump`.
2. Extract only the rows belonging to the affected `tenantId`.
   ```bash
   pg_dump -d dentalflow-db-recovery-temp \
     -t patients -t treatment_journeys -t treatment_stages -t appointments \
     --data-only \
     --filter="tenantId = 'target-uuid-here'" > tenant_backup.sql
   ```
   *(Note: Adjust the exact filtering syntax based on the pg_dump extensions or use custom SQL scripts to `COPY TO` CSV).*

**Step 3: Clean & Restore in Production**
1. Connect to the live production database.
2. Carefully remove the corrupted rows for that specific `tenantId`.
3. Import the clean data extracted from the recovery database.
4. Verify data integrity on the frontend.

**Step 4: Cleanup**
1. Terminate the temporary recovery database instance to save costs.

---

## 3. Storage Architecture for Files (Images/PDFs)

*   Patient X-Rays and PDF reports are **not** stored in PostgreSQL. They are uploaded directly to an AWS S3 bucket.
*   The `File` table in Postgres only holds the string URL referencing the S3 object.
*   **S3 Configuration:** The S3 bucket must have "Object Versioning" enabled to prevent accidental overwrites and "Cross-Region Replication" enabled for DR compliance.
