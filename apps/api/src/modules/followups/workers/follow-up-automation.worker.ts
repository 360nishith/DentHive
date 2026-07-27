import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { Logger } from '@nestjs/common';

@Processor('follow-up-automation', {
  skipStalledCheck: true,
  drainDelay: 60000
})
export class FollowUpAutomationWorker extends WorkerHost {
  private readonly logger = new Logger(FollowUpAutomationWorker.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { tenantId, patientId, eventType, referenceId } = job.data;
    
    if (eventType === 'APPOINTMENT_NO_SHOW') {
      await this.handleNoShow(tenantId, patientId, referenceId);
    } 
    // POST_OP Day 1, 3, 7 automations disabled per user request
  }

  private async handleNoShow(tenantId: string, patientId: string, appointmentId: string) {
    const existing = await this.prisma.followUp.findFirst({
      where: { tenantId, stageId: appointmentId, nudgeType: 'MISSED_APPT' } // Reusing stageId for appointmentId for simplicity in MVP schema
    });

    if (existing) {
      this.logger.warn(`Follow-up already exists for appointment ${appointmentId}`);
      return;
    }

    await this.prisma.followUp.create({
      data: {
        tenantId,
        stageId: appointmentId, // assuming stageId can hold an appointment reference in our simple schema
        nudgeType: 'MISSED_APPT',
        status: 'PENDING',
        triggerAt: new Date() // Immediate Action Required
      }
    });
  }
}
