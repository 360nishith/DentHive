# PostgreSQL Native RLS Evaluation

**Subject:** Evaluating Native PostgreSQL RLS vs. Application-Level RLS
**Context:** DentalFlow currently utilizes Application-Level RLS (Supabase JWT -> AsyncLocalStorage -> Prisma Query Extensions). Should we also enable native PostgreSQL RLS at the database level?

---

## 1. Benefits of Native PostgreSQL RLS
*   **Defense in Depth:** Even if a bug is introduced in the Prisma Query Extension or a developer accidentally bypasses the AsyncLocalStorage context, the database itself will physically block cross-tenant data access.
*   **Analytics & Direct DB Access Protection:** If a DevOps engineer or a BI tool (like Metabase/Tableau) connects directly to the PostgreSQL database, native RLS ensures they cannot accidentally query data across tenants without explicitly setting the tenant context in the SQL session.

## 2. Drawbacks of Native PostgreSQL RLS
*   **Connection Pooling Conflicts:** Native RLS requires setting a session variable (e.g., `SET app.current_tenant_id = '...'`) at the start of every transaction. If you use a connection pooler like PgBouncer in "Transaction Mode" (which Prisma accelerates via Prisma Accelerate/PgBouncer), session variables can bleed across requests if not meticulously managed, leading to severe data corruption (Tenant A seeing Tenant B's data).
*   **Prisma Limitations:** Prisma's architecture does not natively support issuing a `SET` command before every query on a shared connection pool without significant workarounds (like executing raw SQL transactions for every single query).
*   **Database Migrations:** Managing RLS policies requires writing raw SQL during Prisma migrations. Prisma Schema `schema.prisma` does not support defining PostgreSQL RLS policies out of the box.

## 3. Performance Impact
*   **Latency Overhead:** Executing a `SET LOCAL` command before every query adds a slight network round-trip overhead. While minimal in isolation, it compounds on complex pages requiring multiple queries.
*   **Index Usage:** PostgreSQL must evaluate the RLS policy on every row. While usually optimized, complex RLS policies can sometimes prevent the query planner from using the most efficient indexes.

## 4. Complexity Impact
*   **Massive Increase in Complexity:** Developers must maintain security logic in *two* places: the Prisma Application Extension and the raw SQL migration files. 
*   Debugging becomes significantly harder. If a query returns empty results, the developer must figure out if the Prisma Query Extension failed, or if the PostgreSQL native RLS policy silently blocked the rows.

## 5. Recommendation for MVP
**Recommendation:** **DO NOT USE NATIVE POSTGRESQL RLS.**
*   For a solo founder launching an MVP, the Application-Level RLS (Prisma Extensions + AsyncLocalStorage) is more than sufficient. It is secure, fully typed in TypeScript, easy to test, and perfectly compatible with Prisma's connection pooling. Adding native PostgreSQL RLS will cripple your development velocity due to the raw SQL migration overhead and connection pooler debugging.

## 6. Recommendation for Scale (Enterprise)
**Recommendation:** **EVALUATE FOR COMPLIANCE ONLY.**
*   At scale (e.g., when signing contracts with enterprise hospital networks that demand strict SOC2 / HIPAA compliance audits), native PostgreSQL RLS might become a hard requirement to prove "Defense in Depth" to external auditors.
*   If this becomes necessary, the engineering team should evaluate moving away from Prisma to an ORM that natively supports session-based RLS (like Drizzle ORM) or using Supabase's fully managed Postgres API (PostgREST), which handles connection pooling and RLS natively. Until that enterprise threshold is reached, stick to Application-Level RLS.
