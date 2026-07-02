import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
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
      discounted: parseInt(process.env.NEXT_PUBLIC_SAAS_PRICE_DISCOUNTED || '1999')
    };
  }

  @Post('checkout')
  async createCheckout(@Req() req: any) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
    
    let price = parseInt(process.env.NEXT_PUBLIC_SAAS_PRICE_STANDARD || '2499');
    let planType: 'STANDARD' | 'BYOS' = 'STANDARD';
    
    if (tenant?.waPhoneNumberId && tenant?.waAccessToken) {
      price = parseInt(process.env.NEXT_PUBLIC_SAAS_PRICE_DISCOUNTED || '1999');
      planType = 'BYOS';
    }

    const subscription = await this.razorpayService.createSubscription(req.user.tenantId, planType, price);
    return subscription;
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
  async getRevenueStats(@Req() req: any) {
    return this.paymentService.getRevenueStats(req.user.tenantId);
  }

  @Get('charts')
  async getCharts(@Req() req: any) {
    return this.paymentService.getRevenueCharts(req.user.tenantId);
  }
}
