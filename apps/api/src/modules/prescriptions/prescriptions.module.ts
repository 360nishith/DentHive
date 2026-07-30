import { Module } from '@nestjs/common';
import { PrescriptionsService } from './services/prescriptions.service';
import { PrescriptionsController } from './controllers/prescriptions.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, PrismaService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
