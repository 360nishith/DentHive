import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { als } from '../context/als';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    let tenantId: string | undefined;
    let userId: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded: any = jwt.decode(token);
        if (decoded) {
          tenantId = decoded.app_metadata?.tenantId;
          userId = decoded.sub;
        }
      } catch (e) {
        // Token parsing failed, ignore
      }
    }

    als.run({ tenantId, userId }, () => {
      next();
    });
  }
}
