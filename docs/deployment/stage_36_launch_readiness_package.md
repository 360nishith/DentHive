# STAGE 36 — Launch Readiness Package

**Subject:** Production Deployment Prerequisites
**Target Audience:** DevOps / Systems Administrator

This document is the ultimate source of truth for deploying the DentalFlow SaaS. You must collect all values listed below before attempting to execute `docker compose up`. 

---

## 1. General Environment Variables
These dictate the core networking of the platform.

| Variable | Example Value | Source | Is Secret? |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `production` | Manual Entry | No |
| `DOMAIN_API` | `api.dentalflow.com` | DNS Registrar | No |
| `DOMAIN_WEB` | `app.dentalflow.com` | DNS Registrar | No |
| `FRONTEND_URL` | `https://app.dentalflow.com` | Manual Entry | No |

---

## 2. Docker Secrets Configuration
To prevent `.env` file leaks, sensitive passwords should be injected via Docker Compose `.env` interpolation.

| Variable | Example Value | Source | Is Secret? |
| :--- | :--- | :--- | :--- |
| `DOCKER_REGISTRY_USER` | `dentalflow_ops` | DockerHub / GitHub Packages | No |
| `DOCKER_REGISTRY_TOKEN`| `ghp_1234abcd...` | GitHub Personal Access Token | **Yes** |

---

## 3. Supabase Configuration (Authentication)
These keys bridge your NestJS backend to the Supabase Auth server.

| Variable | Example Value | Source | Is Secret? |
| :--- | :--- | :--- | :--- |
| `SUPABASE_URL` | `https://xyz...supabase.co` | Supabase Dashboard -> API | No |
| `SUPABASE_ANON_KEY` | `eyJhb...` | Supabase Dashboard -> API | No (Public) |
| `SUPABASE_SERVICE_KEY` | `eyJhb...` | Supabase Dashboard -> API | **Yes (Critical)** |
| `SUPABASE_JWT_SECRET` | `super_long_jwt_secret` | Supabase Dashboard -> API | **Yes (Critical)** |

> [!CAUTION]
> The `SUPABASE_SERVICE_KEY` can bypass all Row Level Security. Never inject this into the Next.js frontend container. It must only exist in the NestJS API container.

---

## 4. PostgreSQL Configuration
If hosting DB inside Docker, these initialize the container.

| Variable | Example Value | Source | Is Secret? |
| :--- | :--- | :--- | :--- |
| `POSTGRES_DB` | `dentalflow_prod` | Manual Entry | No |
| `POSTGRES_USER` | `dental_admin` | Manual Entry | No |
| `POSTGRES_PASSWORD` | `P@ssw0rd123!` | Secure Password Generator | **Yes** |
| `DATABASE_URL` | `postgresql://user:pass@postgres:5432/db` | Derived from above | **Yes** |

---

## 5. Redis Configuration (Queue & Cache)
Required for BullMQ workers and the RAM-First `TenantStatusGuard`.

| Variable | Example Value | Source | Is Secret? |
| :--- | :--- | :--- | :--- |
| `REDIS_HOST` | `redis` (or IP if managed) | Infrastructure Provider | No |
| `REDIS_PORT` | `6379` | Infrastructure Provider | No |
| `REDIS_PASSWORD` | `secure_redis_pass` | Secure Password Generator | **Yes** |
| `REDIS_URL` | `redis://:pass@redis:6379`| Derived from above | **Yes** |

---

## 6. MinIO Configuration (File Storage)
Required for the Zero-Trust Medical X-Ray Storage module.

| Variable | Example Value | Source | Is Secret? |
| :--- | :--- | :--- | :--- |
| `MINIO_ENDPOINT` | `storage.dentalflow.com` | DNS Registrar | No |
| `MINIO_ACCESS_KEY` | `minio_admin_user` | Secure Password Generator | **Yes** |
| `MINIO_SECRET_KEY` | `minio_super_secret` | Secure Password Generator | **Yes** |
| `MINIO_BUCKET_NAME` | `dentalflow-prod` | Manual Entry | No |

---

## 7. Razorpay Configuration (Billing)
Required for Subscription activation and Webhook signature validation.

| Variable | Example Value | Source | Is Secret? |
| :--- | :--- | :--- | :--- |
| `RAZORPAY_KEY_ID` | `rzp_live_abc123` | Razorpay Dashboard -> API Keys | No |
| `RAZORPAY_KEY_SECRET` | `xyz789def...` | Razorpay Dashboard -> API Keys | **Yes** |
| `RAZORPAY_WEBHOOK_SECRET` | `my_secure_webhook_pass` | Razorpay Dashboard -> Webhooks | **Yes** |

---

## 8. WhatsApp Business API Configuration
Required to send automated follow-ups and verify inbound messages.

| Variable | Example Value | Source | Is Secret? |
| :--- | :--- | :--- | :--- |
| `WHATSAPP_PHONE_ID` | `10234567890` | Meta Dev Console -> WhatsApp | No |
| `WHATSAPP_ACCESS_TOKEN`| `EAAB...` | Meta Dev Console -> System User | **Yes** |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN`| `dental_wa_webhook_123` | Manual Entry (Set in Meta Console) | **Yes** |
| `WHATSAPP_APP_SECRET` | `abcdef123...` | Meta Dev Console -> App Settings | **Yes** |

---

## 9. SSL/TLS Configuration (Caddy)
To allow Caddy to automatically provision Let's Encrypt certificates.

| Variable | Example Value | Source | Is Secret? |
| :--- | :--- | :--- | :--- |
| `TLS_EMAIL` | `admin@dentalflow.com` | Manual Entry | No |

---

## 10. Production Security Checklist

Before routing DNS traffic to the live server, the DevOps engineer must verify:

- `[ ]` **GPG Backup Setup**: The `private_key.asc` is safely stored in 1Password and HAS NOT been uploaded to the production server. The production server only holds the Public Key.
- `[ ]` **UFW Firewall**: `ufw allow 80/tcp` and `ufw allow 443/tcp` are enabled. `ufw allow 5432/tcp` (Postgres) is strictly **DENIED** from the outside internet.
- `[ ]` **Throttler Limits**: Confirm the 100KB limit is active in `RawBodyMiddleware`.
- `[ ]` **MinIO Privacy**: Confirm the `dentalflow-prod` bucket has `Access Policy: Private` and no public read/write rules exist.
