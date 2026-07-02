import { Controller, Post, Get, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WebhookSignatureGuard } from '../../../common/guards/webhook-signature.guard';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('webhooks')
@UseGuards(WebhookSignatureGuard)
export class WebhookController {
  constructor(
    @InjectQueue('billing') private billingQueue: Queue,
    @InjectQueue('whatsapp-webhooks') private whatsappQueue: Queue
  ) {}
  
  @Get('whatsapp')
  verifyWhatsAppWebhook(@Req() req: any) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return challenge;
    }
    return { status: 'forbidden' };
  }

  @Post('whatsapp')
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // Limit to 50 requests per minute per IP
  async handleWhatsAppWebhooks(@Req() req: any) {
    // Forward parsed payload to BullMQ for idempotent processing
    await this.whatsappQueue.add('inbound_message', req.body);
    return { status: 'received' };
  }
  
  @Post('razorpay')
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async handleRazorpayWebhooks(@Req() req: any) {
    await this.billingQueue.add('subscription_event', req.body);
    return { status: 'received' };
  }
}
