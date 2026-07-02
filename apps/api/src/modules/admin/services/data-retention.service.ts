import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DataRetentionCronService {
  private readonly logger = new Logger(DataRetentionCronService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * The "Database Janitor"
   * Runs every Sunday at 2:00 AM to clean up ephemeral, high-volume data
   * and prevent Supabase database bloat over years of operation.
   */
  @Cron(CronExpression.EVERY_WEEK)
  async pruneOldData() {
    this.logger.log('🧹 Database Janitor waking up. Starting data retention sweep...');

    const now = new Date();

    // 1. WhatsApp Messages (> 90 days)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const deletedWa = await this.prisma.whatsAppMessage.deleteMany({
      where: { createdAt: { lt: ninetyDaysAgo } }
    });
    if (deletedWa.count > 0) this.logger.log(`Pruned ${deletedWa.count} old WhatsApp Messages.`);

    // 2. Audit Logs (> 90 days)
    const deletedAudit = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: ninetyDaysAgo } }
    });
    if (deletedAudit.count > 0) this.logger.log(`Pruned ${deletedAudit.count} old Audit Logs.`);

    // 3. Notifications (> 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const deletedNotifs = await this.prisma.notification.deleteMany({
      where: { createdAt: { lt: thirtyDaysAgo } }
    });
    if (deletedNotifs.count > 0) this.logger.log(`Pruned ${deletedNotifs.count} old Notifications.`);

    // 4. Webhook Logs (> 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const deletedWebhooks = await this.prisma.webhookLog.deleteMany({
      where: { processedAt: { lt: sevenDaysAgo } }
    });
    if (deletedWebhooks.count > 0) this.logger.log(`Pruned ${deletedWebhooks.count} old Webhook Logs.`);

    // 5. Appointment Reminders (PROCESSED and > 7 days)
    const deletedReminders = await this.prisma.appointmentReminder.deleteMany({
      where: { 
        status: 'PROCESSED',
        createdAt: { lt: sevenDaysAgo }
      }
    });
    if (deletedReminders.count > 0) this.logger.log(`Pruned ${deletedReminders.count} old processed Appointment Reminders.`);

    this.logger.log('🧹 Database Janitor finished successfully.');
  }
}
