import { Module } from '@nestjs/common';
import { MedicinesService } from './services/medicines.service';
import { MedicinesController } from './controllers/medicines.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MedicinesController],
  providers: [MedicinesService],
  exports: [MedicinesService],
})
export class MedicinesModule {}
