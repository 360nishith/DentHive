# Monorepo Repository Structure

**Project:** DentalFlow
**Architecture:** Turborepo Monorepo

This document outlines the complete directory and package structure for the DentalFlow platform, separating the frontend (Next.js), backend (NestJS), shared packages (Prisma/Types), and local infrastructure (Docker/MinIO).

---

## 1. Top-Level Folder Structure

```text
dentalflow/
├── apps/                   # Deployable applications
│   ├── api/                # NestJS Backend API
│   └── web/                # Next.js Frontend Application
├── packages/               # Shared libraries and configurations
│   ├── database/           # Prisma schema, migrations, and client
│   ├── types/              # Shared TypeScript definitions (DTOs, Enums)
│   ├── eslint-config/      # Shared ESLint rules
│   └── typescript-config/  # Shared tsconfig.json bases
├── docker/                 # Local development infrastructure
│   ├── docker-compose.yml  # Local services (Postgres, Redis, MinIO)
│   └── init-scripts/       # Database seeding and MinIO bucket creation
├── .github/                # CI/CD pipelines
│   └── workflows/
├── docs/                   # Product and Architecture Documentation
├── package.json            # Monorepo root dependencies and workspaces
└── turbo.json              # Turborepo task runner configuration
```

---

## 2. Package Structure (`/packages`)

To prevent code duplication, core logic and types are extracted into shared packages.

### `packages/database`
*   **Purpose:** The single source of truth for the database.
*   **Contents:**
    *   `prisma/schema.prisma`: The unified schema.
    *   `prisma/migrations/`: Generated SQL migrations.
    *   `src/index.ts`: Exports the generated Prisma Client for both `api` and `web` to use.

### `packages/types`
*   **Purpose:** Ensures the frontend and backend agree on data shapes.
*   **Contents:**
    *   `src/enums.ts`: e.g., `export enum InvoiceStatus { PENDING, PAID }`
    *   `src/dtos.ts`: Interfaces for API requests/responses.

---

## 3. Application Structure (`/apps`)

### 3.1. Frontend (`apps/web`) - Next.js
Follows the Next.js App Router and Feature-Sliced Design principles.

```text
apps/web/
├── src/
│   ├── app/                # Next.js App Router (Pages & Layouts)
│   │   ├── (auth)/         # Login/Signup routes
│   │   ├── (dashboard)/    # Protected clinic routes
│   │   └── api/            # Next.js Serverless Route Handlers
│   ├── components/         # Shared UI elements
│   │   ├── ui/             # Shadcn UI primitives (Button, Card, Sheet)
│   │   └── layouts/        # Sidebar, Navbar
│   ├── features/           # Feature-sliced domain logic
│   │   ├── patients/       # Patient hooks, components, API calls
│   │   ├── treatments/     # Treatment journey logic
│   │   └── appointments/   # Calendar and scheduling
│   └── lib/                # Utilities
│       ├── query-client.ts # React Query configuration
│       ├── store.ts        # Zustand global state
│       └── utils.ts        # Tailwind `cn()` merger
├── middleware.ts           # Next.js middleware (Subdomain routing)
├── tailwind.config.ts      # Tailwind configuration
└── package.json            
```

### 3.2. Backend (`apps/api`) - NestJS
Follows a strict modular, Domain-Driven structure.

```text
apps/api/
├── src/
│   ├── common/             # Global guards, filters, interceptors
│   │   ├── guards/         # JwtAuthGuard, PermissionsGuard
│   │   ├── middleware/     # TenantContextMiddleware (AsyncLocalStorage)
│   │   └── decorators/     # @RequirePermissions(), @TenantId()
│   ├── modules/            # Business Domains
│   │   ├── identity/       # Users, Roles, Permissions
│   │   ├── clinical/       # Patients, Treatments, Consents
│   │   ├── scheduling/     # Appointments, FollowUps
│   │   ├── billing/        # Invoices, Payments, SaaS Subscriptions
│   │   └── communication/  # WhatsApp Templates, Meta API
│   ├── workers/            # BullMQ Processors
│   │   ├── outbound.worker.ts
│   │   └── webhook.worker.ts
│   ├── app.module.ts       # Root module
│   └── main.ts             # Bootstrap entry point
└── package.json            
```

---

## 4. Docker Structure (`/docker`)

Used specifically to spin up local development dependencies without cluttering the host machine.

```yaml
# docker/docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000" # S3 API
      - "9001:9001" # Web UI
    volumes: [miniodata:/data]

volumes:
  pgdata:
  miniodata:
```

---

## 5. Environment Structure

A standard `.env` configuration file mapping (placed at the monorepo root or inside specific apps).

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/dentalflow?schema=public"

# Identity (Supabase)
SUPABASE_URL="https://xyz.supabase.co"
SUPABASE_JWT_SECRET="super-secret-jwt"

# Communication (Meta & BullMQ)
REDIS_URL="redis://localhost:6379"
META_WHATSAPP_TOKEN="EAAG..."
META_PHONE_ID="123456789"
META_WEBHOOK_VERIFY_TOKEN="my-secret-verify-token"

# Storage (MinIO Local / AWS S3 Prod)
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET_NAME="dentalflow-local"
```

---

## 6. CI/CD Structure (`.github/workflows`)

Defines the automated pipelines for testing and deployment.

```text
.github/workflows/
├── pr-checks.yml       # Runs on Pull Requests
│   # 1. Typecheck (tsc)
│   # 2. Lint (eslint)
│   # 3. Unit Tests (jest)
│   # 4. Prisma format & validate
│
├── deploy-api.yml      # Runs on merge to main
│   # 1. Build apps/api
│   # 2. Build Docker image
│   # 3. Push to GitHub Container Registry (GHCR)
│   # 4. Trigger Render/Railway webhook
│
└── deploy-web.yml      # Runs on merge to main
    # 1. Build apps/web
    # 2. Deploy to Vercel via Vercel CLI
```
