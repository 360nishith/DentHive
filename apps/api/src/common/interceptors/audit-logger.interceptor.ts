import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { als } from '../context/als';

@Injectable()
export class AuditLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLogger');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    
    // Extracted from AsyncLocalStorage
    const store = als.getStore();
    const tenantId = store?.tenantId || 'SYSTEM';
    const userId = store?.userId || 'ANONYMOUS';

    const method = req.method;
    const url = req.url;

    return next.handle().pipe(
      tap(() => {
        // Logs strictly for HIPAA compliance (Tracking PHI access)
        if (url.includes('/patients') || url.includes('/x-rays')) {
          this.logger.log(`[HIPAA-AUDIT] Tenant: ${tenantId} | User: ${userId} | Method: ${method} | URL: ${url}`);
        }
      }),
    );
  }
}
