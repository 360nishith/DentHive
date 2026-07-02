import { Controller, Post, Headers, Body, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './services/subscription.service';
import { RazorpayService } from './services/razorpay.service';
import { WebhookSignatureGuard } from '../../common/guards/webhook-signature.guard';

@Controller('webhooks/razorpay')
@UseGuards(WebhookSignatureGuard)
export class WebhooksController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly razorpayService: RazorpayService
  ) {}

  @Post()
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() payload: any, 
  ) {
    if (payload.event === 'subscription.halted') {
      await this.razorpayService.handleSubscriptionHalted(payload);
    } else if (payload.event === 'subscription.charged') {
      await this.razorpayService.handleSubscriptionCharged(payload);
    }
    
    return { received: true }; 
  }
}
