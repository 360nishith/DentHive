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

    this.logger.log(`Generating prorated Payment Link for tenant ${tenantId} for new doctor. Amount: ₹${proratedAmount}`);

    // Get tenant admin details for the payment link
    const tenantOwner = await this.prisma.user.findFirst({
      where: { tenantId, role: { name: 'DENTIST' } },
      orderBy: { createdAt: 'asc' }
    });

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    // 4. Generate Payment Link via Razorpay
    const paymentLinkUrl = await this.razorpayService.createPaymentLink(
      tenantId,
      proratedAmount,
      `DentHive: Prorated charge for adding a new doctor (${daysLeft} days remaining in billing cycle)`,
      {
        name: tenantOwner?.firstName || tenant?.name || 'Clinic Admin',
        email: tenantOwner?.email || tenant?.contactEmail || 'admin@clinic.com',
        contact: tenantOwner?.phoneNumber || tenant?.contactPhone || '+910000000000'
      }
    );

    // 5. Notify the user in the app
    const message = paymentLinkUrl 
      ? `A new doctor was added to your clinic. Please pay the prorated invoice of ₹${proratedAmount} for the remaining ${daysLeft} days in your billing cycle to activate their access: ${paymentLinkUrl}`
      : `A new doctor was added to your clinic. Please contact support to pay the prorated invoice of ₹${proratedAmount}.`;

    await this.prisma.notification.create({
      data: {
        tenantId,
        title: 'New Doctor Added - Payment Required',
        message,
        type: 'WARNING'
      }
    });
  }
}
