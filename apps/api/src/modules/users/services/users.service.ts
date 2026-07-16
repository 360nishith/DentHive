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
      select: { id: true, email: true, firstName: true, lastName: true, roleId: true, status: true, role: true }
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

    const affectedAppointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        status: 'SCHEDULED',
        scheduledStart: { gt: new Date() },
        OR: [
          { doctorId: targetUserId },
          { doctorId: null, patient: { doctorId: targetUserId } }
        ]
      },
      select: { id: true }
    });

    const appointmentIds = affectedAppointments.map(a => a.id);

    if (appointmentIds.length > 0) {
      // The background processor (whatsapp-reminders.processor.ts) already checks if the 
      // appointment status is SCHEDULED. If it's CANCELLED, it automatically drops the reminder.
      // So we only need to cancel the appointments.
      await this.prisma.appointment.updateMany({
        where: { id: { in: appointmentIds } },
        data: { status: 'CANCELLED' }
      });
    }

    await this.prisma.user.updateMany({
      where: { id: targetUserId, tenantId },
      data: { status: 'ARCHIVED', isActive: false }
    });

    // Auto-unassign patients from the deleted doctor so they return to the clinic's global pool
    await this.prisma.patient.updateMany({
      where: { tenantId, doctorId: targetUserId },
      data: { doctorId: null }
    });

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
