# Prisma Schema Architecture & Implementation Guide

This document explains the design decisions behind the DentalFlow [schema.prisma](file:///d:/DentalFlow/prisma/schema.prisma) file and provides guidance on how to interact with it effectively in a Node.js/TypeScript environment.

---

## 1. Multi-Tenancy Implementation

### The `tenantId` Strategy
Every operational model (e.g., `Patient`, `TreatmentJourney`, `Appointment`) includes a `tenantId` field with a strict `Restrict` deletion policy. This creates a hard boundary ensuring data cannot accidentally leak across clinics.

### Indexing for Row-Level Security (RLS)
You will notice numerous composite indexes such as:
```prisma
@@index([tenantId, status])
@@index([tenantId, patientId])
```
Because we rely on PostgreSQL Row-Level Security, the database engine implicitly appends `WHERE tenant_id = 'xxx'` to every query. If an index does not begin with `tenantId`, PostgreSQL may bypass the index entirely and perform a full sequential scan. **Rule of thumb: All custom indexes must prefix with `tenantId`.**

### Querying the Multi-Tenant DB in Prisma
While RLS handles security at the database layer, Prisma currently does not have native, first-class support for setting Postgres session variables *per transaction* seamlessly in connection pools without raw SQL overhead. 

Therefore, you have two architectural choices when building the API:
1. **Prisma Client Extension (Application-Level Isolation):** Create an extended Prisma Client per request that automatically injects `{ tenantId: currentTenant }` into every `where` clause.
2. **Prisma `$executeRaw` (Database-Level Isolation):** Execute `SET LOCAL app.current_tenant_id = '...'` inside an interactive transaction before running your standard Prisma queries.

---

## 2. Soft Deletes

Medical and financial records should rarely, if ever, be permanently deleted. 

### Schema Support
Every model includes a `deletedAt DateTime? @db.Timestamptz` field.

### Implementation Guide
Prisma does not support native soft deletes via annotations (e.g., `@softDelete`). To enforce soft deletes without relying on developers to remember to add `where: { deletedAt: null }` to every query, you **must** use a Prisma Client Extension:

```typescript
// Conceptual example of Soft Delete Extension
const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null }
        return query(args)
      },
      async delete({ model, args }) {
        return prisma[model].update({
          ...args,
          data: { deletedAt: new Date() },
        })
      }
    },
  },
})
```

---

## 3. Audit Fields & Tracking

### Standard Timestamps
All models leverage Prisma's built-in `@default(now())` for `createdAt` and `@updatedAt` for `updatedAt`. These are mapped to `Timestamptz` to handle timezone data safely (important for an Indian user base spanning different server regions).

### The `AuditLog` Model
While timestamps tell us *when* a record was modified, the `AuditLog` table tells us *who* modified it and *what* changed.
```prisma
model AuditLog {
  // ...
  action     String   @db.VarChar(100)
  entityType String   @db.VarChar(50)
  entityId   String   @db.Uuid
  changes    Json?    @db.JsonB
}
```
*   **Implementation Note:** When a critical entity (like a `Payment` or a `TreatmentStage`) is updated, the API should wrap the Prisma `update` and `AuditLog.create` operations within a single interactive transaction (`prisma.$transaction`).

---

## 4. Foreign Key Constraints (`onDelete`)

Data integrity is preserved using explicit `onDelete` behaviors:
*   `Restrict`: Prevents deletion of a parent record (like a `Tenant` or `Patient`) if child records exist. This is the default for most relations.
*   `Cascade`: Used cautiously, mostly for internal composite structures. For example, deleting a `TreatmentJourney` cascades down to its `TreatmentStages`. Deleting a `TreatmentTemplate` cascades down to its `TemplateStages`.
*   `SetNull`: Used for the `currentStageId` pointer on the `TreatmentJourney`. If the stage is removed, the pointer becomes null rather than destroying the entire journey history.
