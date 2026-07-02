import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class JwtOnboardingStrategy extends PassportStrategy(Strategy, 'jwt-onboarding') {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
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
    const iat = payload.iat;

    // 1. JWT REVOCATION CHECK (Stateless)
    const revocationTimestampStr = await this.redis.get(`revoked_user:${userId}`);
    if (revocationTimestampStr) {
      const revocationTimestamp = parseInt(revocationTimestampStr, 10);
      if (iat < revocationTimestamp) {
        throw new UnauthorizedException('Session has been revoked by an administrator');
      }
    }

    // Do NOT check for tenantId. This strategy is strictly for endpoints that 
    // are used during the onboarding flow (like POST /tenant) where the user 
    // does not have a tenantId yet.

    return { id: userId, role: payload.app_metadata?.role };
  }
}
