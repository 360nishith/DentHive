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
    
    if (!sub) {
      this.logger.warn(`No active subscription found for tenant ${tenantId}. Skipping per-seat billing sync.`);
      return;
    }

    // Calculate remaining days
    const now = new Date();
    const periodEnd = new Date(sub.currentPeriodEnd);
    if (periodEnd <= now) return; // Expired anyway

    const daysLeft = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // 2. Calculate prorated price for ONE new doctor
    const extraPricePerDentist = parseInt(process.env.NEXT_PUBLIC_EXTRA_DOCTOR_PRICE_INR || '2000');
    // Discount based on how many days are left in a 30-day period
    let proratedAmount = Math.round(extraPricePerDentist * (daysLeft / 30));

    if (proratedAmount <= 0) return;

    this.logger.log(`Adding prorated arrears for tenant ${tenantId} for new doctor. Amount: ₹${proratedAmount}`);

    // Add to pendingArrears
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        pendingArrears: { increment: proratedAmount }
      }
    });

    // 5. Notify the user in the app
    const message = `A new doctor was added to your clinic. ₹${proratedAmount} has been added to your pending arrears for the remaining ${daysLeft} days in your billing cycle. Please go to the Settings page to pay this balance.`;

    await this.prisma.notification.create({
      data: {
        tenantId,
        title: 'Outstanding Balance Added',
        message,
        type: 'WARNING'
      }
    });
  }
}
