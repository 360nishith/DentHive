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

    return { id: userId, tenantId, role: payload.app_metadata?.role, email: payload.email };
  }
}
