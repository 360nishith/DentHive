import { Module } from '@nestjs/common';
import { TenantController } from './controllers/tenant.controller';
import { TenantService } from './services/tenant.service';
import { TenantCacheService } from './services/tenant-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [TenantController],
  providers: [TenantService, TenantCacheService, PrismaService],
  exports: [TenantCacheService],
})
export class TenantModule {}
