import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as crypto from 'crypto';
const Razorpay = require('razorpay');

@Injectable()
export class RazorpayService {
  private razorpay: any;

  constructor(private prisma: PrismaService) {
    this.razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_xxx',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_xxx',
    });
  }

  // Helper to dynamically get or create a plan based on the .env price
  async getOrCreatePlan(planType: 'STANDARD' | 'BYOS', priceInRupees: number) {
    const priceInPaise = priceInRupees * 100;
    const planName = `DentHive ${planType} - ${priceInRupees}`;

    // 1. Fetch existing plans from Razorpay
    try {
      const existingPlans = await this.razorpay.plans.all();
      const existingPlan = existingPlans.items.find(
        (p: any) => p.item.name === planName && p.item.amount === priceInPaise
      );
      if (existingPlan) {
        return existingPlan.id;
      }
    } catch (err) {
      console.error('Error fetching plans', err);
    }

    // 2. If it doesn't exist, generate a new plan dynamically
    try {
      const newPlan = await this.razorpay.plans.create({
        period: "monthly",
        interval: 1,
        item: {
          name: planName,
          amount: priceInPaise,
          currency: "INR",
          description: `DentHive ${planType} Monthly Subscription`
        }
      });
      return newPlan.id;
    } catch (err) {
      console.error('Error creating plan', err);
      throw new BadRequestException('Failed to generate subscription plan dynamically.');
    }
  }

  async createSubscription(tenantId: string, planType: 'STANDARD' | 'BYOS', priceInRupees: number) {
    const planId = await this.getOrCreatePlan(planType, priceInRupees);

    // Create the subscription mandate
    const subscription = await this.razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 120, // 10 years of auto-billing
      customer_notify: 1,
      notes: { tenantId, planType }
    });

    return subscription;
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

  async updateSubscriptionPlan(subscriptionId: string, newPlanType: 'STANDARD' | 'BYOS', newPrice: number) {
    const newPlanId = await this.getOrCreatePlan(newPlanType, newPrice);
    try {
      await this.razorpay.subscriptions.update(subscriptionId, {
        plan_id: newPlanId,
        schedule_change_at: 'cycle_end' // Swap happens on the next billing date!
      });
      return true;
    } catch (err) {
      console.error('Failed to update Razorpay subscription', err);
      throw new BadRequestException('Failed to update subscription in Razorpay');
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
}
