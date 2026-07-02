import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { FollowUpsController } from './controllers/followups.controller';
import { FollowUpsService } from './services/followups.service';
import { RecallCronService } from './services/recall.cron';
import { FollowUpAutomationWorker } from './workers/follow-up-automation.worker';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [
    TenantModule,
    BullModule.registerQueue({
      name: 'follow-up-automation',
    }),
    BullModule.registerQueue({
      name: 'whatsapp',
    }),
  ],
  controllers: [FollowUpsController],
  providers: [FollowUpsService, RecallCronService, FollowUpAutomationWorker, PrismaService],
})
export class FollowUpsModule {}
