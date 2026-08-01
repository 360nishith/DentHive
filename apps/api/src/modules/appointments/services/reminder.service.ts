import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class ReminderService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('whatsapp-reminders') private reminderQueue: Queue,
    @InjectQueue('whatsapp') private whatsappQueue: Queue
  ) {}

  @OnEvent('appointment.created')
  async handleAppointmentCreated(appointment: any) {
    await this.scheduleSameDayReminder(appointment.tenantId, appointment.id, appointment.scheduledStart);
  }

  async onApplicationBootstrap() {
    this.logger.log('Syncing pending reminders to Redis queue...');
    try {
      const pendingReminders = await this.prisma.appointmentReminder.findMany({
        where: { status: 'PENDING' }
      });

      for (const reminder of pendingReminders) {
        const delay = reminder.scheduledFor.getTime() - new Date().getTime();
        if (delay > 0) {
          // Use a custom jobId to ensure we don't duplicate jobs if Redis wasn't actually wiped
          await this.reminderQueue.add(
            'send-reminder', 
            { reminderId: reminder.id, tenantId: reminder.tenantId }, 
            { delay, jobId: `reminder_${reminder.id}` }
          );
        }
      }
      this.logger.log(`Successfully synced ${pendingReminders.length} reminders to Redis.`);
    } catch (error) {
      this.logger.error('Failed to sync pending reminders to Redis', error);
    }
  }

  @OnEvent('appointment.updated')
  async handleAppointmentUpdated(payload: { original: any, updated: any }) {
    const { original, updated } = payload;
    
    // If cancelled, no-show, or completed, kill pending reminders
    if (updated.status === 'CANCELLED' || updated.status === 'NO_SHOW' || updated.status === 'COMPLETED') {
      await this.prisma.appointmentReminder.updateMany({
        where: { appointmentId: updated.id, status: 'PENDING' },
        data: { status: 'CANCELLED' }
      });
      this.logger.log(`Cancelled pending reminders for appointment ${updated.id} because status is ${updated.status}`);
      
      // If manually cancelled by doctor, notify the patient
      if (updated.status === 'CANCELLED' && original.status !== 'CANCELLED') {
        const fullApt = await this.prisma.appointment.findUnique({
          where: { id: updated.id },
          include: { patient: true, tenant: true }
        });
        
        if (fullApt && fullApt.patient.phoneNumber) {
          // Check if any reminder was ever SENT for this appointment
          const sentReminder = await this.prisma.appointmentReminder.findFirst({
            where: { 
              appointmentId: updated.id,
              status: { in: ['SENT', 'DELIVERED', 'READ'] }
            }
          });

          // If no reminder was ever sent, the patient doesn't know about it via WhatsApp, so don't send a cancellation.
          if (!sentReminder) {
            this.logger.log(`Skipping cancellation message for ${updated.id} - no reminder was ever sent.`);
            return;
          }
          
          const messageRecord = await this.prisma.whatsAppMessage.create({
            data: {
              tenantId: fullApt.tenantId,
              patientId: fullApt.patientId,
              direction: 'OUTBOUND',
              status: 'PENDING',
              payload: { template: 'appointment_cancelled' }
            }
          });

          await this.whatsappQueue.add('send-template', {
            messageId: messageRecord.id,
            to: fullApt.patient.phoneNumber,
            template: 'appointment_cancelled',
            components: [
              { type: 'body', parameters: [
                { type: 'text', text: fullApt.patient.name.split(' ')[0] }, // {{1}} Patient Name
                { type: 'text', text: fullApt.tenant.name }, // {{2}} Clinic Name
                { type: 'text', text: fullApt.tenant.contactPhone || '' } // {{3}} Clinic Phone Number
              ]}
            ]
          });
          this.logger.log(`Queued cancellation notification for appointment ${updated.id}`);
        }
      }
      return;
    }

    // If rescheduled (date changed)
    if (original.scheduledStart.getTime() !== updated.scheduledStart.getTime()) {
      await this.prisma.appointmentReminder.updateMany({
        where: { appointmentId: updated.id, status: 'PENDING' },
        data: { status: 'CANCELLED' }
      });
      this.logger.log(`Rescheduled: Cancelled old reminders for appointment ${updated.id}`);
      
      // Schedule new reminder
      await this.scheduleSameDayReminder(updated.tenantId, updated.id, updated.scheduledStart);
    }
  }

  // Triggered by the AppointmentCreatedEvent
  async scheduleSameDayReminder(tenantId: string, appointmentId: string, startTime: Date) {
    // We want the reminder at 9:00 AM IST (India Standard Time) on the day of the appointment.
    // 1. Shift the UTC time by +5.5 hours to get the local IST time representation
    const istTime = new Date(startTime.getTime() + (5.5 * 60 * 60 * 1000));
    
    // 2. Set the time to 09:00:00 on that local IST day
    istTime.setUTCHours(9, 0, 0, 0);
    
    // 3. Shift back by -5.5 hours to get the true UTC time for the cron scheduler
    const reminderTime = new Date(istTime.getTime() - (5.5 * 60 * 60 * 1000));

    const delay = reminderTime.getTime() - new Date().getTime();

    if (delay <= 0) return; // If 9:00 AM IST has already passed for this appointment, skip the reminder.

    const reminder = await this.prisma.appointmentReminder.create({
      data: {
        tenantId, // Explicitly pass tenantId if ALS isn't strictly overriding
        appointmentId,
        type: 'SAME_DAY_MORNING',
        status: 'PENDING',
        scheduledFor: reminderTime,
        whatsappMessageId: 'PENDING_' + require('crypto').randomUUID() // Placeholder until actual send
      }
    });

    await this.reminderQueue.add(
      'send-reminder', 
      { reminderId: reminder.id, tenantId }, 
      { delay, jobId: `reminder_${reminder.id}` }
    );
    this.logger.log(`Scheduled 9:00 AM Same-Day reminder for appointment ${appointmentId}`);
  }
}
