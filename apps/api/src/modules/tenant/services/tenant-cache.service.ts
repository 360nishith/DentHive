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
}
