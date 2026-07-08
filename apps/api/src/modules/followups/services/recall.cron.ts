import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class RecallCronService {
  private readonly logger = new Logger(RecallCronService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('whatsapp') private whatsappQueue: Queue
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM, { timeZone: 'Asia/Kolkata' })
  async handleRecallCron() {
    this.logger.log('Starting daily recall job...');
    
    // Find all recalls due today or earlier that haven't been processed
    const pendingRecalls = await this.prisma.recallList.findMany({
      where: {
        status: 'PENDING',
        recallDate: { lte: new Date() }
      },
      include: {
        patient: true,
        tenant: true
      }
    });

    for (const recall of pendingRecalls) {
      if (!recall.patient.phoneNumber) continue;

      try {
        await this.whatsappQueue.add('send_template', {
          tenantId: recall.tenantId,
          patientId: recall.patientId,
          phone: recall.patient.phoneNumber,
          templateName: 'long_term_recall', // Template 3.1
          variables: [recall.patient.name, recall.tenant.name]
        });

        // Mark as PROCESSED so we don't send it again tomorrow
        await this.prisma.recallList.updateMany({
          where: { id: recall.id },
          data: { status: 'PROCESSED' }
        });

      } catch (error) {
        this.logger.error(`Failed to process recall for ${recall.id}`, error);
      }
    }

    this.logger.log(`Processed ${pendingRecalls.length} recalls.`);
  }
}
