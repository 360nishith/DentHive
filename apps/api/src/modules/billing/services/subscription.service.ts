import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantCacheService } from '../../tenant/services/tenant-cache.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private prisma: PrismaService,
    private tenantCache: TenantCacheService
  ) {}

  /**
   * Processed upon receiving 'subscription.halted' webhook.
   * BUG FIX: razorpaySubId !== tenantId — must look up the subscription first.
   */
  async handleSubscriptionHalted(razorpaySubId: string) {
    this.logger.log(`Razorpay halted subscription: ${razorpaySubId}`);
    const sub = await this.prisma.subscription.findFirst({ where: { razorpaySubId } });
    if (!sub) { this.logger.warn(`No subscription found for ${razorpaySubId}`); return; }
    await this.prisma.tenant.update({ where: { id: sub.tenantId }, data: { status: 'SUSPENDED' } });
    await this.tenantCache.setStatus(sub.tenantId, 'SUSPENDED');
  }

  async handleSubscriptionActivated(razorpaySubId: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { razorpaySubId } });
    if (!sub) { this.logger.warn(`No subscription found for ${razorpaySubId}`); return; }
    await this.prisma.tenant.update({ where: { id: sub.tenantId }, data: { status: 'ACTIVE' } });
    await this.tenantCache.setStatus(sub.tenantId, 'ACTIVE');
  }
}
