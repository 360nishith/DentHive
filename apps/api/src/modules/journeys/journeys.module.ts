import { Module } from '@nestjs/common';
import { JourneysController } from './controllers/journeys.controller';
import { StagesController } from './controllers/stages.controller';
import { TemplatesController } from './controllers/templates.controller';
import { JourneysService } from './services/journeys.service';
import { StagesService } from './services/stages.service';
import { TemplatesService } from './services/templates.service';
import { RevenueService } from './services/revenue.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BullModule } from '@nestjs/bullmq';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [
    TenantModule,
    BullModule.registerQueue({
      name: 'whatsapp-reminders',
    }),
  ],
  controllers: [
    JourneysController,
    StagesController,
    TemplatesController,
  ],
  providers: [
    JourneysService,
    StagesService,
    TemplatesService,
    RevenueService,
    PrismaService, 
  ],
  exports: [JourneysService],
})
export class JourneysModule {}
