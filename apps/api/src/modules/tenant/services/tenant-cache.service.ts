import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class TenantCacheService {
  private readonly logger = new Logger(TenantCacheService.name);
  private readonly TTL = 86400; // 24 hours

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private prisma: PrismaService
  ) {}

  async setStatus(tenantId: string, status: string): Promise<void> {
    const key = `tenant_status:${tenantId}`;
    await this.redis.set(key, status, 'EX', this.TTL);
  }

  async getStatusSafely(tenantId: string): Promise<string> {
    const key = `tenant_status:${tenantId}`;
    const cachedStatus = await this.redis.get(key);

    if (cachedStatus) return cachedStatus;

    this.logger.warn(`Cache miss for Tenant ${tenantId}. Executing Graceful Fallback to DB.`);
    
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId },
      select: { status: true }
    });

    const status = tenant?.status || 'SUSPENDED';
    await this.setStatus(tenantId, status);
    
    return status;
  }

  async getInternalUserIdSafely(authId: string): Promise<string | null> {
    const key = `user_internal_id:${authId}`;
    const cachedId = await this.redis.get(key);

    if (cachedId) return cachedId;

    const user = await this.prisma.user.findFirst({
      where: { authId },
      select: { id: true }
    });

    if (user?.id) {
      await this.redis.set(key, user.id, 'EX', this.TTL);
      return user.id;
    }

    return null;
  }
}
