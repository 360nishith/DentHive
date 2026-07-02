import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

export const tenantContext = new AsyncLocalStorage<{ tenantId: string }>();

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = (req.user as any)?.['tenantId'];

    if (tenantId) {
      tenantContext.run({ tenantId }, () => {
        next();
      });
    } else {
      next();
    }
  }
}
