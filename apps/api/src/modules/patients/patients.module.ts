import { Module } from '@nestjs/common';
import { PatientsController } from './controllers/patients.controller';
import { PatientsService } from './patients.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [PatientsController],
  providers: [PatientsService, PrismaService],
  exports: [PatientsService],
})
export class PatientsModule {}
