import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
    private eventEmitter: EventEmitter2
  ) {}

  async inviteStaff(tenantId: string, dto: InviteUserDto) {
    let role = await this.prisma.role.findFirst({
      where: { name: 'STAFF' },
    });
    
    if (!role) {
      role = await this.prisma.role.create({
        data: { name: 'STAFF' }
      });
    }

    let authId: string;
    
    // 1. Create in Identity Provider
    try {
      authId = await this.supabase.inviteUser(dto.email);
    } catch (error) {
      throw new InternalServerErrorException('Failed to invite user via Supabase: ' + error.message);
    }

    // 2. Set App Metadata
    try {
      await this.supabase.updateUserMetadata(authId, {
        tenantId: tenantId,
        role: role.name,
      });
    } catch (error) {
      this.logger.error(`Rollback needed: Could not set metadata for authId ${authId}`);
      await this.rollbackSupabaseUser(authId);
      throw new InternalServerErrorException('Failed to sync tenant context to identity provider');
    }

    // 3. Create Local Prisma User (With Rollback Logic)
    try {
      const user = await this.prisma.user.create({
        data: {
          authId,
          tenantId,
          roleId: role.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          status: 'PENDING',
          phoneNumber: `INVITED_${Date.now()}`.slice(0, 20),
          passwordHash: 'EXTERNAL_AUTH',
        },
      });
      return user;
    } catch (error) {
      this.logger.error(`Rollback needed: Prisma failed to create user record for authId ${authId}`, error.stack);
      await this.rollbackSupabaseUser(authId);
      throw new InternalServerErrorException('Database failure. Invitation rolled back safely.');
    }
  }

  async createStaff(tenantId: string, dto: InviteUserDto & { password?: string }) {
    let role = await this.prisma.role.findFirst({
      where: { name: dto.roleName },
    });
    
    if (!role) {
      role = await this.prisma.role.create({
        data: { name: dto.roleName }
      });
    }

    let authId: string;
    
    // 1. Create in Identity Provider directly with password
    try {
      authId = await this.supabase.createUser(dto.email, dto.password || 'Temp123!');
    } catch (error) {
      throw new InternalServerErrorException('Failed to create user via Supabase: ' + error.message);
    }

    // 2. Set App Metadata
    try {
      await this.supabase.updateUserMetadata(authId, {
        tenantId: tenantId,
        role: role.name,
      });
    } catch (error) {
      this.logger.error(`Rollback needed: Could not set metadata for authId ${authId}`);
      await this.rollbackSupabaseUser(authId);
      throw new InternalServerErrorException('Failed to sync tenant context to identity provider');
    }

    // 3. Create Local Prisma User
    try {
      const user = await this.prisma.user.create({
        data: {
          authId,
          tenantId,
          roleId: role.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          status: 'ACTIVE',
          phoneNumber: `STAFF_${Date.now()}`.slice(0, 20),
          passwordHash: 'EXTERNAL_AUTH',
        },
      });
      
      this.eventEmitter.emit('staff.created', { tenantId, user, role: role.name });

      return user;
    } catch (error) {
      this.logger.error(`Rollback needed: Prisma failed to create user record for authId ${authId}`, error.stack);
      await this.rollbackSupabaseUser(authId);
      throw new InternalServerErrorException('Database failure. Creation rolled back safely.');
    }
  }

  async deactivateStaff(tenantId: string, userId: string, dto: UpdateStatusDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) throw new NotFoundException('User not found');

    if (dto.status === 'INACTIVE' && user.authId) {
      await this.supabase.banUser(user.authId);
    }

    await this.prisma.user.updateMany({
      where: { id: userId },
      data: { status: dto.status },
    });
    
    const updatedUser = await this.prisma.user.findFirst({ where: { id: userId }, include: { role: true } });
    if (updatedUser) {
      this.eventEmitter.emit('staff.status_changed', { tenantId, user: updatedUser, role: updatedUser.role.name, status: dto.status });
    }
    return updatedUser;
  }

  private async rollbackSupabaseUser(authId: string) {
    try {
      await this.supabase.deleteUser(authId);
      this.logger.log(`Successfully rolled back (deleted) Supabase user ${authId}`);
    } catch (rollbackError) {
      this.logger.error(`CRITICAL: Failed to rollback Supabase user ${authId}. Phantom user exists!`, rollbackError.stack);
    }
  }
}
