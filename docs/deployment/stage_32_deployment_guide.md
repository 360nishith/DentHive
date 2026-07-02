# STAGE 32 — Production Deployment Guide

**Subject:** Zero-to-Production SaaS Deployment
**Target Audience:** Beginners
**Stack:** Ubuntu VPS, Docker Compose, Caddy (SSL), PostgreSQL, Redis, MinIO, NestJS, Next.js

Welcome to the DentalFlow deployment guide. This document will walk you through taking your code from your laptop and putting it live on the internet securely, ensuring it stays online and backed up.

---

## 1. Server Preparation (The VPS)

A VPS (Virtual Private Server) is a computer you rent in the cloud. We recommend a basic Ubuntu 24.04 LTS server (e.g., from DigitalOcean, Hetzner, or AWS) with at least **4GB of RAM** to comfortably run all the containers.

### Step 1: Install Docker
Docker is the engine that runs our code in isolated boxes called "containers."
Connect to your server via SSH and run these commands to install Docker and Docker Compose:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose-v2 -y
sudo systemctl enable --now docker
```

---

## 2. Environment Variables (`.env`)

Create a folder on your server for the project, e.g., `/opt/dentalflow`. Inside this folder, create a file named `.env`. This file holds all your secrets. **Never share this file or commit it to GitHub.**

```env
# /opt/dentalflow/.env

# Domain Names
DOMAIN_API=api.yourdomain.com
DOMAIN_WEB=app.yourdomain.com

# Database Secrets
POSTGRES_USER=dental_admin
POSTGRES_PASSWORD=super_secure_password_here
POSTGRES_DB=dentalflow
DATABASE_URL=postgresql://dental_admin:super_secure_password_here@postgres:5432/dentalflow

# Redis
REDIS_URL=redis://redis:6379

# JWT & Third Parties
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
WHATSAPP_APP_SECRET=...
```

---

## 3. The Docker Architecture (`docker-compose.yml`)

Create a file named `docker-compose.yml` in the same directory. This file is a blueprint that tells Docker exactly how to wire all the servers together.

```yaml
version: '3.8'

# Set a 10MB limit on logs so they don't fill up your hard drive over time!
x-logging: &default-logging
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

services:
  # 1. The Database
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    logging: *default-logging

  # 2. The Queue (Redis)
  redis:
    image: redis:7-alpine
    restart: always
    logging: *default-logging

  # 3. The Backend API (NestJS)
  api:
    image: your-dockerhub-username/dentalflow-api:latest
    restart: always
    env_file: .env
    depends_on:
      - postgres
      - redis
    logging: *default-logging

  # 4. The Frontend (Next.js)
  web:
    image: your-dockerhub-username/dentalflow-web:latest
    restart: always
    env_file: .env
    logging: *default-logging

  # 5. The Traffic Cop & SSL Manager (Caddy)
  caddy:
    image: caddy:2-alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data # Critical: Stores your SSL certificates so they aren't lost on restart
    depends_on:
      - api
      - web

volumes:
  pgdata:
  caddy_data:
```

---

## 4. Automatic SSL Encryption (Caddyfile)

Instead of manually renewing certificates every 3 months, we use **Caddy**. Caddy automatically talks to Let's Encrypt and secures your website with `https://`.

Create a file named `Caddyfile` next to your `docker-compose.yml`:

```text
# /opt/dentalflow/Caddyfile

{$DOMAIN_WEB} {
    reverse_proxy web:3000
}

{$DOMAIN_API} {
    reverse_proxy api:3000
}
```
*   **How it works**: When a user types `app.yourdomain.com`, Caddy automatically gives them a green padlock (HTTPS) and securely passes the traffic to the internal `web:3000` container.

**Start the Server:**
Run this command to pull your code and start the entire platform:
```bash
docker compose up -d
```

---

## 5. Disaster Recovery (Backups)

If your server's hard drive dies, the clinic loses all its patient data. We must back up the PostgreSQL database automatically.

### Step 1: Create a Backup Script
Create `/opt/dentalflow/backup.sh`:
```bash
#!/bin/bash
# This script dumps the database, compresses it, and saves it with today's date.
BACKUP_DIR="/opt/dentalflow/backups"
mkdir -p $BACKUP_DIR
FILENAME="dentalflow_$(date +\%F).sql.gz"

# Run pg_dump inside the docker container
docker exec dentalflow-postgres-1 pg_dump -U dental_admin dentalflow | gzip > $BACKUP_DIR/$FILENAME

# Optional: Upload to AWS S3 (Highly Recommended)
# aws s3 cp $BACKUP_DIR/$FILENAME s3://my-dental-backups/
```
Make it executable: `chmod +x /opt/dentalflow/backup.sh`

### Step 2: Automate it with Cron
Type `crontab -e` and add this line to run the backup every night at 2:00 AM:
```text
0 2 * * * /opt/dentalflow/backup.sh
```

---

## 6. Monitoring & Logging

### Viewing Logs
If the backend crashes and you need to see why, Docker captures all console output. You can view the NestJS API logs by running:
```bash
docker compose logs -f api
```

### Server Monitoring
For beginners, we highly recommend setting up a free account on **UptimeRobot**.
*   Configure it to ping `https://api.yourdomain.com/health` every 5 minutes.
*   If the server goes offline, UptimeRobot will instantly email you or send a WhatsApp message, allowing you to restart the server before clinics complain.
