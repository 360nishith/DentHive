import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WhatsAppService } from './whatsapp.service';

@Injectable()
export class WhatsAppListenerService {
  private readonly logger = new Logger(WhatsAppListenerService.name);

  constructor(private readonly whatsappService: WhatsAppService) {}

  @OnEvent('appointment.confirmed')
  async handleAppointmentConfirmed(appointment: any) {
    this.logger.log(`Handling appointment.confirmed event for appointment ${appointment.id}`);
    
    const patient = appointment.patient;
    if (!patient || !patient.phoneNumber) {
      this.logger.warn(`Patient phone number missing for appointment ${appointment.id}`);
      return;
    }

    // Format the date nicely
    const date = new Date(appointment.scheduledStart).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    try {
      await this.whatsappService.sendMessage(
        appointment.tenantId,
        appointment.patientId,
        patient.phoneNumber,
        'appointment_confirmation',
        [
          { type: 'body', parameters: [{ type: 'text', text: patient.name }, { type: 'text', text: date }] }
        ]
      );
      this.logger.log(`Queued appointment confirmation for ${patient.name}`);
    } catch (error) {
      this.logger.error(`Failed to queue appointment confirmation`, error);
    }
  }

  @OnEvent('payment.collected')
  async handlePaymentCollected({ payment, journey, patient }: any) {
    this.logger.log(`Handling payment.collected event for payment ${payment.id}`);
    
    if (!patient || !patient.phoneNumber) return;

    try {
      await this.whatsappService.sendMessage(
        payment.tenantId,
        patient.id,
        patient.phoneNumber,
        'payment_receipt',
        [
          { type: 'body', parameters: [
            { type: 'text', text: patient.name }, 
            { type: 'text', text: payment.amount.toString() }
          ]}
        ]
      );
      this.logger.log(`Queued payment receipt for ${patient.name}`);
    } catch (error) {
      this.logger.error(`Failed to queue payment receipt`, error);
    }
  }
}
