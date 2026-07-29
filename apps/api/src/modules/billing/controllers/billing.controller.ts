import { Controller, Post, Get, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { TenantStatusGuard } from '../../../common/guards/tenant-status.guard';
import { PaymentService } from '../services/payment.service';
import { SubscriptionService } from '../services/subscription.service';
import { RazorpayService } from '../services/razorpay.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('billing')
@UseGuards(AuthGuard('jwt'), TenantStatusGuard, RolesGuard)
export class BillingController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly paymentService: PaymentService,
    private readonly razorpayService: RazorpayService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('status')
  async getSubscriptionStatus() {
    return { status: 'ACTIVE' };
  }

  @Get('prices')
  async getPrices() {
    return {
      standard: parseInt(process.env.NEXT_PUBLIC_SAAS_PRICE_STANDARD || '2499'),
      discounted: parseInt(process.env.NEXT_PUBLIC_SAAS_PRICE_DISCOUNTED || '1999'),
      extraDoctor: parseInt(process.env.NEXT_PUBLIC_EXTRA_DOCTOR_PRICE_INR || '2000')
    };
  }

  @Post('checkout')
  async createCheckout(@Req() req: any, @Body() body: { billingCycle?: 'monthly' | 'semi_annual' | 'annual' }) {
    const cycle = body.billingCycle || 'monthly';
    const tenant = await this.prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
    
    let basePrice = parseInt(process.env.NEXT_PUBLIC_SAAS_PRICE_STANDARD || '2499');
    let planType: 'STANDARD' | 'BYOS' = 'STANDARD';
    
    if (tenant?.waPhoneNumberId && tenant?.waAccessToken) {
      basePrice = parseInt(process.env.NEXT_PUBLIC_SAAS_PRICE_DISCOUNTED || '1999');
      planType = 'BYOS';
    }

    const activeDentists = await this.prisma.user.count({
      where: {
        tenantId: req.user.tenantId,
        role: { name: 'DENTIST' },
        isActive: true
      }
    });

    const extraPricePerDentist = parseInt(process.env.NEXT_PUBLIC_EXTRA_DOCTOR_PRICE_INR || '2000');
    let finalPrice = basePrice + (activeDentists * extraPricePerDentist);

    if (cycle === 'semi_annual') {
      finalPrice = Math.round(finalPrice * 6 * 0.90); // 6 months, 10% off
    } else if (cycle === 'annual') {
      finalPrice = Math.round(finalPrice * 12 * 0.80); // 12 months, 20% off
    }

    const order = await this.razorpayService.createOrder(req.user.tenantId, planType, finalPrice, cycle);
    return order;
  }

  @Post('upgrade-cycle')
  async upgradeCycle(@Req() req: any, @Body() body: { billingCycle: 'monthly' | 'semi_annual' | 'annual' }) {
    const cycle = body.billingCycle;
    if (!cycle) throw new Error('billingCycle is required');

    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId: req.user.tenantId, status: 'ACTIVE' }
    });

    if (!sub || !sub.razorpaySubId) {
      throw new Error('No active subscription found to upgrade.');
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
    
    let basePrice = parseInt(process.env.NEXT_PUBLIC_SAAS_PRICE_STANDARD || '2499');
    let planType: 'STANDARD' | 'BYOS' = 'STANDARD';
    
    if (tenant?.waPhoneNumberId && tenant?.waAccessToken) {
      basePrice = parseInt(process.env.NEXT_PUBLIC_SAAS_PRICE_DISCOUNTED || '1999');
      planType = 'BYOS';
    }

    const activeDentists = await this.prisma.user.count({
      where: {
        tenantId: req.user.tenantId,
        role: { name: 'DENTIST' },
        isActive: true
      }
    });

    const extraPricePerDentist = parseInt(process.env.NEXT_PUBLIC_EXTRA_DOCTOR_PRICE_INR || '2000');
    let finalPrice = basePrice + (activeDentists * extraPricePerDentist);

    if (cycle === 'semi_annual') {
      finalPrice = Math.round(finalPrice * 6 * 0.90);
    } else if (cycle === 'annual') {
      finalPrice = Math.round(finalPrice * 12 * 0.80);
    }

    // Prorate discount based on remaining days of current subscription
    const now = new Date();
    const periodEnd = new Date(sub.currentPeriodEnd);
    let proratedDiscount = 0;
    
    if (periodEnd > now) {
      const daysLeft = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      // Assume current price per day based on monthly rate
      const currentPricePerDay = (basePrice + (activeDentists * extraPricePerDentist)) / 30;
      proratedDiscount = Math.round(daysLeft * currentPricePerDay);
    }
    
    finalPrice = Math.max(0, finalPrice - proratedDiscount);

    const order = await this.razorpayService.createOrder(req.user.tenantId, planType, finalPrice, cycle, true);
    return order;
  }

  @Post('cancel')
  async cancelSubscription(@Req() req: any) {
    const activeSub = await this.prisma.subscription.findFirst({
      where: { tenantId: req.user.tenantId, status: 'ACTIVE' }
    });

    if (!activeSub || !activeSub.razorpaySubId) {
      return { success: false, message: 'No active recurring subscription found.' };
    }

    await this.razorpayService.cancelSubscription(activeSub.razorpaySubId);

    await this.prisma.subscription.update({
      where: { id: activeSub.id },
      data: { cancelAtPeriodEnd: true }
    });

    return { success: true };
  }

  // ── Payment Endpoints ────────────────────────────────────────

  @Post('payments')
  async recordPayment(@Req() req: any, @Body() body: any) {
    return this.paymentService.recordPayment(req.user.tenantId, {
      journeyId: body.journeyId,
      amount: parseInt(body.amount),
      paymentMethod: body.paymentMethod,
      note: body.note,
    });
  }

  @Get('payments/journey/:journeyId')
  async getJourneySummary(@Req() req: any, @Param('journeyId') journeyId: string) {
    return this.paymentService.getJourneySummary(req.user.tenantId, journeyId);
  }

  @Get('payments/patient/:patientId')
  async getPatientPayments(@Req() req: any, @Param('patientId') patientId: string) {
    return this.paymentService.getPatientPayments(req.user.tenantId, patientId);
  }

  @Get('revenue')
  async getRevenueStats(@Req() req: any, @Query('doctorId') doctorId?: string) {
    if (req.user.role !== 'STAFF') {
      doctorId = req.user.id;
    }
    return this.paymentService.getRevenueStats(req.user.tenantId, doctorId);
  }

  @Get('charts')
  async getCharts(@Req() req: any, @Query('doctorId') doctorId?: string) {
    if (req.user.role !== 'STAFF') {
      doctorId = req.user.id;
    }
    return this.paymentService.getRevenueCharts(req.user.tenantId, doctorId);
  }
}
