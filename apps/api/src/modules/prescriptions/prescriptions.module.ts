import { Module } from '@nestjs/common';
import { PrescriptionsService } from './services/prescriptions.service';
import { PrescriptionsController } from './controllers/prescriptions.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, PrismaService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
