# Cross-Cutting Concerns (Guards, Middleware, Validation, Errors)

This document details the configuration of the NestJS application pipeline, specifically how requests are intercepted, validated, and sanitized before reaching the core business logic.

---

## 1. Middleware & Tenant Injection

Because DentalFlow is a multi-tenant SaaS, the `tenantId` is the most critical piece of context for any request.

### `TenantInjectionMiddleware`
A global middleware runs on every inbound request to the API.
1. **Extraction:** It extracts the subdomain from the `Origin` or `Host` header (e.g., `shenoy.dentalflow.in`).
2. **Resolution:** It queries Redis (or an LRU cache) to map the subdomain to a `tenantId`.
3. **Injection:** It attaches `tenantId` to the `req` object.

```typescript
// Concept
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const subdomain = this.extractSubdomain(req.headers.host);
    const tenantId = await this.tenantService.getIdBySubdomain(subdomain);
    req['tenantId'] = tenantId; // Injected for the @CurrentTenant() decorator
    next();
  }
}
```

---

## 2. Guards (Authentication & RBAC)

Guards are evaluated immediately after Middleware.

### `JwtAuthGuard`
Secures all endpoints by default (using Passport.js under the hood). Validates the JWT and attaches the `User` payload to `req.user`. It also cross-verifies that the user's `tenantId` in the JWT matches the `tenantId` extracted from the subdomain to prevent cross-tenant token replay attacks.

### `RolesGuard`
Implements Role-Based Access Control (RBAC). 
Using a custom `@Roles()` decorator, we can restrict specific endpoints (like generating a SaaS subscription payment link) to the `DENTIST` (Owner) role, blocking `ASSISTANT` accounts.

```typescript
// Concept
@Post('billing/upgrade')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DENTIST')
async upgradeSubscription() { ... }
```

---

## 3. Global Validation

We enforce strict input sanitization to protect the database layer.

### `ValidationPipe` Configuration
In `main.ts`, the global `ValidationPipe` must be configured with strict security flags:

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,            // Strips any properties without decorators
  forbidNonWhitelisted: true, // Throws 400 Bad Request if unknown properties exist
  transform: true,            // Automatically transforms payloads to DTO instances
}));
```

---

## 4. Error Handling & Exception Filters

A critical rule in DentalFlow: **Prisma Exceptions must never leak to the client.** Raw database errors contain schema details that are security risks.

### `PrismaClientExceptionFilter`
A global exception filter (`@Catch()`) intercepts all thrown errors. If it catches a `PrismaClientKnownRequestError`, it maps the Prisma code to a standard HTTP status:

*   **`P2002` (Unique Constraint Failed):** Mapped to `409 Conflict`. (e.g., "A patient with this phone number already exists").
*   **`P2025` (Record Not Found):** Mapped to `404 Not Found`.
*   **`P2003` (Foreign Key Constraint Failed):** Mapped to `400 Bad Request` or `422 Unprocessable Entity`.

```typescript
// Concept
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case 'P2002': {
        const status = HttpStatus.CONFLICT;
        response.status(status).json({
          statusCode: status,
          message: 'Unique constraint failed on a database field.',
        });
        break;
      }
      // ... other mappings
    }
  }
}
```
