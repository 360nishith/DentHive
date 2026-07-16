import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseModule } from '../supabase/supabase.module';

import { DataRetentionCronService } from './services/data-retention.service';

@Module({
  imports: [SupabaseModule],
  controllers: [AdminController],
  providers: [AdminService, PrismaService, DataRetentionCronService],
})
export class AdminModule {}
