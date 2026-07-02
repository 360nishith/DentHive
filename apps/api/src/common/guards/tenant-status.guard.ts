import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantCacheService } from '../../modules/tenant/services/tenant-cache.service';

@Injectable()
export class TenantStatusGuard implements CanActivate {
  constructor(private tenantCache: TenantCacheService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;
    const url = request.url || '';
    const method = request.method;

    if (!tenantId) throw new ForbiddenException('Tenant context missing');

    // Super Admin Bypass
    if (request.user?.email === 'nishithdharmaraj@gmail.com') {
      return true;
    }

    // Allow critical endpoints even if suspended
    const isRecoveryEndpoint = 
      (method === 'GET' && url.includes('/tenant')) ||
      (method === 'GET' && url.includes('/auth/me')) ||
      url.includes('/billing');

    if (isRecoveryEndpoint) {
      return true;
    }

    // RAM-First Execution
    const status = await this.tenantCache.getStatusSafely(tenantId);

    if (status === 'SUSPENDED' || status === 'PAST_DUE') {
      throw new ForbiddenException(
        'Clinic subscription is suspended. Please update payment details to resume operations.'
      );
    }

    if (status === 'READ_ONLY' && method !== 'GET') {
      throw new ForbiddenException(
        'Clinic subscription is in Read-Only mode. Please subscribe to add or modify data.'
      );
    }

    return true; 
  }
}
