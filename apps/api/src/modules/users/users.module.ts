import { Module } from '@nestjs/common';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module'; // for JwtRevocationService
import { TenantModule } from '../tenant/tenant.module'; // for TenantStatusGuard
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [AuthModule, TenantModule, SupabaseModule],
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
})
export class UsersModule {}
