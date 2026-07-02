# STAGE 37 — Local Development Verification Guide

**Subject:** Developer Onboarding Checklist
**Target Audience:** Frontend & Backend Software Engineers

Welcome to the DentalFlow engineering team. Before you write a single line of code, you must verify that your local development environment is communicating correctly. Follow this checklist sequentially. If a step fails, do not proceed to the next step.

---

## 1. Docker Daemon

*   **Start Command**: Open Docker Desktop.
*   **Verification Command**: `docker info`
*   **Expected Result**: You should see Server Version details (e.g., `Server Version: 24.0.2`).
*   **Common Failure**: `Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?`
*   **Fix**: Docker Desktop is closed. Open the application and wait for the icon to turn green.

---

## 2. PostgreSQL (Database)

*   **Start Command**: `docker compose up -d postgres`
*   **Verification Command**: `docker exec -it dentalflow-postgres-1 pg_isready -U dental_admin`
*   **Expected Result**: `/var/run/postgresql:5432 - accepting connections`
*   **Common Failure**: `Error starting userland proxy: listen tcp4 0.0.0.0:5432: bind: address already in use`
*   **Fix**: You have a local PostgreSQL server running natively on your laptop. Stop it by running `sudo systemctl stop postgresql` (Linux) or `brew services stop postgresql` (Mac).

---

## 3. Redis (Cache & Queues)

*   **Start Command**: `docker compose up -d redis`
*   **Verification Command**: `docker exec -it dentalflow-redis-1 redis-cli ping`
*   **Expected Result**: `PONG`
*   **Common Failure**: Container exits immediately.
*   **Fix**: Check `docker compose logs redis`. Usually caused by a port `6379` collision. Stop any native Redis instances.

---

## 4. MinIO (File Storage)

*   **Start Command**: `docker compose up -d minio`
*   **Verification Command**: Open your browser and navigate to `http://localhost:9001`
*   **Expected Result**: You should see the MinIO Web Console login screen.
*   **Common Failure**: Cannot log in using `minioadmin`.
*   **Fix**: Check your `.env` file for the `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` overrides.

---

## 5. Prisma ORM

*   **Start Command**: `npx prisma generate && npx prisma db push`
*   **Verification Command**: `npx prisma studio`
*   **Expected Result**: Prisma Studio opens at `http://localhost:5555` and shows your database tables (Tenant, User, Patient, etc.).
*   **Common Failure**: `P1001: Can't reach database server at localhost:5432`
*   **Fix**: Your Postgres container is not running (See Step 2), or your `.env` `DATABASE_URL` has the wrong password.

---

## 6. Supabase (Staging Auth)

*   **Start Command**: N/A (We connect to the shared Cloud Staging project)
*   **Verification Command**: 
    ```bash
    curl -I -s https://[YOUR_SUPABASE_PROJECT_ID].supabase.co/auth/v1/health | head -n 1
    ```
*   **Expected Result**: `HTTP/2 200`
*   **Common Failure**: `Could not resolve host`
*   **Fix**: Your `SUPABASE_URL` in the `.env` file is missing or misspelled.

---

## 7. NestJS Backend

*   **Start Command**: `cd apps/api && npm run start:dev`
*   **Verification Command**: Open browser to `http://localhost:3000/api`
*   **Expected Result**: You should see the Swagger OpenAPI documentation UI.
*   **Common Failure**: `Error: Missing required environment variable RAZORPAY_KEY_SECRET`
*   **Fix**: The backend uses `Joi` validation on startup. You must fill out all required values in your `.env` file as specified in the Launch Readiness Package.

---

## 8. Next.js Frontend

*   **Start Command**: `cd apps/web && npm run dev`
*   **Verification Command**: Open browser to `http://localhost:3001`
*   **Expected Result**: You should see the Next.js login screen or dashboard.
*   **Common Failure**: `AxiosError: Network Error` in the browser console.
*   **Fix**: The frontend cannot reach the backend. Ensure Step 7 (NestJS) is actively running in a separate terminal tab, and that `NEXT_PUBLIC_API_URL=http://localhost:3000` is set in your frontend `.env.local` file.
