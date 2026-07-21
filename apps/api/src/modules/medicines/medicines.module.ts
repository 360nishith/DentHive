import { Module } from '@nestjs/common';
import { MedicinesService } from './services/medicines.service';
import { MedicinesController } from './controllers/medicines.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [],
  controllers: [MedicinesController],
  providers: [MedicinesService, PrismaService],
  exports: [MedicinesService],
})
export class MedicinesModule {}
