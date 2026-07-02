# Multi-Tenant Lifecycle & Security (Supabase + NestJS)

**Subject:** Deep Dive into the `tenantId` Lifecycle
**Goal:** Explain exactly how a `tenantId` is created, assigned to users via Supabase, and verified securely by NestJS.

---

## 1. JWT Claims Structure

Before looking at the flows, we must understand the payload. When Supabase generates a JWT for a logged-in user, the critical `tenantId` and `role` are embedded inside the `app_metadata` object.

```json
{
  "aud": "authenticated",
  "exp": 1719220000,
  "sub": "d98a7b64-1234-5678-abcd-ef0123456789", // Supabase User UUID
  "email": "dr.smith@dentalflow.co",
  "app_metadata": {
    "provider": "email",
    "providers": ["email"],
    "tenantId": "f47ac10b-58cc-4372-a567-0e02b2c3d479", // The Clinic's UUID
    "role": "DENTIST" // The User's Role
  }
}
```

*Note: `app_metadata` cannot be modified by the user on the frontend. It can only be updated securely by an Admin backend using the Supabase Service Role Key.*

---

## 2. Tenant & Clinic Owner Creation Flow

When a new dentist signs up for DentalFlow, we must create the Clinic (Tenant) and assign the founder as the Head Dentist.

```mermaid
sequenceDiagram
    participant Frontend as Next.js Frontend
    participant Nest as NestJS Backend
    participant DB as PostgreSQL (Prisma)
    participant Supa as Supabase Auth

    Frontend->>Nest: POST /onboarding (Name, Email, Password, ClinicName)
    
    rect rgb(240, 248, 255)
        Note over Nest,DB: 1. Create Tenant
        Nest->>DB: INSERT INTO Tenant (name)
        DB-->>Nest: Returns new tenantId
    end

    rect rgb(240, 255, 240)
        Note over Nest,Supa: 2. Create Identity
        Nest->>Supa: AdminCreateUser(email, password)
        Supa-->>Nest: Returns new Auth UUID
    end

    rect rgb(255, 240, 245)
        Note over Nest,Supa: 3. Inject Tenant Claim
        Nest->>Supa: UpdateUserAppMetadata(Auth UUID, { tenantId, role: "DENTIST" })
    end

    rect rgb(255, 250, 240)
        Note over Nest,DB: 4. Create Prisma User
        Nest->>DB: INSERT INTO User (authId, tenantId, roleId)
    end
    
    Nest-->>Frontend: 201 Created (Success)
    Frontend->>Supa: Login with Email/Password
    Supa-->>Frontend: Returns JWT (containing tenantId)
```

---

## 3. Staff Invitation Flow

A Head Dentist (who already belongs to a `tenantId`) wants to invite a Receptionist.

```mermaid
sequenceDiagram
    participant HeadDentist as Head Dentist (Frontend)
    participant Nest as NestJS Backend
    participant Supa as Supabase Auth
    participant DB as PostgreSQL

    HeadDentist->>Nest: POST /staff/invite (Email, Role: "STAFF") + Bearer JWT
    Nest->>Nest: Verify Head Dentist is ADMIN
    Nest->>Nest: Extract 'tenantId' from Head Dentist JWT

    Nest->>Supa: AdminInviteUserByEmail(Email)
    Supa-->>Nest: Returns new Auth UUID (Pending)

    Nest->>Supa: UpdateUserAppMetadata(Auth UUID, { tenantId: HeadDentist.tenantId, role: "STAFF" })

    Nest->>DB: INSERT INTO User (authId, tenantId, status: PENDING)
    
    Supa->>StaffEmail: Sends "You've been invited" Magic Link
    Nest-->>HeadDentist: 200 OK
```

---

## 4. Tenant Security Validation Flow

This is what happens when the Receptionist attempts to view a list of Patients.

```mermaid
sequenceDiagram
    participant Staff as Staff Member (Frontend)
    participant AuthGuard as NestJS JwtAuthGuard
    participant ALS as AsyncLocalStorage (ALS)
    participant Prisma as PrismaService
    participant DB as PostgreSQL

    Staff->>AuthGuard: GET /patients + Bearer JWT
    
    rect rgb(255, 240, 240)
        Note over AuthGuard: 1. Cryptographic Verification
        AuthGuard->>AuthGuard: Verify JWT Signature using Supabase Secret
        AuthGuard->>AuthGuard: Extract 'tenantId' from payload.app_metadata
    end

    rect rgb(240, 248, 255)
        Note over AuthGuard,ALS: 2. Context Injection
        AuthGuard->>ALS: Store { tenantId } in current Request Scope
    end

    AuthGuard->>Prisma: Next() -> Controller calls prisma.patient.findMany()
    
    rect rgb(240, 255, 240)
        Note over Prisma,DB: 3. Dynamic RLS Enforcement
        Prisma->>ALS: Get tenantId
        Prisma->>Prisma: Intercept query, append "WHERE tenantId = ALS.tenantId"
        Prisma->>DB: SELECT * FROM Patient WHERE tenantId = '...'
    end

    DB-->>Staff: Returns strictly isolated Patient Data
```

---

## Summary of the `tenantId` Lifecycle

1.  **Creation:** The `tenantId` (UUID) is born in the PostgreSQL database when a new clinic subscribes.
2.  **Storage:** It is stored permanently in the `app_metadata` of the user's Supabase Identity vault.
3.  **Updating:** If a user moves clinics (rare), only a Super Admin using the Supabase Service Role Key can call the Supabase Admin API to update their `app_metadata.tenantId`. Users cannot change it themselves.
4.  **Verification:** NestJS never trusts the frontend. It verifies the signature of the Supabase JWT. Once verified, it extracts the `tenantId` and uses Node's `AsyncLocalStorage` to invisibly force that `tenantId` into every database query via Prisma's `$allOperations` extension.
