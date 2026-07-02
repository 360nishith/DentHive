import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantModule } from '../tenant/tenant.module';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtOnboardingStrategy } from './strategies/jwt-onboarding.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtRevocationService } from './services/jwt-revocation.service';

@Module({
  imports: [
    PassportModule,
    SupabaseModule,
    TenantModule,
    ConfigModule
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtOnboardingStrategy, PrismaService, JwtRevocationService],
  exports: [AuthService, JwtRevocationService],
})
export class AuthModule {}
