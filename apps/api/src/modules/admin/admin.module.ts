import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { TenantModule } from '../tenant/tenant.module';

import { DataRetentionCronService } from './services/data-retention.service';

@Module({
  imports: [SupabaseModule, TenantModule],
  controllers: [AdminController],
  providers: [AdminService, PrismaService, DataRetentionCronService],
})
export class AdminModule {}
