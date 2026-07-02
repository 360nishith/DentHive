# NestJS Folder Structure

DentalFlow is built using **NestJS** following a **Modular Monolith** architecture. The folder structure maps directly to the Bounded Contexts defined in the Domain-Driven Design (DDD) phase.

---

## Directory Tree

```text
d:\DentalFlow\
├── prisma/
│   └── schema.prisma                # Multi-tenant Prisma schema
├── src/
│   ├── main.ts                      # App entry point (bootstrap)
│   ├── app.module.ts                # Root module
│   │
│   ├── common/                      # Cross-cutting concerns (Global)
│   │   ├── decorators/              # Custom decorators (@CurrentTenant(), @Roles())
│   │   ├── filters/                 # Global exception filters (PrismaErrorFilter)
│   │   ├── guards/                  # AuthGuard, RolesGuard
│   │   ├── interceptors/            # Response mapping, logging
│   │   └── middleware/              # TenantInjectionMiddleware
│   │
│   ├── core/                        # Core application services
│   │   ├── prisma/                  # PrismaService and SoftDelete extensions
│   │   ├── queue/                   # BullMQ / Redis configuration
│   │   └── config/                  # Environment variable validation schema
│   │
│   └── modules/                     # DDD Bounded Contexts
│       │
│       ├── identity/                # Auth, Users, Roles, Tenants
│       │   ├── identity.module.ts
│       │   ├── controllers/
│       │   ├── services/
│       │   └── dto/
│       │
│       ├── treatment/               # Patients, Journeys, Stages, Appointments
│       │   ├── treatment.module.ts
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── dto/
│       │   └── events/              # Domain Events (e.g., StageCompletedEvent)
│       │
│       ├── communication/           # WhatsApp, Follow-ups, Webhooks
│       │   ├── communication.module.ts
│       │   ├── controllers/         # Webhook ingestion
│       │   ├── services/            # Meta API integration
│       │   └── processors/          # BullMQ Job Consumers (Workers)
│       │
│       └── billing/                 # Payments, Subscriptions, Razorpay
│           ├── billing.module.ts
│           ├── controllers/
│           ├── services/
│           └── dto/
```

---

## Architectural Rules

1. **Module Isolation:** 
   * A module in `src/modules/` cannot directly query the database for entities belonging to another module. 
   * *Example:* The `CommunicationModule` cannot import the Prisma models for `TreatmentJourney`. It must rely on events emitted by the `TreatmentModule`.

2. **Common Folder (`src/common`):**
   * Reserved exclusively for classes that are completely agnostic to the business logic (e.g., standard JWT verification, generic error mappers).

3. **Core Folder (`src/core`):**
   * Contains wrapper services for external infrastructure dependencies (Database, Redis queues) that are injected globally into feature modules.
