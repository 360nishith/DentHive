# STAGE 31 — Comprehensive Testing Strategy

**Subject:** Production Stability & Quality Assurance
**Scope:** NestJS Backend, Next.js Frontend, CI/CD Pipelines
**Note:** Per requirements, this document outlines the testing architecture and mocking strategies without generating the underlying `.spec.ts` test files.

---

## 1. Test Architecture

The DentalFlow testing architecture follows a strict testing pyramid to balance execution speed with confidence in production stability.

### A. Unit Tests (Speed & Logic)
*   **Frameworks:** `Jest` (Backend) and `Vitest` (Frontend).
*   **Scope:** Strictly tests isolated business logic. No database connections, no network requests, no Redis caching.
*   **Use Cases:**
    *   Validating DTO transformations.
    *   Asserting state machine logic (e.g., verifying a Follow-Up cannot transition from `CANCELLED` to `COMPLETED`).
    *   Calculating aggregates in the Analytics service (using mock data).

### B. Integration Tests (Boundaries & Constraints)
*   **Frameworks:** `Jest` + `Supertest` (Backend API).
*   **Scope:** Tests the boundary between the Controllers and the PostgreSQL Database.
*   **Database Isolation:** Tests run against a dedicated, ephemeral `test_db` spun up via Docker. Prisma migrations run before the test suite, and tables are truncated between test files.
*   **Use Cases:**
    *   Verifying that PostgreSQL **Exclusion Constraints** physically reject double-booked appointments.
    *   Asserting that Prisma's `$allOperations` hook successfully forces tenant isolation (Tenant A cannot see Tenant B's patients).

### C. End-to-End (E2E) Tests (User Journeys)
*   **Frameworks:** `Playwright`.
*   **Scope:** Simulates real user interactions (clicking, typing) across the Next.js frontend, asserting network responses from the backend.
*   **Use Cases:**
    *   Logging in via Supabase, navigating the dashboard, and filling out the "Add Patient" modal.

---

## 2. Mocking Strategy

Deterministic tests require robust, mathematical mocking of external boundaries.

### Prisma ORM (Backend Unit Tests)
*   **Tool:** `jest-mock-extended`.
*   **Strategy:** Inject a `mockDeep<PrismaClient>()` into the NestJS testing module. We assert that `prisma.unrestricted.updateMany` is called exactly once with the correct payload during Webhook processing, without ever touching the real database.

### External APIs (WhatsApp Meta & Razorpay)
*   **Tool:** `MSW` (Mock Service Worker).
*   **Strategy:** For Integration tests, we do not want to actually bill credit cards or send real WhatsApp messages. MSW intercepts Node.js network requests.
    *   *Razorpay:* MSW intercepts `POST https://api.razorpay.com/v1/subscriptions` and returns a mock `sub_12345` JSON payload.
    *   *Meta:* MSW intercepts `POST https://graph.facebook.com/v18.0/...` and returns a `200 OK` or `429 Too Many Requests` to test BullMQ backoff logic.

### Background Queues (BullMQ / Redis)
*   **Strategy:** Rather than spinning up Redis for unit tests, the `@InjectQueue('whatsapp-outbound')` provider is mocked via NestJS custom providers: `{ provide: getQueueToken('whatsapp-outbound'), useValue: { add: jest.fn() } }`. We assert `queue.add()` was called with the correct payload.

---

## 3. CI/CD Pipeline Strategy

To enforce quality gates, tests are integrated into GitHub Actions (or GitLab CI).

### Phase 1: Pull Request (PR) Gate
When a PR is opened against `main`:
1.  **Job 1 (Static Analysis):** Runs `eslint` and `tsc --noEmit` across the monorepo to catch typing violations.
2.  **Job 2 (Unit Tests):** Runs `npm run test:unit`. Must complete in < 30 seconds.
3.  **Job 3 (Integration DB Setup):** Spins up a GitHub Actions Service Container (`postgres:15`). Runs `npx prisma db push`.
4.  **Job 4 (Integration Tests):** Runs `npm run test:integration` against the temporary database.
*If any job fails, merging is blocked.*

### Phase 2: Deployment Gate
When code is merged to `main`:
1.  Builds the Next.js and NestJS Docker images.
2.  Deploys to a `staging` environment.
3.  Executes `Playwright` E2E test suites against the live staging URL.
4.  If E2E passes, promotes the Docker image to `production`.

---

## 4. Critical Flows Verification Plan

### 1. Authentication
*   **E2E:** Playwright types email/password, submits, and waits for the `/dashboard` URL to load. Asserts the "Welcome" banner appears.
*   **Integration:** Supertest sends a `POST /auth/login` to the backend. Asserts that the response successfully sets the Supabase HttpOnly Session Cookie.

### 2. Clinic Creation
*   **Integration:** Creates a new Tenant via API. Asserts that a corresponding empty `TENANT_CONFIG` record was automatically generated via Prisma middleware.

### 3. Patient Creation
*   **Integration (Isolation Test):** Seed DB with Tenant A and Tenant B. Authenticate as Tenant A. Attempt to `GET /patients/{id_of_tenant_B_patient}`. **Must assert `404 Not Found`** to verify AsyncLocalStorage tenant leakage prevention.

### 4. Treatment Journey
*   **Unit:** Mock `updateMany`. Assert that transitioning a Journey from `COMPLETED` back to `IN_PROGRESS` throws a `ConflictException` (immutability check).

### 5. Appointments
*   **Integration (Concurrency Test):** Send two identical `POST /appointments` requests simultaneously via `Promise.all()`. **Must assert exactly one `201 Created` and one `409 Conflict` (Exclusion Constraint caught the overlap).**

### 6. Follow-Ups
*   **Unit:** Test the `FollowUpAutomationWorker`. Feed it an `APPOINTMENT_NO_SHOW` payload. Assert `prisma.unrestricted.followUp.create` is called. Feed the *exact same payload* again. Assert the method returns early and `create` is *not* called (Idempotency verification).

### 7. WhatsApp
*   **Integration (Cryptographic Test):** Send a `POST /webhooks/whatsapp/meta` request. 
    *   Test A: Send a bad `X-Hub-Signature-256`. Assert `401 Unauthorized`.
    *   Test B: Send a valid signature. Assert HTTP `200 OK` and verify the `WEBHOOK_LOG` table has a new record.

### 8. Billing
*   **Integration (Suspension Enforcement):** 
    1. Seed a `Tenant` with `ACTIVE` status.
    2. Feed a valid Razorpay `subscription.halted` webhook.
    3. Assert the DB transitions `Tenant.status` to `SUSPENDED`.
    4. Authenticate as that Tenant and attempt to `POST /patients`. **Must assert `403 Forbidden` (TenantStatusGuard).**
