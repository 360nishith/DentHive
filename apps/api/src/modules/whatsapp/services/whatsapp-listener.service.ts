import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WhatsAppService } from './whatsapp.service';

@Injectable()
export class WhatsAppListenerService {
  private readonly logger = new Logger(WhatsAppListenerService.name);

  constructor(private readonly whatsappService: WhatsAppService) {}

  // Removed automatic appointment_confirmation and payment_receipt templates
  // Per founder's request, WhatsApp messages should only be sent via the 9:00 AM Cron Job 
  // and the explicit UPI payment button.
}
