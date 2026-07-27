import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as crypto from 'crypto';

@Processor('whatsapp-reminders', {
  skipStalledCheck: true,
  drainDelay: 300000
})
export class WhatsappRemindersProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappRemindersProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('whatsapp') private readonly whatsappQueue: Queue
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing reminder job ${job.id}`);

    if (job.name === 'send-reminder') {
      const { reminderId, tenantId } = job.data;

      // 1. Fetch the reminder and appointment details
      const reminder = await this.prisma.appointmentReminder.findUnique({
        where: { id: reminderId },
        include: {
          appointment: {
            include: {
              patient: true,
              tenant: true,
              treatmentStage: true
            }
          }
        }
      });

      if (!reminder || reminder.status !== 'PENDING') {
        this.logger.log(`Reminder ${reminderId} is not pending or not found. Skipping.`);
        return;
      }

      // Safety check: What if the appointment was cancelled or rescheduled, but this old job still fired?
      if (reminder.appointment.status !== 'SCHEDULED' && reminder.appointment.status !== 'CONFIRMED') {
        this.logger.log(`Appointment ${reminder.appointment.id} is ${reminder.appointment.status}. Dropping old reminder.`);
        await this.prisma.appointmentReminder.update({
          where: { id: reminderId },
          data: { status: 'CANCELLED' }
        });
        return;
      }

      // 2. Billing Verification
      // We must check if the clinic's tenant is ACTIVE and has an active subscription.
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } }
      });

      if (!tenant) return;

      // If they are strictly SUSPENDED, block all messages
      if (tenant.status === 'SUSPENDED') {
        this.logger.warn(`Tenant ${tenantId} is SUSPENDED. Dropping reminder ${reminderId}.`);
        await this.prisma.appointmentReminder.update({
          where: { id: reminderId },
          data: { status: 'FAILED' }
        });
        return;
      }

      const activeSub = tenant.subscriptions[0];
      // Note: During the 14-day TRIAL, tenant.status is 'TRIAL' and activeSub may not exist. We allow TRIAL.
      if (tenant.status !== 'TRIAL' && tenant.status !== 'ACTIVE') {
         // Fallback if there are other negative statuses
         this.logger.warn(`Tenant ${tenantId} is ${tenant.status}. Dropping reminder ${reminderId}.`);
         await this.prisma.appointmentReminder.update({
           where: { id: reminderId },
           data: { status: 'FAILED' }
         });
         return;
      }

      if (tenant.status === 'ACTIVE') {
        // If they are explicitly active, they must have a valid subscription. 
        // We ensure it's not PAST_DUE or CANCELLED (if past their period end)
        if (activeSub && (activeSub.status === 'PAST_DUE' || activeSub.status === 'CANCELLED')) {
          const now = new Date();
          if (new Date(activeSub.currentPeriodEnd) < now) {
            this.logger.warn(`Tenant ${tenantId} subscription is past due. Dropping reminder.`);
            await this.prisma.appointmentReminder.update({
              where: { id: reminderId },
              data: { status: 'FAILED' }
            });
            return;
          }
        }
      }

      const { appointment } = reminder;
      const { patient } = appointment;

      if (patient.status === 'ARCHIVED') {
        this.logger.warn(`Patient ${patient.id} is ARCHIVED. Dropping reminder (Zombie Prevention).`);
        await this.prisma.appointmentReminder.update({
          where: { id: reminderId },
          data: { status: 'CANCELLED' }
        });
        return;
      }

      if (!patient.whatsappOptIn) {
        this.logger.log(`Patient ${patient.id} is opted out of WhatsApp. Skipping reminder.`);
        await this.prisma.appointmentReminder.update({
          where: { id: reminderId },
          data: { status: 'CANCELLED' } // Cancel the reminder gracefully
        });
        return;
      }

      // Format time safely (assumes IST for the template output)
      // shift UTC time by 5.5 hours to IST
      const istStart = new Date(appointment.scheduledStart.getTime() + (5.5 * 60 * 60 * 1000));
      let hours = istStart.getUTCHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const minutes = istStart.getUTCMinutes() < 10 ? '0' + istStart.getUTCMinutes() : istStart.getUTCMinutes();
      const strTime = hours + ':' + minutes + ' ' + ampm;

      // 3. Create the WhatsAppMessage Record
      const whatsappMessage = await this.prisma.whatsAppMessage.create({
        data: {
          tenantId,
          patientId: patient.id,
          direction: 'OUTBOUND',
          status: 'PENDING',
          payload: { type: 'appointment_reminder', appointmentId: appointment.id }
        }
      });

      // 4. Update the reminder to point to the actual WhatsAppMessage ID
      await this.prisma.appointmentReminder.update({
        where: { id: reminderId },
        data: {
          status: 'SENT',
          whatsappMessageId: whatsappMessage.id
        }
      });

      // 5. Send to outbound queue to actually hit the Meta API
      await this.whatsappQueue.add('send-template', {
        messageId: whatsappMessage.id,
        to: patient.phoneNumber,
        template: 'appointment_reminder',
        components: [
          { type: 'body', parameters: [
            { type: 'text', text: patient.name },
            { type: 'text', text: tenant.name },
            { type: 'text', text: strTime }
          ]}
        ]
      });

      this.logger.log(`Successfully dispatched reminder ${reminderId} to outbound queue.`);
    }
  }
}
