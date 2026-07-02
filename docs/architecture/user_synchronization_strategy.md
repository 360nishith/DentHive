# User Entity Synchronization Strategy

**Subject:** Maintaining Consistency Between Supabase Identity and Prisma Database
**Context:** Because identity (Email, Password, Auth UUID) lives in Supabase, but business logic (Role, Tenant, Clinical Data) lives in PostgreSQL (via Prisma), these two systems must be kept perfectly synchronized.

---

## 1. Core Synchronization Principle

**NestJS is the Orchestrator.** 
We do *not* rely on Supabase Database Webhooks (Postgres Triggers calling out to NestJS) to keep the systems in sync. Webhooks can fail, leading to phantom users in Supabase that don't exist in Prisma. 

Instead, NestJS orchestrates the creation in both systems within a single API call using the Supabase Admin API.

---

## 2. Workflows & Sequence Diagrams

### 2.1. User Creation (Head Dentist Onboarding)
When a new clinic signs up, NestJS ensures the Tenant, Supabase User, and Prisma User are all created sequentially. If Supabase creation fails, the transaction rolls back.

```mermaid
sequenceDiagram
    participant Front as Frontend
    participant Nest as NestJS (Orchestrator)
    participant Supa as Supabase Auth
    participant DB as Prisma (PostgreSQL)

    Front->>Nest: POST /onboarding (Email, Password, ClinicName)
    
    Nest->>DB: 1. Create Tenant (Returns tenantId)
    
    Nest->>Supa: 2. AdminCreateUser(Email, Password)
    Supa-->>Nest: Returns Auth UUID
    
    Nest->>Supa: 3. UpdateAppMetadata({ tenantId, role: DENTIST })
    
    Nest->>DB: 4. Create Prisma User (authId: Auth UUID, tenantId, role)
    
    Nest-->>Front: Success
```

### 2.2. Staff Invitation
The Head Dentist invites a receptionist.

```mermaid
sequenceDiagram
    participant Admin as Head Dentist
    participant Nest as NestJS
    participant Supa as Supabase Auth
    participant DB as Prisma

    Admin->>Nest: POST /staff/invite (Email, Role: STAFF)
    
    Nest->>Supa: 1. AdminInviteUserByEmail(Email)
    Supa-->>Nest: Returns Auth UUID (Pending Status)
    
    Nest->>Supa: 2. UpdateAppMetadata({ tenantId, role: STAFF })
    
    Nest->>DB: 3. Create Prisma User (authId, tenantId, status: INVITED)
    
    Supa->>Staff: 4. Send Invitation Email with Magic Link
    Nest-->>Admin: Invite Sent
```

### 2.3. User Deactivation (Firing Staff)
When staff is terminated, their access must be revoked immediately.

```mermaid
sequenceDiagram
    participant Admin as Head Dentist
    participant Nest as NestJS
    participant Supa as Supabase Auth
    participant DB as Prisma

    Admin->>Nest: POST /staff/:id/deactivate
    
    Nest->>DB: 1. Update User SET status = 'INACTIVE'
    
    Nest->>Supa: 2. AdminBanUser(Auth UUID) OR AdminUpdateUser({ ban_duration: 100_years })
    
    Nest-->>Admin: User Deactivated
```
*Note: Banning the user in Supabase instantly invalidates their current session and prevents new logins.*

### 2.4. User Deletion (GDPR / Data Wipe)
To comply with data privacy laws, hard deletion removes the identity completely.

```mermaid
sequenceDiagram
    participant Admin as Head Dentist
    participant Nest as NestJS
    participant Supa as Supabase Auth
    participant DB as Prisma

    Admin->>Nest: DELETE /staff/:id
    
    Nest->>DB: 1. Soft-Delete or Hard-Delete User (depending on audit needs)
    
    Nest->>Supa: 2. AdminDeleteUser(Auth UUID)
    
    Nest-->>Admin: User Deleted
```

### 2.5. Password Reset
Because Supabase handles authentication, NestJS and Prisma are largely bypassed.

```mermaid
sequenceDiagram
    participant User as Staff / Dentist
    participant Supa as Supabase Auth
    participant DB as Prisma

    User->>Supa: Request Password Reset (Frontend SDK)
    Supa->>User: Send Reset Email
    User->>Supa: Click Link & Submit New Password
    Note over Supa,DB: Prisma database is NOT involved. Identity sync is preserved automatically.
```

### 2.6. Clinic Suspension (SaaS Billing Failure)
If a clinic fails to pay their SaaS subscription via Razorpay, we must block access. However, iterating through 50 staff members in Supabase to ban them individually is inefficient.

Instead, we manage suspension at the **Tenant** level in Prisma.

```mermaid
sequenceDiagram
    participant Razorpay as Razorpay Webhook
    participant Nest as NestJS
    participant DB as Prisma
    participant Staff as Staff Member

    Razorpay->>Nest: POST /webhooks/razorpay (Subscription.Halted)
    
    Nest->>DB: 1. Update Tenant SET status = 'SUSPENDED'
    
    Note over Staff,Nest: Later, Staff attempts to use the app...
    
    Staff->>Nest: GET /patients + Supabase JWT
    
    Nest->>DB: 2. Global Auth Guard checks Tenant Status
    DB-->>Nest: status: 'SUSPENDED'
    
    Nest-->>Staff: 403 Forbidden (Payment Required)
```
*Note: The Supabase user remains "Active" and can log in, but every API call they make to NestJS will be rejected with a `403 Payment Required` until the Tenant status is restored to `ACTIVE`.*
