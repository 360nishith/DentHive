import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class NoShowCronService {
  private readonly logger = new Logger(NoShowCronService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * The "Auto-No-Show" Sweeper
   * Runs every night at Midnight to catch patients who didn't show up.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processMissedAppointments() {
    this.logger.log('🌙 Midnight Sweep: Checking for missed appointments from yesterday...');

    const now = new Date();
    // Get midnight of today (e.g. 00:00:00). Anything before this is considered "yesterday or older"
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Find all ghost appointments
    const ghostAppts = await this.prisma.appointment.findMany({
      where: {
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledStart: { lt: startOfToday }
      },
      include: {
        patient: true
      }
    });

    if (ghostAppts.length === 0) {
      this.logger.log('✅ No ghost appointments found. Calendar is clean.');
      return;
    }

    this.logger.log(`👻 Found ${ghostAppts.length} ghost appointments. Converting to NO_SHOW...`);

    // 2. Process each ghost appointment
    let followUpsCreated = 0;
    
    for (const appt of ghostAppts) {
      // Update the status
      await this.prisma.appointment.update({
        where: { id: appt.id },
        data: { status: 'NO_SHOW' }
      });

      // Automatically create the FollowUp task for Revenue Recovery
      await this.prisma.followUp.create({
        data: {
          tenantId: appt.tenantId,
          stageId: appt.treatmentStageId,
          triggerAt: new Date(),
          nudgeType: 'MISSED_APPT',
          status: 'PENDING'
        }
      });
      followUpsCreated++;
    }

    this.logger.log(`✅ Successfully processed ${ghostAppts.length} NO_SHOWs and generated ${followUpsCreated} Follow-Up tasks.`);
  }
}
