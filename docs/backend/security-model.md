# Backend Security Model

**Version:** 2.0 (Post-Audit Consolidation)
**Subject:** Multi-Tenancy, Isolation, and Access Control

---

## 1. Multi-Tenant Isolation Strategy

To guarantee that Data Leaks between clinics are impossible at the database level, DentalFlow enforces **Row-Level Security (RLS)** via Prisma Client Extensions.

### 1.1. JWT Claim Extraction
The frontend no longer passes an `X-Tenant-Id` header. Instead:
1.  Supabase/Auth0 injects the `tenantId` into the JWT `app_metadata` during token generation.
2.  The NestJS `JwtAuthGuard` decodes the token and extracts the `tenantId` directly from the cryptographic payload.

### 1.2. AsyncLocalStorage (ALS)
To apply the `tenantId` to Prisma queries without the severe performance penalty of NestJS Request-Scoped Dependency Injection:
1.  A global Middleware intercepts the request after the Auth Guard.
2.  It pushes the `tenantId` into Node.js `AsyncLocalStorage`.
3.  The Singleton `PrismaService` utilizes a Client Extension that hooks into `$allOperations`. The hook reads the `tenantId` from the ALS context and dynamically appends `WHERE tenantId = ...` to every single database query automatically.

---

## 2. Granular Role-Based Access Control (RBAC)

DentalFlow utilizes a granular permission model to support clinics with varied staff hierarchies.

### 2.1. The Permission Matrix
Instead of hardcoding `if (user.role === 'DENTIST')`, the backend utilizes a `PermissionsGuard`.

*   **Entities:** `User` belongs to a `Role` (e.g., *Head Dentist, Associate Dentist, Receptionist*).
*   **Permissions:** A `Role` has many `Permission` records mapping `Action` to `Subject` (e.g., `READ:REVENUE`, `CREATE:PATIENT`, `UPDATE:INVOICE`).

### 2.2. API Enforcement
Endpoints are decorated with `@RequirePermissions()`:

```typescript
@Get('/billing/invoices')
@RequirePermissions({ action: 'READ', subject: 'INVOICE' })
async getInvoices() { ... }
```

If a Receptionist without financial clearance attempts to fetch the route, the Guard throws a `403 Forbidden` before the controller logic executes.

---

## 3. Data Protection (PII & HIPAA Compliance)

*   **Encryption at Rest:** Handled by the managed PostgreSQL provider (AES-256).
*   **Encryption in Transit:** Strict TLS 1.3 enforcement on all API routes.
*   **Binary File Security:** Medical records (X-Rays, Consents) are stored in AWS S3 in private buckets. They are uploaded directly from the frontend via temporary, cryptographically signed URLs (`GET /files/presigned-url`). They cannot be accessed without generating a short-lived download link from the authenticated backend.
