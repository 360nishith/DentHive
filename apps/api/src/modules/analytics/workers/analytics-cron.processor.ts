import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Processor('analytics-cron', {
  skipStalledCheck: true,
  drainDelay: 60000
})
export class AnalyticsCronProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsCronProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    this.logger.log('Starting nightly Analytics Snapshot generation...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0); 
    
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true }
    });

    for (const tenant of tenants) {
      await this.generateSnapshotForTenant(tenant.id, yesterday, endOfYesterday);
    }
  }

  private async generateSnapshotForTenant(tenantId: string, startDate: Date, endDate: Date) {
    const aggregates = await this.prisma.appointment.aggregate({
      where: { tenantId, scheduledStart: { gte: startDate, lte: endDate } },
      _count: { _all: true },
    });

    // Idempotent UPSERT (Removed as AnalyticsSnapshot is not in schema)
    /* await this.prisma.analyticsSnapshot.upsert({
      where: {
        tenantId_date: { tenantId, date: startDate }
      },
      update: {
        appointmentsCompleted: aggregates._count.id,
      },
      create: {
        tenantId,
        date: startDate,
        appointmentsCompleted: aggregates._count.id,
      }
    }); */
  }
}
