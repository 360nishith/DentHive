import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSIONS } from '../decorators/permissions.decorator';

// Role to Permission Mapping
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['CREATE_USER', 'CREATE_PATIENT', 'EDIT_PATIENT', 'DELETE_PATIENT', 'VIEW_BILLING', 'EDIT_CLINIC', 'VIEW_CALENDAR', 'CREATE_APPOINTMENT', 'COLLECT_PAYMENT'],
  DOCTOR: ['CREATE_PATIENT', 'EDIT_PATIENT', 'VIEW_CALENDAR', 'CREATE_APPOINTMENT'],
  FRONT_DESK: ['CREATE_PATIENT', 'VIEW_CALENDAR', 'CREATE_APPOINTMENT', 'COLLECT_PAYMENT'],
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSIONS, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true; // Public route or no specific permissions required
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException('User role is missing from context.');
    }

    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    const hasPermission = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasPermission) {
      throw new ForbiddenException(`Access Denied: Requires ${requiredPermissions.join(', ')}`);
    }

    return true;
  }
}
