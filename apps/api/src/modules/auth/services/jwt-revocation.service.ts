import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class JwtRevocationService {
  // Supabase JWTs max lifespan is exactly 3600 seconds (1 hour)
  private readonly SUPABASE_JWT_TTL = 3600;

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  /**
   * Immediately invalidates all currently active JWTs for a specific user.
   */
  async revokeUserAccess(userId: string): Promise<void> {
    const key = `revoked_user:${userId}`;
    const revocationTimestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds

    // Set the revocation timestamp in Redis. Expires naturally after 1 hour.
    await this.redis.set(key, revocationTimestamp, 'EX', this.SUPABASE_JWT_TTL);
  }
}
