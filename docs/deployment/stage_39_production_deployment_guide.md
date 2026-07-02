# STAGE 39 — Final Production Deployment Guide

**Subject:** Zero-to-Launch DevOps Manual
**Stack:** Ubuntu VPS, Docker, Caddy, PostgreSQL, Redis, MinIO, NestJS, Next.js
**Target Audience:** Beginner Developers / Founders

This guide walks you through deploying the DentalFlow SaaS from an empty server to a live, secure, SSL-encrypted production environment.

---

## 1. Server Provisioning

1.  **Buy a Server (VPS)**: Go to DigitalOcean, Linode, or AWS EC2. Purchase an Ubuntu 24.04 LTS server. For production, start with at least 4GB RAM and 2 CPUs.
2.  **Login**: Open your terminal on your laptop and log into the server:
    `ssh root@<YOUR_SERVER_IP>`
3.  **Basic Security**:
    *   Update the server: `apt update && apt upgrade -y`
    *   Enable the Firewall (UFW) to block hackers:
        *   `ufw allow OpenSSH`
        *   `ufw allow 80/tcp`
        *   `ufw allow 443/tcp`
        *   `ufw enable`
    *   *Notice that we did NOT open port 5432 (Postgres). Database access must be strictly restricted to internal Docker networks.*

---

## 2. Docker Deployment

1.  **Install Docker**: Run the official Docker installation script:
    `curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh`
2.  **Verify**: Run `docker compose version` to ensure Compose V2 is installed.
3.  **Clone the Code**: 
    `git clone https://github.com/your-org/dentalflow.git /opt/dentalflow`
    `cd /opt/dentalflow`

---

## 3. Environment Variables

1.  **Copy the Template**:
    `cp .env.example .env`
2.  **Fill the Secrets**: Open the file using `nano .env`.
3.  **Reference the Readiness Package**: Open your `stage_36_launch_readiness_package.md` document. You must paste in all of your API keys, Database passwords, and specifically your `SUPABASE_SERVICE_KEY`.
4.  **Save and Exit**: Press `CTRL+X`, then `Y`, then `ENTER`.

---

## 4. Domain Configuration & SSL Setup

We use **Caddy** as our reverse proxy because it handles Let's Encrypt SSL certificates automatically. You do not need to manually configure Certbot.

1.  **Buy Domains**: Go to Namecheap or Cloudflare. You need two subdomains:
    *   `app.dentalflow.com` (For the Next.js Frontend)
    *   `api.dentalflow.com` (For the NestJS Backend)
2.  **Configure DNS**: In your domain registrar, create two `A Records` pointing `app` and `api` to your `<YOUR_SERVER_IP>`.
3.  **Configure Caddy**: Inside the `/opt/dentalflow` folder, ensure your `Caddyfile` looks like this:
    ```text
    app.dentalflow.com {
        reverse_proxy frontend:3000
    }
    api.dentalflow.com {
        reverse_proxy backend:3001
    }
    storage.dentalflow.com {
        reverse_proxy minio:9000
    }
    ```

---

## 5. Booting the SaaS

1.  **Pull and Build**: Pull your latest Docker images (if using a registry) or build them locally.
    `docker compose build`
2.  **Start the Network**: Run the entire infrastructure in detached mode.
    `docker compose up -d`
3.  **Check the Health**: Run `docker compose ps` to ensure all 6 containers (Postgres, Redis, MinIO, Caddy, API, Web) show a status of `Up`.

---

## 6. Database Migration

The database container is running, but it has no tables. We need Prisma to push our schema.

1.  **Execute Prisma Deploy**: Run this command to tell the backend container to apply the migrations to the Postgres container:
    `docker exec -it dentalflow-backend-1 npx prisma migrate deploy`
2.  **Seed the Database (Optional)**: If you have a script that creates the initial Admin user or sets up base permissions:
    `docker exec -it dentalflow-backend-1 npm run seed`

---

## 7. Backup Verification (HIPAA GPG)

As detailed in Stage 35A, we must verify the automated encrypted backups are functional.

1.  **Import the Public Key**: You must upload your GPG Public Key to the server and import it into the root keyring. (DO NOT upload the Private Key).
    `gpg --import public_key.asc`
2.  **Test the Backup Script**: Manually run the backup script to ensure it correctly dumps the database, encrypts it in RAM, and pushes the `.gpg` file to S3.
    `bash /opt/dentalflow/scripts/backup.sh`
3.  **Verify S3**: Log into your AWS S3 console. You should see a file named `dentalflow_db_2026-06-23.sql.gz.gpg`.
4.  **Verify Encryption**: Attempt to open that file on your laptop. It should be unreadable binary gibberish unless you decrypt it with your offline vault password.

---

## Final Verification

Open your browser and navigate to `https://app.dentalflow.com`. You should see the secure padlock icon (SSL active) and the DentalFlow login screen. 

**Congratulations. The DentalFlow SaaS is now live in Production.**
