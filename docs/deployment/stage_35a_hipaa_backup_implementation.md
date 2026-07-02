# STAGE 35A — HIPAA-Compliant Backup & Disaster Recovery

**Subject:** Cryptographic Data-at-Rest Security
**Architecture:** Asymmetric GPG Encryption, RAM-only processing, AWS S3
**Compliance:** HIPAA, GDPR

This document supersedes the initial Deployment Guide. It enforces an **Asymmetric Encryption** model. The production server is mathematically restricted to only *encrypting* backups. It cannot decrypt them. If a malicious actor gains `root` access to the server or the S3 bucket, the Patient Health Information (PHI) remains completely unreadable.

---

## 1. GPG Key Management (Offline Vault)

The Cryptographic keys must be generated on a highly secure, offline machine (e.g., an Admin's local Macbook), **not on the VPS**.

### Step 1: Generate the Asymmetric Keypair
Run this on your secure local machine:
```bash
gpg --full-generate-key
# Select: (1) RSA and RSA
# Keysize: 4096 bits
# Expiry: 0 (Key does not expire)
# Name: DentalFlowAdmin
# Email: admin@dentalflow.com
# PASSPHRASE: Use a 32-character master password and store it in 1Password.
```

### Step 2: Export the Keys
```bash
# 1. Export the Public Key (Safe to put on the server)
gpg --export -a "DentalFlowAdmin" > public_key.asc

# 2. Export the Private Key (DO NOT PUT THIS ON THE SERVER)
gpg --export-secret-key -a "DentalFlowAdmin" > private_key.asc
```
**CRITICAL:** Store `private_key.asc` and its Passphrase in a secure physical vault or an enterprise password manager. 

### Step 3: Install Public Key on Production VPS
Upload `public_key.asc` to your Ubuntu VPS and import it into the root user's keyring:
```bash
sudo gpg --import public_key.asc
sudo gpg --edit-key "DentalFlowAdmin"
# Type 'trust', select '5' (Ultimate), type 'save'.
```

---

## 2. The Backup Script (`/opt/dentalflow/scripts/backup.sh`)

This script pipes the database dump directly into GPG entirely in server RAM. A plaintext `.sql` file never touches the physical hard drive.

```bash
#!/bin/bash
# /opt/dentalflow/scripts/backup.sh

set -e

BACKUP_DIR="/opt/dentalflow/backups"
TIMESTAMP=$(date +\%F-\%H\%M\%S)
FILENAME="dentalflow_db_$TIMESTAMP.sql.gz.gpg"
S3_BUCKET="s3://dentalflow-hipaa-backups/database/"
RECIPIENT="admin@dentalflow.com"

mkdir -p $BACKUP_DIR

echo "Starting encrypted backup at $TIMESTAMP..."

# 1. In-Memory Piped Encryption
# pg_dump -> gzip -> GPG Public Key Encryption -> File on Disk
docker exec dentalflow-postgres-1 pg_dump -U dental_admin dentalflow \
  | gzip \
  | gpg --encrypt --recipient "$RECIPIENT" --trust-model always \
  > "$BACKUP_DIR/$FILENAME"

echo "Backup encrypted successfully: $FILENAME"

# 2. Upload to S3
# Requires AWS CLI to be configured (`aws configure`)
aws s3 cp "$BACKUP_DIR/$FILENAME" "$S3_BUCKET"

echo "Backup uploaded to S3."

# 3. Local Retention Policy (Delete files older than 3 days)
find $BACKUP_DIR -type f -name "*.gpg" -mtime +3 -delete

echo "Cleanup complete."
# Optional: Trigger Slack/Discord success webhook here
```
*Make executable:* `chmod +x /opt/dentalflow/scripts/backup.sh`
*Cron Schedule:* `0 2 * * * /opt/dentalflow/scripts/backup.sh`

---

## 3. The Restore Script (`/opt/dentalflow/scripts/restore.sh`)

This script is only used during a Disaster Recovery scenario. It requires the Admin to physically copy the `private_key.asc` onto the recovery machine and type the master passphrase.

```bash
#!/bin/bash
# /opt/dentalflow/scripts/restore.sh

if [ -z "$1" ]; then
  echo "Usage: ./restore.sh <path_to_encrypted_backup.sql.gz.gpg>"
  exit 1
fi

ENCRYPTED_FILE=$1

# 1. Verify GPG Private Key is loaded
if ! gpg --list-secret-keys | grep -q "DentalFlowAdmin"; then
  echo "CRITICAL ERROR: Private Key not found in GPG keyring."
  echo "Please run: gpg --import private_key.asc"
  exit 1
fi

echo "WARNING: This will drop the existing 'dentalflow' database and restore from backup."
read -p "Are you sure? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# 2. Decrypt, Unzip, and Restore in RAM
# This will prompt you for the offline vault passphrase!
echo "Decrypting and restoring..."
gpg --decrypt "$ENCRYPTED_FILE" | gunzip | docker exec -i dentalflow-postgres-1 psql -U dental_admin -d dentalflow

echo "Restore complete!"
```

---

## 4. Disaster Recovery (DR) Runbook

If the production VPS catches fire or the Datacenter goes offline, follow this exact sequence to restore the SaaS:

1.  **Provision:** Spin up a new Ubuntu VPS.
2.  **Clone:** `git clone` the DentalFlow infrastructure repository and run `docker compose up -d` to spin up a fresh, empty PostgreSQL database.
3.  **Fetch:** Download the latest `dentalflow_db_XXXX.sql.gz.gpg` file from the AWS S3 Backup Bucket.
4.  **Key Import:** Securely transfer the `private_key.asc` from your 1Password vault to the new VPS. Run `gpg --import private_key.asc`.
5.  **Restore:** Execute `./restore.sh dentalflow_db_XXXX.sql.gz.gpg`. Enter the master passphrase when prompted.
6.  **Verify & Clean:** Verify the clinic data is visible in the SaaS dashboard. **CRITICAL:** Immediately delete `private_key.asc` from the new VPS and remove it from the GPG keyring (`gpg --delete-secret-keys admin@dentalflow.com`) so the new server returns to an "Encrypt-Only" state.
