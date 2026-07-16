import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtRevocationService } from '../../auth/services/jwt-revocation.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private revocationService: JwtRevocationService,
    private eventEmitter: EventEmitter2
  ) {}

  async getMe(internalId: string) {
    return this.prisma.user.findUnique({
      where: { id: internalId },
      select: { id: true, firstName: true, lastName: true, email: true, role: true }
    });
  }

  async listStaff(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true, authId: true, email: true, firstName: true, lastName: true, roleId: true, status: true, role: true }
    });
  }

  async updateRole(tenantId: string, targetUserId: string, newRole: string) {
    const user = await this.prisma.user.updateMany({
      where: { id: targetUserId, tenantId }, 
      data: { roleId: newRole }
    });

    if (user.count === 0) throw new NotFoundException('User not found');

    // SECURITY: Force the user to re-authenticate to receive a new JWT with updated claims.
    await this.revocationService.revokeUserAccess(targetUserId);

    return { success: true };
  }

  async deactivateUser(tenantId: string, targetUserId: string) {
    // We must fetch the user first to get their role for the event emitter
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, tenantId },
      include: { role: true }
    });

    if (!target) throw new NotFoundException('User not found');

    // Bypass Prisma middleware using $executeRaw so that if an Admin deletes a Doctor, 
    // the middleware doesn't overwrite where.doctorId with the Admin's ID.
    await this.prisma.$executeRaw`
      UPDATE appointments
      SET status = 'CANCELLED'
      WHERE "tenantId" = ${tenantId}::uuid
        AND status = 'SCHEDULED'
        AND "scheduledStart" > NOW()
        AND (
          "doctorId" = ${targetUserId}::uuid
          OR ("doctorId" IS NULL AND "patientId" IN (SELECT id FROM patients WHERE "doctorId" = ${targetUserId}::uuid))
        )
    `;

    await this.prisma.user.updateMany({
      where: { id: targetUserId, tenantId },
      data: { status: 'ARCHIVED', isActive: false }
    });

    // Auto-unassign patients from the deleted doctor so they return to the clinic's global pool
    await this.prisma.$executeRaw`
      UPDATE patients
      SET "doctorId" = NULL
      WHERE "tenantId" = ${tenantId}::uuid AND "doctorId" = ${targetUserId}::uuid
    `;

    // SECURITY: Fire immediately. The receptionist's active token is now dead.
    await this.revocationService.revokeUserAccess(targetUserId);

    // Notify billing service to recalculate active dentists
    this.eventEmitter.emit('staff.status_changed', {
      tenantId,
      user: target,
      role: target.role.name,
      status: 'ARCHIVED'
    });

    return { success: true };
  }
}
