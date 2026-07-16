import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { TenantCacheService } from '../../tenant/services/tenant-cache.service';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private tenantCache: TenantCacheService,
    configService: ConfigService
  ) {
    const supabaseUrl = configService.get<string>('SUPABASE_URL', 'https://myzxrfqwmnpukzuzyevd.supabase.co');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      }),
      algorithms: ['ES256', 'RS256', 'HS256'],
    });
  }

  async validate(payload: any) {
    const userId = payload.sub;
    const tenantId = payload.app_metadata?.tenantId;
    const iat = payload.iat;

    if (!tenantId) throw new UnauthorizedException('Tenant ID missing from token');

    // 1. JWT REVOCATION CHECK (Stateless)
    const revocationTimestampStr = await this.redis.get(`revoked_user:${userId}`);
    if (revocationTimestampStr) {
      const revocationTimestamp = parseInt(revocationTimestampStr, 10);
      if (iat < revocationTimestamp) {
        throw new UnauthorizedException('Session has been revoked by an administrator');
      }
    }

    // 2. HYDRATE TENANT CACHE
    this.tenantCache.getStatusSafely(tenantId).catch(() => {});

    // 3. MAP AUTH ID TO INTERNAL USER ID
    // The JWT contains the Supabase auth ID, but the Prisma Middleware and database
    // expect the internal database `User.id` for isolation rules.
    const internalUserId = await this.tenantCache.getInternalUserIdSafely(userId);

    // If for some reason the internal user isn't found (e.g. user just created in Supabase but not yet in our DB),
    // we fallback to the Supabase UUID to prevent complete request failure, though isolation might not work until synced.
    const finalUserId = internalUserId || userId;

    return { id: finalUserId, tenantId, role: payload.app_metadata?.role, email: payload.email };
  }
}
