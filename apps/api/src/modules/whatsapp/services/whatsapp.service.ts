import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    @InjectQueue('whatsapp') private readonly whatsappQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async sendMessage(tenantId: string, patientId: string, to: string, template: string, components: any[] = []) {
    this.logger.log(`Queueing WhatsApp template ${template} to ${to}`);
    
    // Create initial DB record
    const messageRecord = await this.prisma.whatsAppMessage.create({
      data: {
        tenantId,
        patientId,
        direction: 'OUTBOUND',
        status: 'PENDING',
        payload: { template, components, to },
      }
    });

    // Push to background queue
    await this.whatsappQueue.add('send-template', {
      messageId: messageRecord.id,
      to,
      template,
      components
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 300000 } // Starts at 5 minutes, then 10 mins
    });

    return { success: true, messageId: messageRecord.id };
  }
  async sendPaymentLink(tenantId: string, patientId: string, amount: number, journeyName: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.upiVpa) throw new Error('Clinic has no UPI VPA configured.');

    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new Error('Patient not found');

    const upiLink = `upi://pay?pa=${tenant.upiVpa}&pn=${encodeURIComponent(tenant.name)}&am=${amount}&cu=INR`;
    const textMsg = `Hi ${patient.name}, please click the link below to pay ₹${amount} for your recent treatment (${journeyName}) at ${tenant.name}.\n\n${upiLink}`;
    
    // Push raw text message for the payment link
    const messageRecord = await this.prisma.whatsAppMessage.create({
      data: {
        tenantId,
        patientId,
        direction: 'OUTBOUND',
        status: 'PENDING',
        payload: { 
          type: 'text',
          text: textMsg,
          to: patient.phoneNumber 
        },
      }
    });

    await this.whatsappQueue.add('send-text', {
      messageId: messageRecord.id,
      to: patient.phoneNumber,
      text: textMsg
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 300000 } // Starts at 5 minutes, then 10 mins
    });

    return { success: true, messageId: messageRecord.id };
  }
}
