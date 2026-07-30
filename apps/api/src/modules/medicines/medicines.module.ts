import { Module } from '@nestjs/common';
import { MedicinesService } from './services/medicines.service';
import { MedicinesController } from './controllers/medicines.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [MedicinesController],
  providers: [MedicinesService, PrismaService],
  exports: [MedicinesService],
})
export class MedicinesModule {}
