import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtRevocationService } from '../../auth/services/jwt-revocation.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private revocationService: JwtRevocationService
  ) {}

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
    const user = await this.prisma.user.updateMany({
      where: { id: targetUserId, tenantId },
      data: { status: 'ARCHIVED' }
    });

    if (user.count === 0) throw new NotFoundException('User not found');

    // SECURITY: Fire immediately. The receptionist's active token is now dead.
    await this.revocationService.revokeUserAccess(targetUserId);

    return { success: true };
  }
}
