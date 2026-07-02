import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user: any = request.user;

    if (!user || !user.email) {
      throw new UnauthorizedException('Authentication required');
    }

    const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || 'nishithdharmaraj@gmail.com').split(',');
    
    if (!superAdminEmails.includes(user.email)) {
      throw new UnauthorizedException('Super Admin privileges required');
    }

    return true;
  }
}
