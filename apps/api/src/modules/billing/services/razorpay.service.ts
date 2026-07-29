import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantCacheService } from '../../tenant/services/tenant-cache.service';
import * as crypto from 'crypto';
const Razorpay = require('razorpay');

@Injectable()
export class RazorpayService {
  private razorpay: any;

  constructor(
    private prisma: PrismaService,
    private tenantCache: TenantCacheService
  ) {
    this.razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_xxx',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_xxx',
    });
  }

  async createOrder(tenantId: string, planType: 'STANDARD' | 'BYOS', priceInRupees: number, billingCycle: 'monthly' | 'semi_annual' | 'annual' = 'monthly', isUpgrade: boolean = false) {
    const priceInPaise = Math.round(priceInRupees * 100);
    const cycleSuffix = billingCycle === 'annual' ? 'Annual' : (billingCycle === 'semi_annual' ? '6-Months' : 'Monthly');

    try {
      const order = await this.razorpay.orders.create({
        amount: priceInPaise,
        currency: "INR",
        notes: {
          tenantId,
          planType,
          billingCycle,
          isUpgrade: isUpgrade ? 'true' : 'false'
        }
      });
      return order;
    } catch (err: any) {
      console.error('Failed to create Razorpay order', err);
      const errorMessage = err.error?.description || err.message || 'Unknown Razorpay error';
      throw new BadRequestException(`Failed to generate order: ${errorMessage}`);
    }
  }

  async createPaymentLink(tenantId: string, amountInRupees: number, description: string, customerDetails: { name: string, email: string, contact: string }) {
    try {
      const paymentLink = await this.razorpay.paymentLink.create({
        amount: Math.round(amountInRupees * 100),
        currency: "INR",
        accept_partial: false,
        description,
        customer: customerDetails,
        notify: {
          sms: true,
          email: true
        },
        reminder_enable: true,
        notes: {
          tenantId,
          isProratedUpgrade: 'true'
        }
      });
      return paymentLink.short_url;
    } catch (err) {
      console.error('Failed to create payment link', err);
      return null;
    }
  }

  async cancelSubscription(subscriptionId: string) {
    try {
      // cancel_at_cycle_end: 1 ensures they get what they paid for this month
      await this.razorpay.subscriptions.cancel(subscriptionId, { cancel_at_cycle_end: 1 });
      return true;
    } catch (err) {
      console.error('Failed to cancel Razorpay subscription', err);
      throw new BadRequestException('Failed to cancel subscription in Razorpay');
    }
  }

  async verifyWebhookSignature(body: any, signature: string) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');

    return expectedSignature === signature;
  }

  // Handle successful recurring charge (First time or Nth time)
  async handleSubscriptionCharged(payload: any) {
    const subscriptionEntity = payload.payload.subscription?.entity;
    const paymentEntity = payload.payload.payment?.entity;
    
    // If it's a one-off order that somehow hit this webhook, ignore or fallback
    if (!subscriptionEntity) {
        return;
    }

    const tenantId = subscriptionEntity.notes?.tenantId;
    const razorpaySubId = subscriptionEntity.id;
    const planType = subscriptionEntity.notes?.planType || 'STANDARD';

    if (!tenantId) {
      console.error('Razorpay Webhook: Missing tenantId in notes');
      return;
    }

    const newPeriodEnd = new Date(subscriptionEntity.current_end * 1000);

    const currentSub = await this.prisma.subscription.findFirst({
      where: { tenantId }
    });

    if (currentSub) {
      await this.prisma.subscription.update({
        where: { id: currentSub.id },
        data: {
          status: 'ACTIVE',
          currentPeriodEnd: newPeriodEnd,
          razorpaySubId: razorpaySubId,
          planTier: planType,
          cancelAtPeriodEnd: false // Reset in case they resubscribed
        }
      });
    } else {
      await this.prisma.subscription.create({
        data: {
          tenantId,
          planTier: planType,
          status: 'ACTIVE',
          currentPeriodEnd: newPeriodEnd,
          razorpaySubId: razorpaySubId
        }
      });
    }

    // Un-suspend the tenant if they were suspended
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'ACTIVE' }
    });
  }

  async handleSubscriptionHalted(payload: any) {
    const subscriptionEntity = payload.payload.subscription?.entity;
    if (!subscriptionEntity) return;

    const tenantId = subscriptionEntity.notes?.tenantId;
    if (!tenantId) return;

    await this.prisma.subscription.updateMany({
      where: { tenantId },
      data: { status: 'HALTED' } // Will cause READ_ONLY mode once expiry passes
    });
  }

  // Handle successful prepaid order capture
  async handleOrderPaid(payload: any) {
    const paymentEntity = payload.payload.payment?.entity;
    const orderId = paymentEntity?.order_id;
    
    if (!orderId) return;

    // Idempotency check: Don't process the same order twice
    const alreadyProcessed = await this.tenantCache.checkAndSetOrderProcessed(orderId);
    if (alreadyProcessed) {
      console.log(`Order ${orderId} was already processed, skipping duplicate webhook.`);
      return;
    }

    try {
      const order = await this.razorpay.orders.fetch(orderId);
      const tenantId = order.notes?.tenantId;
      const planType = order.notes?.planType || 'STANDARD';
      const billingCycle = order.notes?.billingCycle || 'monthly';
      
      if (!tenantId) {
        console.error('Razorpay Webhook: Missing tenantId in order notes');
        return;
      }

      // Calculate new expiration date
      const currentSub = await this.prisma.subscription.findFirst({
        where: { tenantId }
      });

      let currentEnd = currentSub && currentSub.currentPeriodEnd > new Date() ? currentSub.currentPeriodEnd : new Date();
      
      let daysToAdd = 30;
      if (billingCycle === 'annual') daysToAdd = 365;
      if (billingCycle === 'semi_annual') daysToAdd = 180;
      if (planType === 'ARREARS') daysToAdd = 0;

      currentEnd.setDate(currentEnd.getDate() + daysToAdd);

      if (currentSub) {
        await this.prisma.subscription.update({
          where: { id: currentSub.id },
          data: {
            status: 'ACTIVE',
            currentPeriodEnd: currentEnd,
            planTier: planType,
            // If they are moving to Prepaid, we can clear razorpaySubId so cron jobs know it's not a subscription anymore
            razorpaySubId: null,
            cancelAtPeriodEnd: false
          }
        });
      } else {
        await this.prisma.subscription.create({
          data: {
            tenantId,
            planTier: planType,
            status: 'ACTIVE',
            currentPeriodEnd: currentEnd
          }
        });
      }

      // Un-suspend the tenant if they were suspended, and clear their pending arrears
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { 
          status: 'ACTIVE',
          pendingArrears: 0
        }
      });

      // Activate any newly added doctors that were waiting for arrears to be paid
      await this.prisma.user.updateMany({
        where: { tenantId, status: 'ARREARS_PENDING' },
        data: {
          isActive: true,
          status: 'ACTIVE'
        }
      });

    } catch (err) {
      console.error('Failed to process prepaid order', err);
    }
  }
}
