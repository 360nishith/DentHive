import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantCacheService } from '../../tenant/services/tenant-cache.service';
import { OnEvent } from '@nestjs/event-emitter';
import { RazorpayService } from './razorpay.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private prisma: PrismaService,
    private tenantCache: TenantCacheService,
    private razorpayService: RazorpayService
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

  @OnEvent('staff.created')
  async handleStaffCreated(payload: { tenantId: string, user: any, role: string }) {
    if (payload.role !== 'DENTIST') return;
    await this.syncPerSeatBilling(payload.tenantId);
  }

  @OnEvent('staff.status_changed')
  async handleStaffStatusChanged(payload: { tenantId: string, user: any, role: string, status: string }) {
    if (payload.role !== 'DENTIST') return;
    await this.syncPerSeatBilling(payload.tenantId);
  }

  private async syncPerSeatBilling(tenantId: string) {
    // 1. Get the current active subscription
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: 'ACTIVE' }
    });
    
    if (!sub || !sub.razorpaySubId) {
      this.logger.warn(`No active Razorpay subscription found for tenant ${tenantId}. Skipping per-seat billing sync.`);
      return;
    }

    // 2. Count active dentists (including the ADMIN owner, if they are counted. Wait, we'll count all active users who are DENTIST or ADMIN).
    // Let's assume ADMIN is included in the base plan, so we only charge extra for additional DENTISTs.
    const activeDentists = await this.prisma.user.count({
      where: {
        tenantId,
        status: 'ACTIVE',
        role: { name: 'DENTIST' } // Count only extra dentists
      }
    });

    // 3. Calculate new price
    // Base Price is determined by their planTier (e.g. 5000 for standard)
    // Actually we can just fetch the base price from env or standard config. Let's assume STANDARD is 5000.
    const basePrice = parseInt(process.env.NEXT_PUBLIC_STANDARD_PLAN_PRICE_INR || '5000');
    const extraPricePerDentist = parseInt(process.env.NEXT_PUBLIC_EXTRA_DOCTOR_PRICE_INR || '2000');
    
    const newPrice = basePrice + (activeDentists * extraPricePerDentist);

    this.logger.log(`Syncing per-seat billing for tenant ${tenantId}. Active Extra Dentists: ${activeDentists}. New Total Price: ${newPrice}`);

    // 4. Update Razorpay
    try {
      await this.razorpayService.updateSubscriptionPlan(sub.razorpaySubId, sub.planTier as 'STANDARD' | 'BYOS', newPrice);
    } catch (e) {
      this.logger.error(`Failed to sync per-seat billing with Razorpay for tenant ${tenantId}`, e);
    }
  }
}
