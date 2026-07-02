import { Module } from '@nestjs/common';
import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsCronProcessor } from './workers/analytics-cron.processor';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsCronProcessor, PrismaService],
})
export class AnalyticsModule {}
