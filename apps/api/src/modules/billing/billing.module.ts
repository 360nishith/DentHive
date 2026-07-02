import { Module } from '@nestjs/common';
import { BillingController } from './controllers/billing.controller';
import { SubscriptionService } from './services/subscription.service';
import { PaymentService } from './services/payment.service';
import { RazorpayService } from './services/razorpay.service';
import { WebhooksController } from './webhooks.controller';
import { BillingCronService } from './services/billing-cron.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantModule } from '../tenant/tenant.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    TenantModule,
    BullModule.registerQueue({ name: 'billing' }),
  ],
  controllers: [BillingController, WebhooksController],
  providers: [SubscriptionService, PaymentService, RazorpayService, PrismaService, BillingCronService],
  exports: [SubscriptionService, PaymentService, RazorpayService],
})
export class BillingModule {}
