import { Module } from '@nestjs/common';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module'; // for JwtRevocationService
import { TenantModule } from '../tenant/tenant.module'; // for TenantStatusGuard

@Module({
  imports: [AuthModule, TenantModule],
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
})
export class UsersModule {}
