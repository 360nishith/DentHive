import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Processor('whatsapp-webhooks', {
  skipStalledCheck: true,
  drainDelay: 5000
})
export class WebhookWorker extends WorkerHost {
  private readonly logger = new Logger(WebhookWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'inbound_message') {
      const payload = job.data;
      
      // WhatsApp payloads have a complex structure
      // Usually: { entry: [ { changes: [ { value: { statuses: [...] }, field: 'messages' } ] } ] }
      
      if (!payload.entry || !payload.entry[0]?.changes) {
        return { success: false, reason: 'Invalid payload structure' };
      }

      const value = payload.entry[0].changes[0].value;
      
      // Handle Delivery / Read receipts
      if (value.statuses && value.statuses.length > 0) {
        for (const status of value.statuses) {
          const metaId = status.id;
          const newStatus = status.status; // 'sent', 'delivered', 'read', 'failed'
          
          this.logger.log(`Status update received for message ${metaId}: ${newStatus}`);

          try {
            await this.prisma.whatsAppMessage.updateMany({
              where: {
                payload: { path: ['metaMessageId'], equals: metaId }
              },
              data: {
                status: newStatus.toUpperCase()
              }
            });
          } catch (error) {
            this.logger.error(`Failed to update status for ${metaId}`, error);
          }
        }
      }

      // Handle inbound user messages (Replies)
      if (value.messages && value.messages.length > 0) {
        for (const msg of value.messages) {
          const inboundMessageId = msg.id;
          const replyContextId = msg.context?.id; // the outgoing message they replied to
          
          let messagePayload = '';
          if (msg.type === 'interactive' && msg.interactive?.button_reply) {
            messagePayload = msg.interactive.button_reply.id || msg.interactive.button_reply.title; // e.g. CONFIRM_NEXT_VISIT or "Confirm"
          } else if (msg.type === 'button' && msg.button) {
            messagePayload = msg.button.payload || msg.button.text; // Template Quick Reply buttons
          } else if (msg.type === 'text') {
            messagePayload = msg.text.body?.trim(); // '1' or '2'
          }

          if (!replyContextId || !messagePayload) continue;

          // Convert to uppercase for robust matching
          messagePayload = messagePayload.toUpperCase();

          // 1. Idempotency Check
          try {
            await this.prisma.webhookLog.create({
              data: { messageId: inboundMessageId, processedAt: new Date() }
            });
          } catch (e: any) {
            if (e.code === 'P2002') continue; // Duplicate webhook delivered by Meta; safely swallow.
            throw e;
          }

          // 2. Deterministic Appointment Resolution via whatsappMessageId
          // First find the message in our DB using the Meta ID
          const dbMsg = await this.prisma.whatsAppMessage.findFirst({
            where: {
              payload: { path: ['metaMessageId'], equals: replyContextId }
            }
          });

          if (!dbMsg) continue;

          const reminder = await this.prisma.appointmentReminder.findFirst({
            where: { whatsappMessageId: dbMsg.id }
          });

          if (reminder) {
            const appointment = await this.prisma.appointment.findUnique({
              where: { id: reminder.appointmentId },
              include: { patient: true }
            });

            if (!appointment) continue;

            // If the appointment is already completed, ignore everything
            if (appointment.status === 'COMPLETED') {
              this.logger.log(`Ignoring button press ${messagePayload}. Appointment ${appointment.id} is already COMPLETED`);
              continue;
            }

            // If it's cancelled or a no-show, only ignore "Confirm". Let Cancel/Reschedule through to generate follow-ups!
            if ((appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW') && (messagePayload.includes('CONFIRM') || messagePayload === '1')) {
              this.logger.log(`Ignoring Confirm press. Appointment ${appointment.id} is already ${appointment.status}`);
              continue;
            }

            // 3. State Transition
            if (messagePayload.includes('CONFIRM') || messagePayload === '1') {
              await this.prisma.appointment.update({
                where: { id: reminder.appointmentId }, 
                data: { status: 'CONFIRMED' }
              });
              this.eventEmitter.emit('appointment.confirmed', appointment);
              this.logger.log(`Appointment ${reminder.appointmentId} CONFIRMED via WhatsApp`);
              
            } else if (messagePayload.includes('RESCHEDULE') || messagePayload === '2') {
              // 1. Update appointment status to trigger UI alerts and Stalled Logic
              await this.prisma.appointment.update({
                where: { id: reminder.appointmentId },
                data: { status: 'RESCHEDULE_REQUESTED' }
              });

              // 2. Create a Reschedule Request FollowUp
              await this.prisma.followUp.create({
                data: {
                  tenantId: appointment.tenantId,
                  stageId: appointment.treatmentStageId,
                  triggerAt: new Date(),
                  nudgeType: 'RESCHEDULE_REQ',
                  status: 'PENDING'
                }
              });

              // 3. Create a global Notification for all staff/admins
              await this.prisma.notification.create({
                data: {
                  tenantId: appointment.tenantId,
                  userId: appointment.patient.doctorId,
                  title: 'Reschedule Requested',
                  message: `${appointment.patient.name} requested to reschedule their appointment on ${new Date(appointment.scheduledStart).toLocaleDateString()}.`,
                  type: 'WARNING'
                }
              });
              this.logger.log(`Patient requested reschedule for Appointment ${reminder.appointmentId}`);
              
            } else if (messagePayload.includes('CANCEL') || messagePayload === '3') {
              await this.prisma.appointment.update({
                where: { id: reminder.appointmentId }, 
                data: { status: 'CANCELLED' }
              });

              // Create a global Notification for all staff/admins
              await this.prisma.notification.create({
                data: {
                  tenantId: appointment.tenantId,
                  userId: appointment.patient.doctorId,
                  title: 'Appointment Cancelled',
                  message: `${appointment.patient.name} cancelled their appointment on ${new Date(appointment.scheduledStart).toLocaleDateString()}. A slot is now open.`,
                  type: 'ERROR'
                }
              });
              this.logger.log(`Patient cancelled Appointment ${reminder.appointmentId}. Notification sent.`);
            }
          }
        }
      }
      
      return { success: true };
    }
  }
}
