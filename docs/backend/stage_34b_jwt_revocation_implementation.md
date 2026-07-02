# STAGE 34B — JWT Revocation Security Implementation

**Subject:** Immediate Stateless Token Invalidation
**Stack:** NestJS, Passport-JWT, Redis, Supabase
**Core Features:** Global Sign-out, Privilege Downgrade Enforcement, Sub-millisecond Execution.

---

## Folder Structure
```text
src/modules/auth/
├── services/
│   └── jwt-revocation.service.ts
├── strategies/
│   └── jwt.strategy.ts
src/modules/users/
├── services/
│   └── users.service.ts
```

---

## 1. Services

### `src/modules/auth/services/jwt-revocation.service.ts`
```typescript
import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis'; // Or specific Redis module injection token

@Injectable()
export class JwtRevocationService {
  // Supabase JWTs max lifespan is exactly 3600 seconds (1 hour)
  private readonly SUPABASE_JWT_TTL = 3600;

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  /**
   * Immediately invalidates all currently active JWTs for a specific user.
   * @param userId The UUID of the user being revoked.
   */
  async revokeUserAccess(userId: string): Promise<void> {
    const key = `revoked_user:${userId}`;
    const revocationTimestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds

    // Set the revocation timestamp in Redis
    // The key automatically expires after 1 hour, because by then,
    // all pre-existing JWTs will have naturally expired anyway.
    await this.redis.set(key, revocationTimestamp, 'EX', this.SUPABASE_JWT_TTL);
  }
}
```
*   **Purpose:** Exposes a simple internal API to globally log a user out of all devices instantly.
*   **Performance / Memory:** By utilizing the `EX` (Expire) flag with `SUPABASE_JWT_TTL`, Redis memory cleans itself perfectly. The server will never run out of RAM holding onto stale revocation records.

### `src/modules/users/services/users.service.ts`
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtRevocationService } from '../../auth/services/jwt-revocation.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private revocationService: JwtRevocationService
  ) {}

  async deactivateUser(tenantId: string, targetUserId: string) {
    const user = await this.prisma.user.updateMany({
      where: { id: targetUserId, tenantId },
      data: { status: 'ARCHIVED' }
    });

    if (user.count === 0) throw new NotFoundException('User not found');

    // SECURITY: Fire immediately. The receptionist's active token is now dead.
    await this.revocationService.revokeUserAccess(targetUserId);

    return { success: true };
  }

  async updateRole(tenantId: string, targetUserId: string, newRole: string) {
    const user = await this.prisma.user.updateMany({
      where: { id: targetUserId, tenantId },
      data: { role: newRole as any }
    });

    if (user.count === 0) throw new NotFoundException('User not found');

    // SECURITY: Force the user to re-authenticate to receive a new JWT with updated claims.
    await this.revocationService.revokeUserAccess(targetUserId);

    return { success: true };
  }
}
```
*   **Purpose:** Triggers the revocation logic precisely when a clinic's security boundary shifts (Deactivation or Role changes).
*   **Security Check:** Ensures that when an admin demotes an `ADMIN` to `FRONT_DESK`, the user cannot continue executing `ADMIN` endpoints for the remainder of the hour using their old cached JWT.

---

## 2. Strategies

### `src/modules/auth/strategies/jwt.strategy.ts`
```typescript
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.SUPABASE_JWT_SECRET, // Cryptographic verification
    });
  }

  async validate(payload: any) {
    // 1. Supabase standard payload extracts
    const userId = payload.sub;
    const tenantId = payload.app_metadata?.tenantId;
    const iat = payload.iat; // "Issued At" Unix timestamp in seconds

    if (!tenantId) throw new UnauthorizedException('Tenant ID missing from token');

    // 2. JWT REVOCATION CHECK (Sub-millisecond Redis Execution)
    const revocationTimestampStr = await this.redis.get(`revoked_user:${userId}`);
    
    if (revocationTimestampStr) {
      const revocationTimestamp = parseInt(revocationTimestampStr, 10);
      
      // If the token was issued BEFORE the revocation event occurred, it is invalid.
      // If iat > revocationTimestamp, it means they logged in successfully AFTER being revoked.
      if (iat < revocationTimestamp) {
        throw new UnauthorizedException('Session has been revoked by an administrator');
      }
    }

    // 3. Return validated user to attach to Request object
    return { id: userId, tenantId, role: payload.app_metadata?.role };
  }
}
```
*   **Purpose:** The ultimate gatekeeper for every single protected HTTP request in the NestJS platform.
*   **Execution Speed:** Redis `GET` operations typically execute in `< 1ms`. This check adds virtually zero overhead to the API latency, while securing the entire platform against token hijacking and rogue employee behavior.
*   **The "Issued At" Math**: 
    *   *12:00 PM*: User logs in (JWT `iat = 12:00`).
    *   *12:15 PM*: Admin revokes user (Redis `revocationTimestamp = 12:15`).
    *   *12:16 PM*: User attempts API request. `12:00 < 12:15` -> **DENIED**.
    *   *12:20 PM*: User logs back in (JWT `iat = 12:20`).
    *   *12:21 PM*: User attempts API request. `12:20 > 12:15` -> **ALLOWED**. This prevents a permanent lockout while the Redis key naturally decays.
